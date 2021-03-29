var _ = require("root/lib/underscore")
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
var COUNTRY_CODES = require("root/lib/estonian_business_register_country_codes")
var readOrganizationFromRegister =
	require("root/lib/estonian_business_register_api").readOrganization
var logger = require("root").logger
var ESTONIAN_PERSONAL_ID_FORMAT = /^[123456]\d\d\d\d\d\d\d\d\d\d$/
exports = module.exports = cli
exports.importOrganization = importOrganization

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

function* cli(argv) {
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
		let org = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = 'EE' AND id = ${orgId}
		`)

		if (org == null) {
			logger.warn("Organization not related to procurements: " + orgId)
			process.exit(1)
		}

		if (org.business_register_data != null) {
			logger.warn("Already imported data from the business register.")
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
			AND id GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
			AND business_register_data IS NULL
			LIMIT 10
		`)).length > 0) {
			for (var i = 0; i < orgs.length; ++i) {
				let org = orgs[i]
				yield sqlite(sql`BEGIN`)
				logger.warn("Importing %s (%s)…", org.id, org.name)
				yield importOrganization(org)
				yield sqlite(sql`COMMIT`)

				if ((++imported % 100) == 0)
					logger.warn("Imported %d organizations.", imported)
			}
		}

		logger.warn("Imported %d organizations.", imported)
	}

	yield organizationsDb.reindex()
	yield peopleDb.reindex()
}

function* reparseOrganizations(orgId) {
	if (orgId != null) {
		let org = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = 'EE' AND id = ${orgId}
		`)

		if (org == null) {
			logger.warn("Organization not related to procurements: " + orgId)
			process.exit(1)
		}

		yield sqlite(sql`BEGIN`)
		let info = RegisterXml.parse(org.business_register_data).item
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

				logger.warn("Reparsing %s (%s)…", org.id, org.name)
				let info = RegisterXml.parse(org.business_register_data).item
				yield updateOrganization(org, info)

				if ((++reparsed % 100) == 0)
					logger.warn("Reparsed %d organizations.", reparsed)
			}

			yield sqlite(sql`COMMIT`)
		}

		logger.warn("Reparsed %d organizations.", reparsed)
	}

	yield organizationsDb.reindex()
	yield peopleDb.reindex()
}

function* importOrganization(org) {
	assert(org.country == "EE")

	var info = yield readOrganizationFromRegister(org.id)

	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			business_register_data: RegisterXml.serialize({item: info}),
			business_register_synced_at: new Date
		}))}

		WHERE country = ${org.country} AND id = ${org.id}
	`)

	yield updateOrganization(org, info)
}

function* updateOrganization(org, info) {
	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			name: info.nimi.$
		}))}

		WHERE country = ${org.country} AND id = ${org.id}
	`)

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
		var personCountry = null
		var personalId = null
		var personBirthdate = null

		// AS Äripäev has a member of the supervisory board that's got an
		// <isikukood_registrikood>, but which seems to be set to Sweden's personal
		// id.
		if (
			entry.isikukood_registrikood &&
			ESTONIAN_PERSONAL_ID_FORMAT.test(entry.isikukood_registrikood.$)
		) {
			personCountry = "EE"
			personalId = entry.isikukood_registrikood.$
			personBirthdate = _.birthdateFromEstonianPersonalId(personalId)
		}

		// AS G4S Eesti has a chairman of the supervisory board (entry 2000150794)
		// that only includes a foreign id, but no <valis_kood_riik>. The
		// <aadress_riik> is set to Estonia, even though the personal id isn't
		// Estonian. No birthdate to go with the personal id. The Latvian Register
		// lists the person as Finnish.
		//
		// However there are far too many foreigners without <valis_kood_riik> to
		// ignore them.
		else if (
			entry.valis_kood &&
			(entry.valis_kood_riik || entry.aadress_riik)
		) {
			personCountry = COUNTRY_CODES[entry.valis_kood_riik
				? entry.valis_kood_riik.$
				: entry.aadress_riik.$
			]

			personalId = entry.valis_kood.$
			personBirthdate = entry.synniaeg && parseRegisterDate(entry.synniaeg.$)
		}

		// OÜ Central Hotell has a supervisory board member (entry 9000415950) with
		// no foreign id, but a name, birthdate and address.
		//
		// At the same time, the previous board member (entry 9000415949) has both
		// <valis_kood_riik> and <aadress_riik>, but the <valis_kood_riik> seems
		// incorrect. The Latvian Business Register lists the person's passport
		// as issued by Norway rather than Denmark, which <valis_kood_riik> says.
		//
		// For now we're trusting the address over <valis_kood_riik>.
		else if (
			entry.synniaeg && (
			entry.aadress_riik || entry.valis_kood_riik
		)) {
			if (
				entry.aadress_riik && entry.valis_kood_riik &&
				entry.aadress_riik.$ != entry.valis_kood_riik.$
			) logger.warn(
				"Mismatching foreign addresses: %s and %s",
				entry.aadress_riik.$,
				entry.valis_kood_riik.$
			)

			personCountry = COUNTRY_CODES[entry.aadress_riik
				? entry.aadress_riik.$
				: entry.valis_kood_riik.$
			]

			personalId = null
			personBirthdate = parseRegisterDate(entry.synniaeg.$)
		}

		var personName = entry.eesnimi.$ + " " + entry.nimi_arinimi.$
		var personNormalizedName = _.normalizeName(personName)

		if (personalId == null && personBirthdate == null) {
			var entryId = entry.kirje_id.$
			logger.warn("Missing personal id for %s (entry %s).", personName, entryId)
			continue
		}

		var person = yield peopleDb.read(sql`
			SELECT * FROM people
			WHERE (
				country = ${personCountry} AND
				personal_id = ${personalId})
			OR (
				country = ${personCountry} AND
				normalized_name = ${_.normalizeName(personName)} AND
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
			started_at: parseRegisterDate(entry.algus_kpv.$),

			// Unknown yet whether the end date is inclusive or exclusive.
			// Assuming the former as people often use dates with inclusive ranges.
			ended_at: entry.lopp_kpv
				? DateFns.addDays(parseRegisterDate(entry.lopp_kpv.$), 1)
				: null,

			role: parseRole(entry.isiku_roll.$)
		})
	}
}

// Values come from klassifikaatorid_v1 response.
// http://www2.rik.ee/schemas/xtee6/arireg/live/xroad6_klassifikaatorid_v1.xsd
// See the Makefile for a request task.
var ROLES = {
	A: "founder",
	AJPH: "interim_bankcruptcy_trustee",
	ASES: "authorized_representative",
	B: "founder",
	D: "auditor",
	DOKH: "depositary_of_documents",
	E: "chair_of_supervisory_board",
	ETTEV: "entrepreneur",
	EUSOS2: "limited_partner_representative",
	FIE: "sole_trader",
	HNKL: "administrative_board_member",
	JUHA: "executive_board_sole_member",
	JUHE: "chair_of_executive_board",
	JUHJ: "director_of_executive_board",
	JUHL: "executive_board_member",
	JPNKR: "supervising_bankcruptcy_trustee",
	KISIK: "contact",
	LIKV: "liquidator",
	LIKVJ: "executive_board_liquidator_member",
	M: "auditor_of_nonmonetary_contribution",
	MDKPI: "person_for_procedural_documents",
	N: "supervisory_board_member",
	O: "shareholder",
	P: "bankcruptcy_committee_member",
	PANKR: "bankcruptcy_trustee",
	PROK: "procurator",
	R: "auditing_committee_member",
	S: "shareholder",
	SJESI: "representantive",
	TOSAN: "general_partner",
	UOSAN: "limited_partner",
	V: "authorized_person",
	VFILJ: "branch_director",
	YHLLV: "association_member"
}

function parseRole(estonianRole) {
	var role = ROLES[estonianRole]
	if (role == null) throw new RangeError(`Invalid role: ${estonianRole}`)
	return role
}

function parseRegisterDate(date) {
	// For some reason dates in the register XML have a "Z" suffix. That doesn't
	// make sense as time zoned dates seldom make sense and especially not in UTC
	// for dates pertaining to Estonian organizations.
	return _.parseIsoDate(date.replace(/Z$/, ""))
}
