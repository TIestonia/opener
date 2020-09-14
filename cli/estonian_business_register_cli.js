var _ = require("root/lib/underscore")
var Config = require("root/config")
var Neodoc = require("neodoc")
var DateFns = require("date-fns")
var RegisterXml = require("root/lib/estonian_business_register_xml")
var api = require("root/lib/estonian_business_register_api")
var sqlite = require("root").sqlite
var updateSql = require("heaven-sqlite").update
var organizationsDb = require("root/db/organizations_db")
var orgPeopleDb = require("root/db/organization_people_db")
var peopleDb = require("root/db/people_db")
var sql = require("sqlate")
var concat = Array.prototype.concat.bind(Array.prototype)

var USAGE_TEXT = `
Usage: cli estonian-business-register (-h | --help)
       cli estonian-business-register [options] import <registry-code>

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

module.exports = function*(argv) {
  var args = Neodoc.run(USAGE_TEXT, {argv: argv || ["import"]})
  if (args["--help"]) return void process.stdout.write(USAGE_TEXT.trimLeft())

	if (args.import);
	else return void process.stdout.write(USAGE_TEXT.trimLeft())

	yield sqlite(sql`BEGIN`)

	var orgId = args["<registry-code>"]
	var org = yield organizationsDb.read(sql`
		SELECT * FROM organizations
		WHERE country = 'EE' AND id = ${orgId}
	`)

	if (org == null) {
		console.warn("Organization not related to procurements: " + orgId)
		process.exit(1)
	}

	var info = yield readOrganizationFromRegister(orgId)

	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			name: info.nimi.$
		}))}

		WHERE country = 'EE' AND id = ${orgId}
	`)

	yield orgPeopleDb.execute(sql`
		DELETE FROM organization_people
		WHERE organization_country = ${org.country}
		AND organization_id = ${org.id}
	`)

	var entries = concat(
		info.isikuandmed.kaardile_kantud_isikud.item,
		info.isikuandmed.kaardivalised_isikud.item
	).filter((e) => (
		// Only physical people (tyyp == F) and board-level.
		e.isiku_tyyp.$ == "F" && !IRRELEVALT_ROLES.includes(e.isiku_roll)
	))

	for (var i = 0; i < entries.length; ++i) {
		var entry = entries[i]
		var id = entry.isikukood_registrikood && entry.isikukood_registrikood.$
		var name = entry.eesnimi.$ + " " + entry.nimi_arinimi.$

		if (id == null) {
			// AS G4S Eesti has a chairman of the supervisory board that only
			// includes a foreign id, though with no country for context.
			console.warn(
				"Missing personal id for %s (entry %s).",
				name,
				entry.kirje_id.$
			)

			continue
		}

		var person = yield peopleDb.read(sql`
			SELECT * FROM people
			WHERE country = 'EE' AND id = ${id}
		`)

		if (person == null) person = yield peopleDb.create({
			country: "EE",
			id: id,
			name: name,
			normalized_name: _.normalizeName(name),
			birthdate: _.birthdateFromPersonalId(id)
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

	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			business_register_data: RegisterXml.serialize({item: info}),
			business_register_synced_at: new Date
		}))} WHERE country = 'EE' AND id = ${orgId}
	`)

	yield sqlite(sql`COMMIT`)
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

						<reg:yandmed>false</reg:yandmed>
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
