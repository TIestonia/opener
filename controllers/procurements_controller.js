var _ = require("root/lib/underscore")
var Router = require("express").Router
var HttpError = require("standard-http-error")
var procurementsDb = require("root/db/procurements_db")
var organizationsDb = require("root/db/organizations_db")
var contractsDb = require("root/db/procurement_contracts_db")
var donationsDb = require("root/db/political_party_donations_db")
var sql = require("sqlate")
var next = require("co-next")
var ID_PATH = "/:country([A-Z][A-Z])::id"
exports.router = Router({mergeParams: true})

var COMPARATORS = {
	"<": sql`<`,
	"<=": sql`<=`,
	"=": sql`=`,
	">=": sql`>=`,
	">": sql`>`
}

var FILTERS = [
	"country",
	"bidder-count",
	"contract-count",
	"bidding-duration",
	"procedure-type",
	"political-party-donations"
]

var ORDER_COLUMNS = {
	title: sql`procurement.title`,
	"buyer-name": sql`buyer.name`,
	"published-at": sql`procurement.published_at`,
	"bidding-duration": sql`bidding_duration`,
	"bidder-count": sql`procurement.bidder_count`,
	"cost": sql`COALESCE(procurement.cost, procurement.estimated_cost, 0)`
}

exports.router.get("/", next(function*(req, res) {
	var filters = parseFilters(req.query)
	var country = filters.country
	var bidderCount = filters["bidder-count"]
	var contractCount = filters["contract-count"]
	var biddingDuration = filters["bidding-duration"]
	var procedureType = filters["procedure-type"]
	var politicalPartyDonations = filters["political-party-donations"]
	var order = req.query.order ? parseOrder(req.query.order) : null

	var procurements = yield procurementsDb.search(sql`
		SELECT
			procurement.*,
			buyer.name AS buyer_name,

			julianday(procurement.deadline_at, 'localtime') -
			julianday(procurement.published_at, 'localtime') AS bidding_duration,

			COUNT(DISTINCT contract.id) AS contract_count,

			json_group_array(DISTINCT json_object(
				'id', contract.id,
				'title', contract.title,
				'cost', contract.cost,
				'cost_currency', contract.cost_currency,
				'seller_country', contract.seller_country,
				'seller_id', contract.seller_id,
				'seller_name', seller.name
			)) AS contracts

			${politicalPartyDonations ? sql`,
				json_group_array(json_object(
					'date', donation.date,
					'amount', donation.amount,
					'currency', donation.currency,
					'party_name', party.name,
					'donator_country', person.country,
					'donator_id', person.id,
					'donator_name', person.name,
					'donator_role', role.role
				)) AS donations
			` : sql``}

		FROM procurements AS procurement

		JOIN organizations AS buyer
		ON buyer.country = procurement.buyer_country
		AND buyer.id = procurement.buyer_id

		LEFT JOIN procurement_contracts AS contract
		ON contract.procurement_id = procurement.id

		LEFT JOIN organizations AS seller
		ON seller.country = contract.seller_country
		AND seller.id = contract.seller_id

		${politicalPartyDonations ? sql`
			LEFT JOIN organization_people AS role
			ON role.organization_country = seller.country
			AND role.organization_id = seller.id

			LEFT JOIN people AS person
			ON person.country = role.person_country
			AND person.id = role.person_id

			LEFT JOIN political_party_donations AS donation
			ON donation.donator_normalized_name = person.normalized_name
			AND donation.donator_birthdate = person.birthdate

			LEFT JOIN political_parties AS party ON party.id = donation.party_id
		` : sql``}

		WHERE 1 = 1

		${country ? sql`
			AND procurement.country = ${country[1]}
		`: sql``}

		${procedureType ? sql`
			AND procurement.procedure_type = ${procedureType[1]}
		`: sql``}

		${bidderCount ? sql`
			AND procurement.bidder_count ${COMPARATORS[bidderCount[0]]}
			${Number(bidderCount[1])}`
		: sql``}

		${biddingDuration ? sql`
			AND bidding_duration ${COMPARATORS[biddingDuration[0]]}
			${Number(biddingDuration[1].replace(/d$/, ""))}`
		: sql``}

		${politicalPartyDonations ? sql`
			AND datetime(procurement.deadline_at, 'localtime', ${
				"-" + Number(politicalPartyDonations[1]) + " months"
			}) ${COMPARATORS[politicalPartyDonations[0]]}
				datetime(donation.date, 'localtime')

			AND datetime(donation.date, 'localtime') <
				datetime(procurement.deadline_at, 'localtime')

			AND datetime(donation.date, 'localtime') >=
				datetime(role.started_at, 'localtime')

			AND datetime(donation.date, 'localtime') <
				datetime(role.ended_at, 'localtime')
		` : sql``}

		GROUP BY procurement.country, procurement.id

		${contractCount ? sql`
			HAVING contract_count ${COMPARATORS[contractCount[0]]}
			${Number(contractCount[1])}
		` : sql``}

		${order ? sql`
			ORDER BY ${ORDER_COLUMNS[order[0]]}
			${order[1] == "asc" ? sql`ASC` : sql`DESC`}
		`: sql``}
	`)

	procurements.forEach(function(procurement) {
		var contracts = JSON.parse(procurement.contracts).filter((c) => c.id)
		procurement.contracts = contracts.map(contractsDb.parse)
	})

	if (politicalPartyDonations) procurements.forEach(function(procurement) {
		var donations = JSON.parse(procurement.donations).filter((d) => d.date)
		procurement.donations = donations.map(donationsDb.parse)
	})

	res.render("procurements/index_page.jsx", {
		procurements,
		filters,
		order
	})
}))

exports.router.use(ID_PATH, next(function*(req, _res, next) {
	var procurement = yield procurementsDb.read(sql`
		SELECT * FROM procurements
		WHERE country= ${req.params.country} AND id = ${req.params.id}
	`)

	if (procurement == null) throw new HttpError(404)
	req.procurement = procurement
	next()
}))

exports.router.get(ID_PATH, next(function*(req, res) {
	var procurement = req.procurement

	var buyer = yield organizationsDb.read(sql`
		SELECT * FROM organizations
		WHERE country = ${procurement.buyer_country}
		AND id = ${procurement.buyer_id}
	`)

	var contracts = yield contractsDb.search(sql`
		SELECT
			contract.*,
			org.name AS seller_name,

			json_group_array(json_object(
				'date', donation.date,
				'amount', donation.amount,
				'currency', donation.currency,
				'party_name', party.name,
				'donator_country', person.country,
				'donator_id', person.id,
				'donator_name', person.name,
				'donator_role', role.role
			)) AS donations

		FROM procurement_contracts AS contract

		JOIN procurements AS procurement
		ON procurement.country = contract.procurement_country
		AND procurement.id = contract.procurement_id

		LEFT JOIN organizations AS org
		ON org.country = contract.seller_country
		AND org.id = contract.seller_id

		LEFT JOIN organization_people AS role
		ON role.organization_country = org.country
		AND role.organization_id = org.id

		LEFT JOIN people AS person
		ON person.country = role.person_country
		AND person.id = role.person_id

		LEFT JOIN political_party_donations AS donation
		ON donation.donator_normalized_name = person.normalized_name
		AND donation.donator_birthdate = person.birthdate

		AND datetime(donation.date, 'localtime') >=
			datetime(procurement.deadline_at, 'localtime', '-1 year')

		AND datetime(donation.date, 'localtime') <
			datetime(procurement.deadline_at, 'localtime')

		AND datetime(donation.date, 'localtime') >=
			datetime(role.started_at, 'localtime')

		AND datetime(donation.date, 'localtime') <
			datetime(role.ended_at, 'localtime')

		LEFT JOIN political_parties AS party ON party.id = donation.party_id

		WHERE contract.procurement_country = ${procurement.country}
		AND contract.procurement_id = ${procurement.id}
		
		GROUP BY contract.id
	`)

	contracts.forEach(function(contract) {
		var donations = JSON.parse(contract.donations).filter((d) => d.date)
		contract.donations = donations.map(donationsDb.parse)
	})

	res.render("procurements/read_page.jsx", {
		procurement,
		buyer,
		contracts
	})
}))

function parseFilters(query) {
	var filters = {}, name, value

	for (var filter in query) {
		if (filter.includes("<")) {
			[name, value] = filter.split("<")
			if (filter.endsWith("<<")) filters[name] = ["<", query[filter]]
			else if (query[filter]) filters[name] = ["<=", query[filter]]
			else if (value) filters[name] = ["<", value]
		}
		else if (filter.includes(">")) {
			[name, value] = filter.split(">")
			if (filter.endsWith(">>")) filters[name] = [">", query[filter]]
			else if (query[filter]) filters[name] = [">=", query[filter]]
			else if (value) filters[name] = [">", value]
		}
		else if (query[filter]) filters[filter] = ["=", query[filter]]
	}

	return _.filterValues(filters, (_v, name) => FILTERS.includes(name))
}

function parseOrder(query) {
	var direction = query[0] == "-" ? "desc" : "asc"
	var field = query.replace(/^[-+]/, "")
	return [field, direction]
}
