var _ = require("root/lib/underscore")
var Config = require("root/config")
var Crypto = require("crypto")
var Neodoc = require("neodoc")
var FetchError = require("fetch-error")
var fetch = require("fetch-off")
var organizationsDb = require("root/db/organizations_db")
var orgPeopleDb = require("root/db/organization_people_db")
var peopleDb = require("root/db/people_db")
var sql = require("sqlate")
var sqlite = require("root").sqlite
var assert = require("assert")
var updateSql = require("heaven-sqlite").update
var TOKEN_URL = "https://apigw.viss.gov.lv/token"
var ENTITY_URL = "https://apigw.viss.gov.lv/legalentity/v1.0/legal-entity"
var CERT = new Buffer(Config.latvianBusinessRegisterClientCertificate, "base64")

var USAGE_TEXT = `
Usage: cli latvian-business-register (-h | --help)
       cli latvian-business-register [options] import [<registry-code>]
       cli latvian-business-register [options] reparse [<registry-code>]

Options:
    -h, --help   Display this help and exit.
`

var api = require("fetch-defaults")(fetch, {
	timeout: 10000,
	headers: {Accept: "application/json"}
})

api = require("fetch-formify")(api)
api = require("fetch-parse")(api, {json: true})
api = require("fetch-throw")(api)

module.exports = function*(argv) {
  var args = Neodoc.run(USAGE_TEXT, {argv: argv || ["import"]})
  if (args["--help"]) return void process.stdout.write(USAGE_TEXT.trimLeft())

	if (args.import)
		yield importOrganizations(args["<registry-code>"])
	else if (args.reparse)
		yield reparseOrganizations(args["<registry-code>"])
	else
		process.stdout.write(USAGE_TEXT.trimLeft())
}

function* importOrganizations(orgId) {
	var accessToken = yield requestAccessToken()

	if (orgId != null) {
		var org = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = 'LV' AND id = ${orgId}
		`)

		if (org == null) {
			console.warn("Organization not related to procurements: " + orgId)
			process.exit(1)
		}

		if (org.business_register_data != null) {
			console.warn("Already imported data from the business register.")
			process.exit(2)
		}

		yield sqlite(sql`BEGIN`)
		yield importOrganization(accessToken, org)
		yield sqlite(sql`COMMIT`)
	}
	else {
		var imported = 0, orgs

		// Data may be missing, but synced_at set if the organization wasn't in the
		// business register.
		while ((orgs = yield organizationsDb.search(sql`
			SELECT * FROM organizations
			WHERE country = 'LV'
			AND id GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
			AND business_register_data IS NULL
			AND business_register_synced_at IS NULL
			LIMIT 10
		`)).length > 0) {
			for (var i = 0; i < orgs.length; ++i) {
				let org = orgs[i]
				yield sqlite(sql`BEGIN`)
				console.warn("Importing %s (%s)…", org.id, org.name)
				yield importOrganization(accessToken, org)
				yield sqlite(sql`COMMIT`)

				if ((++imported % 100) == 0)
					console.warn("Imported %d organizations.", imported)
			}
		}

		console.warn("Imported %d organizations.", imported)
	}

	yield organizationsDb.reindex()
	yield peopleDb.reindex()
}

function* reparseOrganizations(orgId) {
	if (orgId != null) {
		var org = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = 'LV' AND id = ${orgId}
		`)

		if (org == null) {
			console.warn("Organization not related to procurements: " + orgId)
			process.exit(1)
		}

		yield sqlite(sql`BEGIN`)
		yield updateOrganization(org, JSON.parse(org.business_register_data))
		yield sqlite(sql`COMMIT`)
	}
	else {
		var reparsed = 0, orgs

		while ((orgs = yield organizationsDb.search(sql`
			SELECT * FROM organizations
			WHERE country = 'LV'
			AND business_register_data IS NOT NULL
			ORDER BY business_register_synced_at ASC
			LIMIT 100
			OFFSET ${reparsed}
		`)).length > 0) {
			yield sqlite(sql`BEGIN`)

			for (var i = 0; i < orgs.length; ++i) {
				let org = orgs[i]

				console.warn("Reparsing %s (%s)…", org.id, org.name)
				yield updateOrganization(org, JSON.parse(org.business_register_data))

				if ((++reparsed % 100) == 0)
					console.warn("Reparsed %d organizations.", reparsed)
			}

			yield sqlite(sql`COMMIT`)
		}

		console.warn("Reparsed %d organizations.", reparsed)
	}

	yield organizationsDb.reindex()
	yield peopleDb.reindex()
}

function* importOrganization(accessToken, org) {
	assert(org.country == "LV")

	var entity

	try {
		entity = (yield api(ENTITY_URL + "/" + encodeURIComponent(org.id), {
			headers: {
				Accept: "application/json",
				Authorization: "Bearer " + accessToken
			}
		})).body
	}
	catch (ex) {
		if (
			ex instanceof FetchError &&
			ex.response &&
			is404Response(ex.response)
		) entity = null
		else throw ex
	}

	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			business_register_data: entity && JSON.stringify(entity),
			business_register_synced_at: new Date
		}))}

		WHERE country = ${org.country} AND id = ${org.id}
	`)

	if (entity) yield updateOrganization(org, entity)
}

function* updateOrganization(org, entity) {
	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			// Some organizations, like 90009235333, lack legalName.
			name: entity.legalName || entity.name
		}))}

		WHERE country = ${org.country} AND id = ${org.id}
	`)

	yield orgPeopleDb.execute(sql`
		DELETE FROM organization_people
		WHERE organization_country = ${org.country}
		AND organization_id = ${org.id}
	`)

	var officers = entity.officers.filter((officer) => officer.naturalPerson)

	for (var i = 0; i < officers.length; ++i) {
		var officer = officers[i]
		var personName = parseName(officer.naturalPerson)
		var personNormalizedName = _.normalizeName(personName)

		// Not all people have a country set. For example 90009235333 lists
		// a single officer with a latvianIdentityNumber, forename and surname, but
		// no country.
		var personCountry = null
		var personalId = null
		var personBirthdate = null

		// The Latvian identity number is also on some people whose country is not
		// LV. Perhaps people not originally from Latvia? Foreigners lack the
		// latvianIdentityNumber property nad instead have
		// foreignerSystemAssignedNumber.
		if (officer.naturalPerson.latvianIdentityNumber) {
			// Use "LV" for the country as it marks the personal id scope.
			personCountry = "LV"
			personalId = officer.naturalPerson.latvianIdentityNumber

			// New or updated personal ids starting with "32" do not include the
			// person's birthdate.
			personBirthdate = personalId.startsWith("32")
				? null
				: _.birthdateFromLatvianPersonalId(personalId)
		}
		else if (officer.naturalPerson.birthDate) {
			personCountry = officer.naturalPerson.country
			personalId = null
			personBirthdate = _.parseIsoDate(officer.naturalPerson.birthDate)
		}
		else {
			console.warn(`Missing personal id or birth date for %s.`, personName)
			continue
		}

		var person = yield peopleDb.read(sql`
			SELECT * FROM people
			WHERE (
				country = ${personCountry} AND
				personal_id = ${personalId}
			)
			OR (
				country = ${personCountry} AND
				normalized_name = ${personNormalizedName} AND
				birthdate = ${_.formatIsoDate(personBirthdate)}
			)
		`)

		if (person == null) person = yield peopleDb.create({
			country: personCountry,
			personal_id: personalId,
			name: personName,
			normalized_name: personNormalizedName,
			birthdate: personBirthdate
		})

		yield orgPeopleDb.create({
			organization_country: org.country,
			organization_id: org.id,
			person_id: person.id,
			person_country: person.country,
			person_personal_id: person.personal_id,
			person_birthdate: person.birthdate,

			// Some officers of organizations lack an appointed date, for example
			// 51502012011. In that case it was the OWNER. Other organizations, like
			// 90000028300, have officers with no appointment or registration date.
			started_at: (
				officer.appointedOn ? _.parseIsoDate(officer.appointedOn) :
				officer.registeredOn ? _.parseIsoDate(officer.registeredOn) :
				new Date(0)
			),

			// Unknown yet whether the end date is inclusive or exclusive.
			// Assuming the former as people often use dates with inclusive ranges.
			ended_at: officer.termUntil && _.parseIsoDate(officer.termUntil),
			role: parsePosition(officer.governingBody, officer.position)
		})
	}
}

function* requestAccessToken() {
	var jwt = serializeJwt(CERT, Config.latvianBusinessRegisterClientPrivateKey, {
		sub: Config.latvianBusinessRegisterClientId,
		iss: Config.latvianBusinessRegisterClientId,
		jti: _.uniqueId(),
		aud: "https://lvp.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token",
		nbf: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 600
	})

	var res = yield api(TOKEN_URL, {
		method: "POST",

		form: {
			grant_type: "client_credentials",
			client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
			client_secret: Config.latvianBusinessRegisterClientSecret,
			client_id: Config.latvianBusinessRegisterClientId,
			client_assertion: jwt
		}
	})

	return res.body.access_token
}

function encode64(value) {
	var buffer = value instanceof Buffer ? value : Buffer.from(value)
	var base64 = buffer.toString("base64")
	base64 = base64.replace(/=/g, "")
	base64 = base64.replace(/\+/g, "-")
	base64 = base64.replace(/\//g, "_")
	return base64
}

function serializeJwt(cert, key, payload) {
	var certFingerprint = sha1(cert)

	var header = {
		// Not all header fields (like x5t, kid) seem to be used by the Latvian
		// Business as of Sep 28, 2020, but since they were in the example code,
		// keeping them aroudn just in case they end up being required.
		typ: "JWT",
		alg: "RS256",
		x5c: cert.toString("base64"),
		x5t: encode64(certFingerprint),
		kid: certFingerprint.toString("hex")
	}

	var headerBase64 = encode64(JSON.stringify(header))
	var payloadBase64 = encode64(JSON.stringify(payload))
	var signable = headerBase64 + "." + payloadBase64

	var signer = Crypto.createSign("RSA-SHA256")
	var keyPem = wrapPem("RSA PRIVATE KEY", key)
	var signature = signer.update(signable).sign(keyPem)

	return signable + "." + encode64(signature)
}

function wrapPem(type, base64) {
	return `-----BEGIN ${type}-----\n${base64}\n-----END ${type}-----`
}

function parseName(person) {
	if (person.surname) return person.forename + " " + person.surname

	var parts = person.name.split(/ /g)
	return parts.slice(1).concat(parts[0]).join(" ")
}

var ROLES = {
	GENERAL_MANAGER: "general_manager",
	OWNER: "owner",
	REPRESENTATIVE_MANAGER: "representative_manager",
	AUTHORISED_REPRESENTATIVE: "authorized_representative",
	ADMINISTRATOR: "administrator",
	ADMINISTRATIVE_MANAGER: "administrative_manager",
	LIQUIDATOR: "liquidator",
	BRANCH_REPRESENTATIVE: "branch_representative",

	EXECUTIVE_BOARD: {
		BOARD_MEMBER: "executive_board_member",
		CHAIR_OF_BOARD: "chair_of_executive_board",
	},

	SUPERVISORY_BOARD: {
		SUPERVISORY_BOARD_MEMBER: "supervisory_board_member",
		CHAIR_OF_SUPERVISORY_BOARD: "chair_of_supervisory_board",
		DEPUTY_CHAIR_OF_SUPERVISORY_BOARD: "deputy_chair_of_supervisory_board"
	}
}

function parsePosition(group, pos) {
	if (pos === "") return "unknown"
	if (group == "" && pos === "MEMBER") return "unknown"

	var role = group ? ROLES[group] && ROLES[group][pos] : ROLES[pos]

	if (role == null) {
		if (group) throw new RangeError(`Invalid position: ${pos} of ${group}`)
		else throw new RangeError(`Invalid position: ${pos}`)
	}
	else return role
}

function is404Response(res) {
	return (
		res.status == 400 &&
		res.body &&
		res.body.error.code == "ENTITY_NOT_FOUND"
	)
}

function sha1(data) { return new Crypto.Hash("sha1").update(data).digest() }
