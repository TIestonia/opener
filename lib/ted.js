var _ = require("./underscore")
var TedXml = require("./ted_xml")
var organizationsDb = require("root/db/organizations_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var sql = require("sqlate")
var updateSql = require("heaven-sqlite").update

// https://simap.ted.europa.eu/standard-forms-for-public-procurement
var CONTRACT_NOTICE = "F02"
var CONTRACT_AWARD_NOTICE = "F03"
var CONTRACT_FOR_UTILITIES_NOTICE = "F05"
var CONTRACT_FOR_UTILITIES_AWARD_NOTICE = "F06"
var DESIGN_CONTEST_NOTICE = "F12"
var DESIGN_CONTEST_RESULT_NOTICE = "F13"
var CHANGE_NOTICE = "F14"
var TRANSPARENCY_NOTICE = "F15"
var SOCIAL_SERVICES_CONTRACT_NOTICE = "F21"
var SOCIAL_SERVICES_CONTRACT_FOR_UTILITIES_NOTICE = "F22"
var SOCIAL_SERVICES_CONCESSION_NOTICE = "F23"
var CONCESSION_NOTICE = "F24"
var CONCESSION_AWARD_NOTICE = "F25"

exports.parse = function(xml) {
	return _.asArray(TedXml.parse(xml)[":OPEN-DATA"].TED_ESENDERS)
}

exports.import = function*(esenderEl) {
	var country = esenderEl.SENDER.CONTACT.COUNTRY.VALUE
	var formEl = esenderEl.FORM_SECTION
	var uuid = formEl.NOTICE_UUID.$

	formEl = (
		formEl.F02_2014 ||
		formEl.F03_2014 ||
		formEl.F05_2014 ||
		formEl.F06_2014 ||
		formEl.F12_2014 ||
		formEl.F13_2014 ||
		formEl.F14_2014 ||
		formEl.F15_2014 ||
		formEl.F21_2014 ||
		formEl.F22_2014 ||
		formEl.F23_2014 ||
		formEl.F24_2014 ||
		formEl.F25_2014
	)

	if (formEl == null) {
		var formTag = _.keys(esenderEl.FORM_SECTION)[1]
		throw new RangeError("No supported form for " + uuid + ": " + formTag)
	}

	var contractEl = formEl.OBJECT_CONTRACT
	var procedureEl = formEl.PROCEDURE
	var procurementId = contractEl.REFERENCE_NUMBER.$
	var procurementTitle = getText(formEl.OBJECT_CONTRACT.TITLE)

	var procurement = yield procurementsDb.read(sql`
		SELECT * FROM procurements
		WHERE country = ${country}
		AND id = ${procurementId}
	`)

	var attrs = {}

	switch (formEl.FORM) {
		case CONTRACT_NOTICE:
		case CONTRACT_AWARD_NOTICE:
		case CONTRACT_FOR_UTILITIES_NOTICE:
		case CONTRACT_FOR_UTILITIES_AWARD_NOTICE:
		case DESIGN_CONTEST_NOTICE:
		case DESIGN_CONTEST_RESULT_NOTICE:
		case TRANSPARENCY_NOTICE:
		case SOCIAL_SERVICES_CONTRACT_NOTICE:
		case SOCIAL_SERVICES_CONTRACT_FOR_UTILITIES_NOTICE:
		case SOCIAL_SERVICES_CONCESSION_NOTICE:
		case CONCESSION_NOTICE:
		case CONCESSION_AWARD_NOTICE:
			if (procurement && [
				CONTRACT_AWARD_NOTICE,
				DESIGN_CONTEST_RESULT_NOTICE,
				CONTRACT_FOR_UTILITIES_AWARD_NOTICE,
				TRANSPARENCY_NOTICE,
				CONCESSION_AWARD_NOTICE,
				SOCIAL_SERVICES_CONCESSION_NOTICE
			].includes(formEl.FORM)) break

			var buyerEl = formEl.CONTRACTING_BODY
			var buyerCountry = buyerEl.ADDRESS_CONTRACTING_BODY.COUNTRY.VALUE
			var buyerId = buyerEl.ADDRESS_CONTRACTING_BODY.NATIONALID.$
			var buyerName = buyerEl.ADDRESS_CONTRACTING_BODY.OFFICIALNAME.$

			var buyerUrl = (
				buyerEl.ADDRESS_CONTRACTING_BODY.URL_GENERAL &&
				buyerEl.ADDRESS_CONTRACTING_BODY.URL_GENERAL.$
			)

			var buyer = yield organizationsDb.read(sql`
				SELECT * FROM organizations
				WHERE country = ${buyerCountry} AND id = ${buyerId}
			`)

			if (buyer == null) buyer = yield organizationsDb.create({
				country: buyerCountry,
				id: buyerId,
				name: buyerName,
				url: buyerUrl && fixUrl(buyerUrl)
			})

			attrs.country = country
			attrs.id = procurementId
			attrs.procedure_type = parseProcurementProcedureType(procedureEl)
			attrs.buyer_country = buyer.country
			attrs.buyer_id = buyer.id
			attrs.title = procurementTitle
			attrs.description = getText(contractEl.SHORT_DESCR)

			attrs.published_at = _.parseIsoDate(
				formEl.COMPLEMENTARY_INFO.DATE_DISPATCH_NOTICE.$
			)

			attrs.deadline_at = (
				procedureEl.DATE_RECEIPT_TENDERS &&
				parseProcurementDeadline(procedureEl)
			)

			if (contractEl.VAL_ESTIMATED_TOTAL) _.assign(attrs, {
				estimated_cost: Number(contractEl.VAL_ESTIMATED_TOTAL.$),
				estimated_cost_currency: contractEl.VAL_ESTIMATED_TOTAL.CURRENCY
			})

			attrs.cpv_code = contractEl.CPV_MAIN.CPV_CODE.CODE
			break

		case CHANGE_NOTICE: return

		default:
			console.warn("Ignoring %s notice for %s procurement %s: %s",
				formEl.FORM,
				procurement == null ? "unseen" : "seen",
				procurementId,
				procurementTitle
			)

			return
	}

	if (procurement == null) procurement = yield procurementsDb.create(attrs)
	else if (!_.isEmpty(attrs)) {
		yield procurementsDb.execute(sql`
			${updateSql("procurements", procurementsDb.serialize(attrs))}
			WHERE country = 'EE' AND id = ${procurementId}
		`)

		_.assign(procurement, attrs)
	}

	if (formEl.AWARD_CONTRACT) {
		for (var i = 0, els = _.asArray(formEl.AWARD_CONTRACT); i < els.length; ++i)
			yield importContract(procurement, els[i])
	}
}

function* importContract(procurement, contractEl) {
	if (contractEl.NO_AWARDED_CONTRACT) return

	// Some contracts, such as 200292, lack the contract number.
	var contractId = (
		contractEl.CONTRACT_NO &&
		contractEl.CONTRACT_NO.$ ||
		contractEl.ITEM
	)

	var contractTitle = getText(contractEl.TITLE)
	var awardEl = contractEl.AWARDED_CONTRACT
	var createdAt = _.parseIsoDate(awardEl.DATE_CONCLUSION_CONTRACT.$)

	var sellerEl = awardEl.CONTRACTORS.CONTRACTOR
	// Some contracts have multiple contact details, such as 200685 for Telia.
	if (sellerEl instanceof Array) sellerEl = sellerEl[0]
	var seller, sellerCountry, sellerId, sellerName

	if (sellerEl) {
		sellerCountry = sellerEl.ADDRESS_CONTRACTOR.COUNTRY.VALUE
		sellerId = sellerEl.ADDRESS_CONTRACTOR.NATIONALID.$
		sellerName = sellerEl.ADDRESS_CONTRACTOR.OFFICIALNAME.$

		seller = yield organizationsDb.read(sql`
			SELECT * FROM organizations
			WHERE country = ${sellerCountry} AND id = ${sellerId}
		`)

		if (seller == null) seller = yield organizationsDb.create({
			country: sellerCountry,
			id: sellerId,
			name: sellerName
		})
	}

	var cost = null, costCurrency = null

	if (awardEl.VALUES) {
		cost = awardEl.VALUES.VAL_TOTAL.$
		costCurrency = awardEl.VALUES.VAL_TOTAL.CURRENCY
	}

	yield contractsDb.create({
		procurement_country: procurement.country,
		procurement_id: procurement.id,
		nr: contractId,
		seller_country: seller && seller.country,
		seller_id: seller && seller.id,
		title: contractTitle,
		created_at: createdAt,
		cost: cost,
		cost_currency: costCurrency
	})
}

function parseProcurementProcedureType(el) {
	// Available procedures:
	// https://op.europa.eu/en/web/eu-vocabularies/e-procurement/tedschemas
	// https://op.europa.eu/documents/3938058/5358176/Forms_validation_rules_R2.0.9.S03_009-20190628.xlsx.zip
	if (el.PT_OPEN) return "open"
	if (el.PT_RESTRICTED) return "restricted"
	if (el.PT_COMPETITIVE_NEGOTIATION) return "competitive-negotation"
	if (el.PT_COMPETITIVE_DIALOGUE) return "competitive-dialog"
	if (el.PT_INNOVATION_PARTNERSHIP) return "innovation-partnership"
	if (el.PT_INVOLVING_NEGOTIATION) return "involving-negotation"
	if (el.PT_NEGOTIATED_WITH_PRIOR_CALL) return "negotatiated-with-prior-call"

	if (el.PT_AWARD_CONTRACT_WITHOUT_CALL)
		return "award-contract-without-call"

	if (el.PT_AWARD_CONTRACT_WITH_PRIOR_PUBLICATION)
		return "award-contract-with-prior-publication"

	if (el.PT_AWARD_CONTRACT_WITHOUT_PRIOR_PUBLICATION)
		return "award-contract-without-prior-publication"

	if (el.DIRECTIVE_2014_24_EU) {
		if (el.DIRECTIVE_2014_24_EU.PT_NEGOTIATED_WITHOUT_PUBLICATION)
			return "2014-24-eu/negotiated-without-publication"
		else if (el.DIRECTIVE_2014_24_EU.PT_AWARD_CONTRACT_WITHOUT_CALL)
			return "2014-24-eu/award-contract-without-call"
	}
	// Ensuring existence of other directives doesn't accidentally default to
	// "open".
	else if (el.DIRECTIVE_2009_81_EC);
	else if (el.DIRECTIVE_2014_23_EU);
	else if (_.keys(el).filter((t) => t.startsWith("PT_")).length == 0)
		return "open"

	throw new RangeError("No procurement procedure type tag: " + _.keys(el))
}

function parseProcurementDeadline(el) {
	var date = _.parseIsoDate(el.DATE_RECEIPT_TENDERS.$)
	var [hours, minutes] = el.TIME_RECEIPT_TENDERS.$.split(":")
	date.setHours(+hours, +minutes)
	return date
}

function getText(el) { return _.map(el, (el) => el.$).join("\n\n") }
function fixUrl(url) { return /^\w+:/.test(url) ? url : "https://" + url }
