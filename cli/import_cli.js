var _ = require("root/lib/underscore")
var Neodoc = require("neodoc")
var Cli = require("root/lib/cli")
var Ted = require("root/lib/ted")
var organizationsDb = require("root/db/organizations_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var partiesDb = require("root/db/political_parties_db")
var partyMembersDb = require("root/db/political_party_members_db")
var partyDonationsDb = require("root/db/political_party_donations_db")
var co = require("co")
var sql = require("sqlate")
var sqlite = require("root").sqlite
var slurpStream = require("root/lib/stream").slurp
var {ESTONIAN_PROCEDURE_TYPES} = require("root/lib/procurement")
var COUNTRY_CODES = require("root/lib/country_codes")

var USAGE_TEXT = `
Usage: cli import (-h | --help)
       cli import [options] procurements (<path>|-)
       cli import [options] procurements-csv (<path>|-)
       cli import [options] procurement-contracts-csv (<path>|-)
       cli import [options] political-party-members (<path>|-)
       cli import [options] political-party-donations <name> (<path>|-)

Options:
    -h, --help   Display this help and exit.
`

module.exports = function*(argv) {
  var args = Neodoc.run(USAGE_TEXT, {argv: argv || ["import"]})
  if (args["--help"]) return void process.stdout.write(USAGE_TEXT.trimLeft())

	var path
	if (args["-"]) path = ["-"]
	else if ("<path>" in args) path = args["<path>"]

	if (args.procurements)
		yield importProcurements(path)
	else if (args["procurements-csv"])
		yield importProcurementsCsv(path)
	else if (args["procurement-contracts-csv"])
		yield importProcurementContracts(path)
	else if (args["political-party-members"])
		yield importPoliticalPartyMembers(path)
	else if (args["political-party-donations"])
		yield importPoliticalPartyDonations(args["<name>"], path)
	else
		return void process.stdout.write(USAGE_TEXT.trimLeft())
}

function* importProcurements(path) {
	var xml = yield slurpStream(Cli.readStream(path), "utf8")
	var esenders = Ted.parse(xml)

	yield sqlite(sql`BEGIN`)
	for (var i = 0; i < esenders.length; ++i) yield Ted.import(esenders[i])
	yield sqlite(sql`COMMIT`)
}

function* importProcurementsCsv(path) {
	yield sqlite(sql`BEGIN`)

	yield Cli.stream(Cli.readCsv(path), co.wrap(function*(obj) {
		var buyerId = obj.hankija_kood

		var buyer = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = 'EE' AND id = ${buyerId}
		`)

		if (buyer == null) buyer = yield organizationsDb.create({
			country: "EE",
			id: buyerId,
			name: obj.hankija
		})

		yield procurementsDb.create({
			country: "EE",
			id: obj.viitenumber,
			procedure_type: parseProcurementEstonianProcedureType(obj.menliik_kood),
			title: obj.nimetus,
			buyer_country: buyer.country,
			buyer_id: buyer.id,
			published_at: _.parseEstonianDateTime(obj.avaldati),
			bidder_count: Number(obj.pakkujaid) || 0,
			bid_count: Number(obj.pakkumusi) || 0,
			dispute_count: Number(obj.vaidlustusi) || 0,

			deadline_at: obj.esitamise_aeg
				? _.parseEstonianDateTime(obj.esitamise_aeg)
				: null,

			revealed_at: obj.pakkumused_avatud
				? _.parseEstonianDateTime(obj.pakkumused_avatud)
				: null,

			estimated_cost: obj.eeldatav_salastatud == "Ei"
				? Number(obj.eeldatav_maksumus)
				: null,

			estimated_cost_currency: obj.eeldatav_salastatud == "Ei"
				? "EUR"
				: null,

			cost: obj["kas lepingu maksumus on salastatud?"] == "Ei"
				? Number(obj["lõplik hanke maksumus salastatuse järgi (klassikaline)"])
				: null,

			cost_currency: obj["kas lepingu maksumus on salastatud?"] == "Ei"
				? "EUR"
				: null
		})
	}))

	yield sqlite(sql`COMMIT`)
}

function* importProcurementContracts(path) {
	yield sqlite(sql`BEGIN`)

	yield Cli.stream(Cli.readCsv(path), co.wrap(function*(obj) {
		var procurementId = obj.viitenumber

		var procurement = yield procurementsDb.read(sql`
			SELECT * FROM procurements
			WHERE country = 'EE' AND id = ${procurementId}
		`)

		if (procurement == null) {
			console.warn("Ignoring missing procurement: " + procurementId)
			return
		}

		var seller = null

		if (obj.pakkuja_salastatud == "Ei") {
			var sellerCountry = COUNTRY_CODES[obj.pakkuja_riik]
			var sellerId = obj.pakkuja_kood

			seller = yield organizationsDb.read(sql`
				SELECT * FROM organizations
				WHERE country = ${sellerCountry} AND id = ${sellerId}
			`)

			if (seller == null) seller = yield organizationsDb.create({
				country: sellerCountry,
				id: sellerId,
				name: obj.pakkuja
			})
		}

		yield contractsDb.create({
			procurement_country: procurement.country,
			procurement_id: procurement.id,
			nr: obj.leping,
			seller_country: seller && seller.country,
			seller_id: seller && seller.id,
			title: obj.lepingu_nimetus,

			created_at: obj.solmimise_kpv
				? _.parseEstonianDateTime(obj.solmimise_kpv)
				: null,

			ends_at: obj.lopetamise_kpv
				? _.parseEstonianDateTime(obj.lopetamise_kpv)
				: null,

			deadline_at: obj.taitmise_tahtaeg
				? _.parseEstonianDateTime(obj.taitmise_tahtaeg)
				: null,

			estimated_cost: obj.lep_maks_salastatud == "Ei"
				? Number(obj.lepingu_eeldatav_maksumus)
				: null,

			estimated_cost_currency: obj.lep_maks_salastatud == "Ei"
				? "EUR"
				: null,

			cost: obj.lep_maks_salastatud == "Ei"
				? Number(obj.lepingu_tegelik_maksumus)
				: null,

			cost_currency: obj.lep_maks_salastatud == "Ei"
				? "EUR"
				: null,
		})
	}))

	yield sqlite(sql`COMMIT`)
}

function* importPoliticalPartyMembers(path) {
	yield sqlite(sql`BEGIN`)

	var parties = {}

	yield Cli.stream(Cli.readCsv(path, {delimiter: ";"}), co.wrap(function*(obj) {
		var partyName = obj.Erakond
		var party = parties[partyName]
		var name = obj.Eesnimi + " " + obj.Perenimi

		if (party == null) {
			party = yield partiesDb.read(sql`
				SELECT * FROM political_parties
				WHERE country = 'EE' AND name = ${partyName}
			`)

			if (party == null) party = yield partiesDb.create({
				country: "EE",
				name: partyName
			})

			parties[partyName] = party
		}

		// The CSV never seems to include any former members.
		yield partyMembersDb.create({
			party_id: party.id,
			name: name,
			normalized_name: _.normalizeName(name),
			birthdate: _.parseEstonianDate(obj["Sünniaeg"]),
			joined_on: _.parseEstonianDate(obj["Liikmeks astumise aeg"])
		})
	}))

	yield sqlite(sql`COMMIT`)
}

function* importPoliticalPartyDonations(partyName, path) {
	yield sqlite(sql`BEGIN`)

	var party = yield partiesDb.read(sql`
		SELECT * FROM political_parties
		WHERE country = 'EE' AND name = ${partyName}
	`)

	if (party == null) party = yield partiesDb.create({
		country: "EE",
		name: partyName
	})

	yield Cli.stream(Cli.readCsv(path, {delimiter: ";"}), co.wrap(function*(obj) {
		if (obj.Tululiik != "Rahaline annetus") return

		yield partyDonationsDb.create({
			party_id: party.id,
			date: _.parseEstonianDate(obj["Laekumise kuupäev"]),
			donator_name: obj["Tasuja nimi"],
			donator_normalized_name: _.normalizeName(obj["Tasuja nimi"]),
			donator_birthdate: _.parseEstonianDate(obj["Registry Code / Birth Date"]),
			amount: Number(obj["Laekunud summa"].replace(" ", "")),
			currency: "EUR"
		})
	}))

	yield sqlite(sql`COMMIT`)
}

function parseProcurementEstonianProcedureType(type) {
	// https://www.rahandusministeerium.ee/sites/default/files/Riigihangete_poliitika/juhised/riigihangete_menetlusskeemid.pdf
	if (type in ESTONIAN_PROCEDURE_TYPES) {
		// Temporarily store the Estonian type until we've identified the proper EU
		// process type for all.
		return ESTONIAN_PROCEDURE_TYPES[type] || type
	}
	else throw new RangeError("Invalid procedure type: " + type)
}
