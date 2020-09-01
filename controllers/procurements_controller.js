var Router = require("express").Router
var HttpError = require("standard-http-error")
var procurementsDb = require("root/db/procurements_db")
var organizationsDb = require("root/db/organizations_db")
var contractsDb = require("root/db/procurement_contracts_db")
var sql = require("sqlate")
var next = require("co-next")
var ID_PATH = "/:country([A-Z][A-Z])::id"
exports.router = Router({mergeParams: true})

exports.router.get("/", next(function*(req, res) {
	var filters = parseFilters(req.query)
	var bidderCount = filters["bidder-count"]
	var contractCount = filters["contract-count"]
	var biddingDuration = filters["bidding-duration"]
	var procedureType = filters["process-type"]

	var procurements = yield procurementsDb.search(sql`
		SELECT
			procurement.*,
			buyer.name AS buyer_name,
			COUNT(contract.id) AS contract_count,

			julianday(procurement.deadline_at, 'localtime') -
			julianday(procurement.published_at, 'localtime') AS bidding_duration

		FROM procurements AS procurement

		JOIN organizations AS buyer
		ON buyer.country = procurement.buyer_country
		AND buyer.id = procurement.buyer_id

		LEFT JOIN procurement_contracts AS contract
		ON procurement_id = procurement.id

		WHERE 1 = 1

		${procedureType != null ? sql`
			AND procedure_type = ${procedureType[1]}
		`: sql``}

		${bidderCount != null ? sql`
			AND bidder_count ${bidderCount[0]} ${Number(bidderCount[1])}`
		: sql``}

		${biddingDuration != null ? sql`
			AND bidding_duration ${biddingDuration[0]}
			${Number(biddingDuration[1].replace(/d$/, ""))}`
		: sql``}

		GROUP BY procurement.id

		${contractCount != null ? sql`
			HAVING contract_count ${contractCount[0]} ${Number(contractCount[1])}
		` : sql``}
	`)

	res.render("procurements/index_page.jsx", {
		procurements,
		procedureTypeFilter: procedureType && procedureType[1],
		bidderCountFilter: bidderCount && bidderCount[1]
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
				'donator_name', person.name,
				'amount', donation.amount,
				'currency', donation.currency,
				'party_name', party.name
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
		contract.donations = JSON.parse(contract.donations).filter((d) => d.date)
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
			if (query[filter]) filters[name] = [sql`<=`, query[filter]]
			else if (value) filters[name] = [sql`<`, value]
		}
		else if (filter.includes(">")) {
			[name, value] = filter.split(">")
			if (query[filter]) filters[name] = [sql`>=`, query[filter]]
			else if (value) filters[name] = [sql`>`, value]
		}
		else if (query[filter]) filters[filter] = [sql`=`, query[filter]]
	}

	return filters
}
