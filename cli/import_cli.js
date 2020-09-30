var _ = require("root/lib/underscore")
var Neodoc = require("neodoc")
var Cli = require("root/lib/cli")
var Ted = require("root/lib/ted")
var Stream = require("root/lib/stream")
var organizationsDb = require("root/db/organizations_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var partiesDb = require("root/db/political_parties_db")
var partyMembersDb = require("root/db/political_party_members_db")
var partyDonationsDb = require("root/db/political_party_donations_db")
var co = require("co")
var sql = require("sqlate")
var sqlite = require("root").sqlite
var {ESTONIAN_PROCEDURE_TYPES} = require("root/lib/procurement")
var COUNTRIES_BY_ALPHA3 = _.indexBy(require("root/lib/countries"), "alpha3")
var LATVIAN_COUNTRY_CODES = require("root/lib/latvian_country_codes")

var USAGE_TEXT = `
Usage: cli import (-h | --help)
       cli import [options] procurements (<path>|-)
       cli import [options] procurements-ocds (<path>|-)
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
	else if (args["procurements-ocds"])
		yield importProcurementsOcds(path)
	else if (args["procurements-csv"])
		yield importProcurementsCsv(path)
	else if (args["procurement-contracts-csv"])
		yield importProcurementContracts(path)
	else if (args["political-party-members"])
		yield importPoliticalPartyMembers(path)
	else if (args["political-party-donations"])
		yield importPoliticalPartyDonations(args["<name>"], path)
	else
		process.stdout.write(USAGE_TEXT.trimLeft())
}

function* importProcurements(path) {
	var xml = yield Stream.slurp(Cli.readStream(path), "utf8")
	var esenders = Ted.parse(xml)

	yield sqlite(sql`BEGIN`)
	for (var i = 0; i < esenders.length; ++i) yield Ted.import(esenders[i])
	yield sqlite(sql`COMMIT`)
}

function* importProcurementsOcds(path) {
	yield sqlite(sql`BEGIN`)

	var stream = Cli.readStream(path).pipe(Stream.lines())
	yield Cli.stream(stream, co.wrap(function*(line) {
		var obj = JSON.parse(line)

		if (obj.releases.length > 1) throw new Error("Multiple releases")
		obj = obj.releases[0]

		if (obj.tender.title == null) {
			console.warn("Ignoring empty procurement: " + obj.tender.id)
			return
		}

		var partiesByUuid = _.mapValues(_.indexBy(obj.parties, "id"), parseParty)
		var buyerAttrs = partiesByUuid[obj.buyer.id]

		var buyer = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = ${buyerAttrs.country} AND id = ${buyerAttrs.id}
		`)

		if (buyer == null) buyer = yield organizationsDb.create(buyerAttrs)

		var tenderObj = obj.tender
		var lotsById = _.indexBy(tenderObj.lots, "id")

		var tenderNoticeDocument = _.find(tenderObj.documents, {
			documentType: "tenderNotice"
		})

		// The date is really a UTC timestamp in ISO 8601.
		var publishedAt = tenderNoticeDocument
			? new Date(tenderNoticeDocument.datePublished)
			: new Date(obj.date)

		var procurement
		try {
			procurement = yield procurementsDb.create({
				country: buyer.country,
				id: tenderObj.id,
				title: tenderObj.title,
				description: tenderObj.description,
				buyer_country: buyer.country,

				procedure_type: (
					tenderObj.procurementMethod &&
					parseProcurementOpentenderProcedureType(
						tenderObj.procurementMethod,
						tenderObj.procurementMethodDetails
					)
				),

				buyer_id: buyer.id,
				estimated_cost: tenderObj.value && tenderObj.value.amount,
				estimated_cost_currency: tenderObj.value && tenderObj.value.currency,
				published_at: publishedAt,

				deadline_at: (
					tenderObj.tenderPeriod &&
					new Date(tenderObj.tenderPeriod.endDate)
				)
			})
		}
		catch (ex) {
			if (
				ex.code == "SQLITE_CONSTRAINT" &&
				/UNIQUE constraint failed/.test(ex.message)
			) {
				console.error("Ignoring duplicate procurement: " + tenderObj.id)
				return
			}

			throw ex
		}

		if (obj.awards) for (var i = 0; i < obj.awards.length; ++i) {
			var contractObj = obj.awards[i]
			var lot = lotsById[contractObj.relatedLots[0]]
			var seller

			if (contractObj.suppliers) {
				if (contractObj.suppliers.length > 1)
					console.warn("Multiple suppliers per award for " + procurement.id)

				var sellerAttrs = partiesByUuid[contractObj.suppliers[0].id]

				seller = yield organizationsDb.read(sql`
					SELECT * FROM organizations
					WHERE country = ${sellerAttrs.country} AND id = ${sellerAttrs.id}
				`)

				if (seller == null) seller = yield organizationsDb.create(sellerAttrs)
			}

			yield contractsDb.create({
				procurement_country: procurement.country,
				procurement_id: procurement.id,
				nr: contractObj.id,
				seller_country: seller && seller.country,
				seller_id: seller && seller.id,
				title: lot.title || lot.description,
				estimated_cost: lot.value && lot.value.amount,
				estimated_cost_currency: lot.value && lot.value.currency,
				cost: contractObj.value && contractObj.value.amount,
				cost_currency: contractObj.value && contractObj.value.currency,
				created_at: new Date(obj.date)
			})
		}
	}))

	yield sqlite(sql`COMMIT`)

	function parseParty(party) {
		var name = party.name
		var country = party.address.countryName

		// Some parties have their country name set to an integer value. Presuming
		// Latvian codes for now. Codes come from
		// http://open.iub.gov.lv/download/file/XML_birku_atsifrejumi_v4.0.7z
		// and country_v1.0.ods.
		if (isFinite(country)) country = LATVIAN_COUNTRY_CODES[country] || country
		if (isFinite(country)) console.error(country)

		// Not all Opentender procurement parties have their registry code.
		var id = _.find(party.additionalIdentifiers, {scheme: "ORGANIZATION_ID"})
		id = id && id.id || party.id

		return {country, id, name}
	}
}

function* importProcurementsCsv(path) {
	yield sqlite(sql`BEGIN`)

	var i = 0

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
			published_at: parseEstonianPublishedAt(obj.avaldati),
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

		if (isImportMilestone(++i)) console.warn("Imported %d procurements.", i)
	}))

	yield sqlite(sql`COMMIT`)

	console.warn("Imported %d procurements.", i)
}

function* importProcurementContracts(path) {
	yield sqlite(sql`BEGIN`)
	
	var i = 0

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

		// There are a couple of procurement contracts in the 2018 Excel table that
		// lack a seller, yet don't mark them as secret.
		if (obj.pakkuja_salastatud == "Ei" && obj.pakkuja_riik) {
			var sellerCountry = COUNTRIES_BY_ALPHA3[obj.pakkuja_riik].alpha2
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

		if (isImportMilestone(++i)) console.warn("Imported %d contracts.", i)
	}))

	yield sqlite(sql`COMMIT`)

	console.warn("Imported %d contracts.", i)
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

var OPENTENDER_PROCEDURE_TYPE = {
	pt_open: "open",
	pt_competitive_negotiation: "competitive-negotation",
	pt_restricted: "restricted",
	pt_negotiated_with_prior_call: "negotatiated-with-prior-call",
	pt_competitive_dialogue: "competitive-dialog",
	pt_innovation_partnership: "Innovation partnership",

	// Couldn't confirm that the following exists in TED...
	pt_negotiated_with_publication_contract_notice:
		"pt_negotiated_with_publication_contract_notice",

	"f18_pt_negotiated_without_publication_contract_notice":
		"f18_pt_negotiated_without_publication_contract_notice"
}

// The `procurementMethodDetails` field seems to mirror the procedure types from
// TED. The renamed `procurementMethod` values on the other hand is the same
// for multiple `procurementMethodDetails`.
function parseProcurementOpentenderProcedureType(type, details) {
	// Some procurements have their type set to "open" or "selective" and the
	// details set to an integer value in a string.
	if (type == "open" && isFinite(details)) return "open"
	if (type == "open" && details == "OPEN") return "open"
	if (type == "selective" && isFinite(details)) return null
	if (type == "direct" && isFinite(details)) return null

	var procedureType = OPENTENDER_PROCEDURE_TYPE[details]

	if (procedureType == null)
		throw new RangeError("Invalid procedure type: " + details)

	return procedureType
}

function parseEstonianPublishedAt(time) {
	// The 2018 Excel table formats dates as MM/DD/YYYY, while the 2019 table
	// uses DD.MM.YYYY HH:MM:SS.
	if (time.includes(":")) return _.parseEstonianDateTime(time)

	var match = /^(\d\d)\/(\d\d)\/(\d\d\d\d)$/.exec(time)
	if (match == null) throw new SyntaxError("Invalid Date: " + time)
	return new Date(+match[3], +match[1] - 1, +match[2])
}

function isImportMilestone(i) { return (i % 500) == 0 }
