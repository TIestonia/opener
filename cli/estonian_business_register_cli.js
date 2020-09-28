var _ = require("root/lib/underscore")
var Config = require("root/config")
var Neodoc = require("neodoc")
var DateFns = require("date-fns")
var RegisterXml = require("root/lib/estonian_business_register_xml")
var sqlite = require("root").sqlite
var updateSql = require("heaven-sqlite").update
var organizationsDb = require("root/db/organizations_db")
var orgPeopleDb = require("root/db/organization_people_db")
var peopleDb = require("root/db/people_db")
var sql = require("sqlate")
var concat = Array.prototype.concat.bind(Array.prototype)
var assert = require("assert")
var fetch = require("fetch-off")
var URL = "https://ariregxmlv6.rik.ee"
var COUNTRY_CODES = require("root/lib/estonian_business_register_country_codes")
var PERSONAL_ID_FORMAT = /^[123456]\d\d\d\d\d\d\d\d\d\d$/

var USAGE_TEXT = `
Usage: cli estonian-business-register (-h | --help)
       cli estonian-business-register [options] import [<registry-code>]
       cli estonian-business-register [options] reparse [<registry-code>]

Options:
    -h, --help   Display this help and exit.
`

var IRRELEVALT_ROLES = [
	"D", // Auditor
	"S", // Stockholder
	"O", // Shareholder
	"M", // Auditor of valuation of non-monetary contribution
	"PANKR" // Trustee in bankruptcy
]

var api = require("fetch-defaults")(fetch, URL, {
	timeout: 10000,
	headers: {Accept: "application/soap+xml"}
})

api = require("fetch-parse")(api, {xml: true})
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
	if (orgId != null) {
		var org = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = 'EE' AND id = ${orgId}
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
		yield importOrganization(org)
		yield sqlite(sql`COMMIT`)
	}
	else {
		var imported = 0, orgs

		while ((orgs = yield organizationsDb.search(sql`
			SELECT * FROM organizations
			WHERE country = 'EE'
			AND length(id) == 8
			AND business_register_data IS NULL
			LIMIT 10
		`)).length > 0) {
			for (var i = 0; i < orgs.length; ++i) {
				let org = orgs[i]
				yield sqlite(sql`BEGIN`)
				console.warn("Importing %s (%s)…", org.id, org.name)
				yield importOrganization(org)
				yield sqlite(sql`COMMIT`)

				if ((++imported % 100) == 0)
					console.warn("Imported %d organizations.", imported)
			}
		}

		console.warn("Imported %d organizations.", imported)
	}
}

function* reparseOrganizations(orgId) {
	if (orgId != null) {
		var org = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = 'EE' AND id = ${orgId}
		`)

		if (org == null) {
			console.warn("Organization not related to procurements: " + orgId)
			process.exit(1)
		}

		yield sqlite(sql`BEGIN`)
		var info = RegisterXml.parse(org.business_register_data).item
		yield updateOrganization(org, info)
		yield sqlite(sql`COMMIT`)
	}
	else {
		var reparsed = 0, orgs

		while ((orgs = yield organizationsDb.search(sql`
			SELECT * FROM organizations
			WHERE country = 'EE'
			AND business_register_data IS NOT NULL
			ORDER BY business_register_synced_at ASC
			LIMIT 100
			OFFSET ${reparsed}
		`)).length > 0) {
			yield sqlite(sql`BEGIN`)

			for (var i = 0; i < orgs.length; ++i) {
				let org = orgs[i]

				console.warn("Reparsing %s (%s)…", org.id, org.name)
				let info = RegisterXml.parse(org.business_register_data).item
				yield updateOrganization(org, info)

				if ((++reparsed % 100) == 0)
					console.warn("Reparsed %d organizations.", reparsed)
			}

			yield sqlite(sql`COMMIT`)
		}

		console.warn("Reparsed %d organizations.", reparsed)
	}
}

function* importOrganization(org) {
	assert(org.country == "EE")

	var info = yield readOrganizationFromRegister(org.id)

	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			name: info.nimi.$,
			business_register_data: RegisterXml.serialize({item: info}),
			business_register_synced_at: new Date
		}))}

		WHERE country = ${org.country} AND id = ${org.id}
	`)

	yield updateOrganization(org, info)
}

function* updateOrganization(org, info) {
	yield orgPeopleDb.execute(sql`
		DELETE FROM organization_people
		WHERE organization_country = ${org.country}
		AND organization_id = ${org.id}
	`)

	var entries = concat(
		info.isikuandmed.kaardile_kantud_isikud.item || [],
		info.isikuandmed.kaardivalised_isikud.item || []
	).filter((e) => (
		// Only physical people (tyyp == F) and board-level.
		e.isiku_tyyp.$ == "F" && !IRRELEVALT_ROLES.includes(e.isiku_roll.$)
	))

	for (var i = 0; i < entries.length; ++i) {
		var entry = entries[i]
		var personCountry, personId

		// AS Äripäev has a member of the supervisory board that's got an
		// <isikukood_registrikood>, but which seems to be set to Sweden's personal
		// id.
		if (
			entry.isikukood_registrikood &&
			PERSONAL_ID_FORMAT.test(entry.isikukood_registrikood.$)
		) {
			personCountry = "EE"
			personId = entry.isikukood_registrikood.$
		}
		// Not all foreigners with a foreign country have a foreign code attached.
		else if (entry.valis_kood && entry.valis_kood_riik) {
			personCountry = COUNTRY_CODES[entry.valis_kood_riik.$]
			personId = entry.valis_kood.$
		}

		var name = entry.eesnimi.$ + " " + entry.nimi_arinimi.$

		if (personId == null) {
			// AS G4S Eesti has a chairman of the supervisory board that only
			// includes a foreign id, though with no country for context.
			var entryId = entry.kirje_id.$
			console.warn("Missing personal id for %s (entry %s).", name, entryId)
			continue
		}

		var person = yield peopleDb.read(sql`
			SELECT * FROM people
			WHERE country = ${personCountry} AND id = ${personId}
		`)

		if (person == null) person = yield peopleDb.create({
			country: personCountry,
			id: personId,
			name: name,
			normalized_name: _.normalizeName(name),

			birthdate: (
				personCountry == "EE" ? _.birthdateFromPersonalId(personId) :
				entry.synniaeg ? parseRegisterDate(entry.synniaeg.$) :
				null
			)
		})

		yield orgPeopleDb.create({
			organization_country: org.country,
			organization_id: org.id,
			person_country: person.country,
			person_id: person.id,
			started_at: parseRegisterDate(entry.algus_kpv.$),

			// Unknown yet whether the end date is inclusive or exclusive.
			// Assuming the former as people often use dates with inclusive ranges.
			ended_at: entry.lopp_kpv
				? DateFns.addDays(parseRegisterDate(entry.lopp_kpv.$), 1)
				: null,

			role: entry.isiku_roll.$
		})
	}
}

function readOrganizationFromRegister(code) {
	return api("/", {
		method: "POST",
		headers: {"Content-Type": "application/soap+xml"},

		body: `<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
			<Header/>

			<Body xmlns:reg="http://arireg.x-road.eu/producer/">
				<reg:detailandmed_v3>
					<reg:keha>
						<reg:ariregister_kasutajanimi>
							${Config.estonianBusinessRegisterUser}
						</reg:ariregister_kasutajanimi>

						<reg:ariregister_parool>
							${Config.estonianBusinessRegisterPassword}
						</reg:ariregister_parool>

						<reg:ariregistri_kood>${code}</reg:ariregistri_kood>

						<reg:ariregister_valjundi_formaat>
							xml
						</reg:ariregister_valjundi_formaat>

						<reg:yandmed>true</reg:yandmed>
						<reg:iandmed>true</reg:iandmed>
						<reg:kandmed>false</reg:kandmed>
						<reg:dandmed>false</reg:dandmed>
						<reg:maarused>false</reg:maarused>
						<reg:keel>eng</reg:keel>
					</reg:keha>
				</reg:detailandmed_v3>
			</Body>
		</Envelope>`
	}).then(function(res) {
		// The register responds with an empty <ettevotjad> tag but no <item> if
		// not found.
		var soap = RegisterXml.parse(res.body).soap$Envelope.soap$Body
		var orgs = soap.detailandmed_v3Response.keha.ettevotjad.item || null
		return orgs || (orgs instanceof Array ? orgs[0].item : orgs.item)
	})
}

function parseRegisterDate(date) {
	// For some reason dates in the register XML have a "Z" suffix. That doesn't
	// make sense as time zoned dates seldom make sense and especially not in UTC
	// for datas pertaining to Estonian organizations.
	return _.parseIsoDate(date.replace(/Z$/, ""))
}
