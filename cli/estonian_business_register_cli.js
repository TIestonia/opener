var Config = require("root/config")
var Neodoc = require("neodoc")
var DateFns = require("date-fns")
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
			name: info.nimi
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
		// Only physical people (tyyp == F) and non-auditors (roll != D).
		e.isiku_tyyp == "F" && e.isiku_roll != "D"
	))

	for (var i = 0; i < entries.length; ++i) {
		var entry = entries[i]
		var id = entry.isikukood_registrikood

		var person = yield peopleDb.read(sql`
			SELECT * FROM people
			WHERE country = 'EE' AND id = ${id}
		`)

		if (person == null) person = yield peopleDb.create({
			country: "EE",
			id: id,
			name: entry.eesnimi + " " + entry.nimi_arinimi
		})

		yield orgPeopleDb.create({
			organization_country: org.country,
			organization_id: org.id,
			person_country: person.country,
			person_id: person.id,
			started_at: parseDateFromRegisterTimestamp(entry.algus_kpv),

			// Unknown yet whether the end date is inclusive or exclusive.
			// Assuming the former as people often use dates with inclusive ranges.
			ended_at: typeof entry.lopp_kpv == "number"
				? DateFns.addDays(parseDateFromRegisterTimestamp(entry.lopp_kpv), 1)
				: null,

			role: entry.isiku_roll
		})
	}

	yield organizationsDb.execute(sql`
		${updateSql("organizations", organizationsDb.serialize({
			business_register_data: info,
			business_register_synced_at: new Date
		}))}

		WHERE country = 'EE' AND id = ${orgId}
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
							json
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
	}).then((res) => res.body.keha.ettevotjad.item[0])
}

function parseDateFromRegisterTimestamp(time) {
	// For some reason the dates in XML are converted to Unix timestamps that are
	// offset by one hour from midnight UTC.
	var utc = new Date(time * 1000)
	return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}
