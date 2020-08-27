var _ = require("root/lib/underscore")
var Neodoc = require("neodoc")
var Cli = require("root/lib/cli")
var organizationsDb = require("root/db/organizations_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var co = require("co")
var sql = require("sqlate")
var sqlite = require("root").sqlite
var {PRODUCT_TYPES} = require("root/lib/procurement")
var {PROCESS_TYPES} = require("root/lib/procurement")
var COUNTRY_CODES = require("root/lib/country_codes")

var USAGE_TEXT = `
Usage: cli import (-h | --help)
       cli import [options] procurements [<path>|-]
       cli import [options] procurement-contracts [<path>|-]

Options:
    -h, --help   Display this help and exit.
`

var PROCUREMENT_STATUS = {
	alustatud: "started",
	eelteade: "prenotified",
	hindamisel: "evaluating",
	"lahenduse ootel": "waiting",
	"liitumiseks avatud": "open",
	"lõpetatud lepinguta": "cancelled",
	täitmisel: "fulfilling",
	"taotlus esitatud": "applied",
	teostatud: "done"
}

module.exports = function*(argv) {
  var args = Neodoc.run(USAGE_TEXT, {argv: argv || ["import"]})
  if (args["--help"]) return void process.stdout.write(USAGE_TEXT.trimLeft())

	var cmd
	if (args.procurements) cmd = "procurements"
	else if (args["procurement-contracts"]) cmd = "procurement-contracts"
	else return void process.stdout.write(USAGE_TEXT.trimLeft())

	var path
	if (args["-"]) path = ["-"]
	else if ("<path>" in args) path = args["<path>"]
	if (path == null) return void process.stdout.write(USAGE_TEXT.trimLeft())

	switch (cmd) {
		case "procurements": yield importProcurements(path); break
		case "procurement-contracts": yield importProcurementContracts(path); break
	}
}

function* importProcurements(path) {
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
			status: parseProcurementStatus(obj.hanke_seisund),
			process_type: parseProcurementProcessType(obj.menliik_kood),
			product_type: parseProcurementProductType(obj.hanke_liik_kood),
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
				: null,

			responsible_person_name: obj.vastutav_isik,
			responsible_person_email: obj.vastutava_epost
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

function parseProcurementStatus(text) {
	var status = PROCUREMENT_STATUS[text]
	if (status == null) throw new RangeError("Invalid status: " + status)
	return status
}

function parseProcurementProductType(type) {
	// https://www.rahandusministeerium.ee/et/eesmargidtegevused/riigihangete-poliitika/kasulik-teave#cpv
	if (type in PRODUCT_TYPES) return type
	throw new RangeError("Invalid product type: " + type)
}

function parseProcurementProcessType(type) {
	// https://www.rahandusministeerium.ee/sites/default/files/Riigihangete_poliitika/juhised/riigihangete_menetlusskeemid.pdf
	if (type in PROCESS_TYPES) return type
	throw new RangeError("Invalid process type: " + type)
}
