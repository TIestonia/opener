var _ = require("root/lib/underscore")
var Router = require("express").Router
var HttpError = require("standard-http-error")
var DateFns = require("date-fns")
var procurementsDb = require("root/db/procurements_db")
var organizationsDb = require("root/db/organizations_db")
var contractsDb = require("root/db/procurement_contracts_db")
var donationsDb = require("root/db/political_party_donations_db")
var peopleDb = require("root/db/organization_people_db")
var sql = require("sqlate")
var next = require("co-next")
var {parseFilters} = require("root/lib/filtering")
var {parseOrder} = require("root/lib/filtering")
var {serializeFts} = require("root/lib/filtering")
var ID_PATH = "/:country([A-Z][A-Z])::id"
var COMPARATORS = require("root/lib/filtering").COMPARATOR_SQL
var PAGE_SIZE = 500
exports.router = Router({mergeParams: true})

var FILTERS = [
	"text",
	"country",
	"published-since",
	"published-until",
	"bidder-count",
	"contract-count",
	"bidding-duration",
	"cost",
	"procedure-type",
	"political-party-donations",
	"buyer",
	"seller"
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
	var filters = parseFilters(FILTERS, req.query)
	var {text} = filters
	var {country} = filters
	var publishedSince = filters["published-since"]
	var publishedUntil = filters["published-until"]
	var bidderCount = filters["bidder-count"]
	var contractCount = filters["contract-count"]
	var biddingDuration = filters["bidding-duration"]
	var procedureType = filters["procedure-type"]
	var {cost} = filters
	var politicalPartyDonations = filters["political-party-donations"]
	var {buyer} = filters
	var {seller} = filters
	var order = req.query.order ? parseOrder(req.query.order) : null
	var limit = req.query.limit ? Number(req.query.limit) : PAGE_SIZE
	var offset = req.query.offset ? Number(req.query.offset) : 0

	var procurements = yield procurementsDb.search(sql`
		SELECT
			procurement.*,
			buyer.name AS buyer_name,

			julianday(procurement.deadline_at, 'localtime') -
			julianday(procurement.published_at, 'localtime') AS bidding_duration,

			COUNT(DISTINCT contract.id) AS contract_count,

			COUNT(procurement.id) OVER () AS of,

			json_group_array(DISTINCT json_object(
				'id', contract.id,
				'title', contract.title,
				'cost', contract.cost,
				'cost_currency', contract.cost_currency,
				'seller_country', contract.seller_country,
				'seller_id', contract.seller_id,
				'seller_name', seller.name

				${seller ? sql`, 'seller_matched', (
					contract.seller_country = filtered_seller_fts.country AND
					contract.seller_id = filtered_seller_fts.id
				)` : sql``}
			)) AS contracts

			${politicalPartyDonations ? sql`,
				json_group_array(DISTINCT json_object(
					'date', donation.date,
					'amount', donation.amount,
					'currency', donation.currency,
					'party_name', donation_party.name,
					'donator_id', donator.id,
					'donator_country', donator.country,
					'donator_personal_id', donator.personal_id,
					'donator_name', donator.name,
					'donator_role', seller_role.role
				)) AS donations
			` : sql``}

		-- It seems faster to have the FTS table in FROM than JOIN.
		${text ? sql`
			FROM procurements_fts AS fts
			JOIN procurements AS procurement
		` : buyer ? sql`
			FROM organizations_fts AS buyer_fts
			JOIN procurements AS procurement
		` : seller ? sql`
			FROM organizations_fts AS filtered_seller_fts
			JOIN procurements AS procurement
		` : sql`
			FROM procurements AS procurement
		`}

		${buyer && text ? sql`JOIN organizations_fts AS buyer_fts` : sql``}

		${seller && (text || buyer) ? sql`
			JOIN organizations_fts AS filtered_seller_fts
		` : sql``}

		${seller ? sql`
			JOIN procurement_contracts AS filtered_seller_contract
			ON filtered_seller_contract.seller_country = filtered_seller_fts.country
			AND filtered_seller_contract.seller_id = filtered_seller_fts.id
		` : sql``}

		JOIN organizations AS buyer
		ON buyer.country = procurement.buyer_country
		AND buyer.id = procurement.buyer_id

		LEFT JOIN procurement_contracts AS contract
		ON contract.procurement_country = procurement.country
		AND contract.procurement_id = procurement.id

		LEFT JOIN organizations AS seller
		ON seller.country = contract.seller_country
		AND seller.id = contract.seller_id

		${politicalPartyDonations ? sql`
			JOIN organization_people AS seller_role
			ON seller_role.organization_country = seller.country
			AND seller_role.organization_id = seller.id

			AND datetime(seller_role.started_at, 'localtime') <
				datetime(procurement.deadline_at, 'localtime', '+1 year')

			AND (
				seller_role.ended_at IS NULL OR
				datetime(seller_role.ended_at, 'localtime') >
				datetime(procurement.published_at, 'localtime', '-1 year')
			)

			JOIN people AS donator ON donator.id = seller_role.person_id

			JOIN political_party_donations AS donation
			ON donation.donator_normalized_name = donator.normalized_name
			AND donation.donator_birthdate = donator.birthdate

			AND (
				procurement.country != 'EE' OR
				donation.party_id = buyer_party_member.party_id
			)

			AND datetime(procurement.published_at, 'localtime', ${
				"-" + Number(politicalPartyDonations[1]) + " months"
			}) ${COMPARATORS[politicalPartyDonations[0]]}
				datetime(donation.date, 'localtime')

			AND datetime(donation.date, 'localtime')
				${COMPARATORS[politicalPartyDonations[0]]}
				datetime(procurement.deadline_at, 'localtime', ${
					"+" + Number(politicalPartyDonations[1]) + " months"
				})

			JOIN political_parties AS donation_party
			ON donation_party.id = donation.party_id

			LEFT JOIN organization_people AS buyer_role
			ON buyer_role.organization_country = buyer.country
			AND buyer_role.organization_id = buyer.id

			AND datetime(buyer_role.started_at, 'localtime') <
				datetime(procurement.deadline_at, 'localtime', '+1 year')

			AND (
				buyer_role.ended_at IS NULL OR
				datetime(buyer_role.ended_at, 'localtime') >
				datetime(procurement.published_at, 'localtime', '-1 year')
			)

			LEFT JOIN people AS buyer_person
			ON buyer_person.id = buyer_role.person_id

			LEFT JOIN political_party_members AS buyer_party_member
			ON buyer_party_member.normalized_name = buyer_person.normalized_name
			AND buyer_party_member.birthdate = buyer_person.birthdate
		` : sql``}

		WHERE 1 = 1

		${text ? sql`
			AND fts.procurements_fts MATCH ${serializeFts(text[1])}
			AND procurement.rowid = fts.rowid
		` : sql``}

		${buyer ? sql`
			AND buyer_fts.organizations_fts MATCH ${serializeFts(buyer[1])}
			AND procurement.buyer_country = buyer_fts.country
			AND procurement.buyer_id = buyer_fts.id
		` : sql``}

		${seller ? sql`
			AND filtered_seller_fts.organizations_fts MATCH ${serializeFts(seller[1])}
			AND procurement.country = filtered_seller_contract.procurement_country
			AND procurement.id = filtered_seller_contract.procurement_id
		` : sql``}

		${country ? sql`
			AND procurement.country = ${country[1]}
		`: sql``}

		${publishedSince && publishedSince[1] ? sql`
			AND procurement.published_at >= ${DateFns.startOfDay(publishedSince[1])}
		`: sql``}

		${publishedUntil && publishedUntil[1] ? sql`
			AND procurement.published_at <= ${DateFns.endOfDay(publishedUntil[1])}
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

		${cost ? sql`
			AND procurement.cost ${COMPARATORS[cost[0]]}
			${Number(cost[1])}`
		: sql``}

		GROUP BY procurement.country, procurement.id

		${contractCount ? sql`
			HAVING contract_count ${COMPARATORS[contractCount[0]]}
			${Number(contractCount[1])}
		` : sql``}

		${order ? sql`
			ORDER BY ${ORDER_COLUMNS[order[0]]}
			${order[1] == "asc" ? sql`ASC` : sql`DESC`}
		`: text ? sql`ORDER BY fts.rank` : sql``}

		LIMIT ${limit}
		OFFSET ${offset}
	`)

	procurements.forEach(function(procurement) {
		var contracts = JSON.parse(procurement.contracts).filter((c) => c.id)
		procurement.contracts = contracts.map(contractsDb.parse)
	})

	if (politicalPartyDonations) procurements.forEach(function(procurement) {
		var donations = JSON.parse(procurement.donations).filter((d) => d.date)
		donations = donations.map(donationsDb.parse)
		procurement.donations = _.sortBy(donations, "date")
	})

	res.render("procurements/index_page.jsx", {
		procurements,
		filters,
		order,
		limit,
		offset
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
		SELECT
			org.*,

			json_group_array(DISTINCT json_object(
				'id', person.id,
				'country', person.country,
				'personal_id', person.personal_id,
				'name', person.name,
				'role', role.role,
				'party_id', party.id,
				'party_name', party.name
			)) AS people

		FROM organizations AS org

		LEFT JOIN organization_people AS role
		ON role.organization_country = org.country
		AND role.organization_id = org.id

		AND datetime(role.started_at, 'localtime') <
			datetime(${procurement.deadline_at}, 'localtime', '+1 year')

		AND (
			role.ended_at IS NULL OR
			datetime(role.ended_at, 'localtime') >
			datetime(${procurement.published_at}, 'localtime', '-1 year')
		)

		LEFT JOIN people AS person ON person.id = role.person_id

		LEFT JOIN political_party_members AS party_member
		ON party_member.normalized_name = person.normalized_name
		AND party_member.birthdate = person.birthdate

		LEFT JOIN political_parties AS party
		ON party.id = party_member.party_id

		WHERE org.country = ${procurement.buyer_country}
		AND org.id = ${procurement.buyer_id}
	`)

	buyer.people = JSON.parse(buyer.people).filter((p) => p.id)

	var sellers = yield organizationsDb.search(sql`
		SELECT
			seller.country,
			seller.id,
			seller.name,

			json_group_array(DISTINCT json_object(
				'id', seller_person.id,
				'country', seller_person.country,
				'personal_id', seller_person.personal_id,
				'name', seller_person.name,
				'party_id', seller_party.id,
				'party_name', seller_party.name
			)) AS people,

			json_group_array(DISTINCT json_object(
				'date', donation.date,
				'amount', donation.amount,
				'currency', donation.currency,
				'party_id', donation.party_id,
				'party_name', donation_party.name,
				'donator_id', seller_person.id,
				'donator_country', seller_person.country,
				'donator_personal_id', seller_person.personal_id,
				'donator_name', seller_person.name,
				'donator_role', seller_role.role
			)) AS donations

		FROM organizations AS seller

		JOIN procurement_contracts AS contract
		ON contract.seller_country = seller.country
		AND contract.seller_id = seller.id
		AND contract.procurement_country = ${procurement.country}
		AND contract.procurement_id = ${procurement.id}

		JOIN procurements AS procurement
		ON procurement.country = contract.procurement_country
		AND procurement.id = contract.procurement_id

		LEFT JOIN organization_people AS seller_role
		ON seller_role.organization_country = seller.country
		AND seller_role.organization_id = seller.id

		AND datetime(seller_role.started_at, 'localtime') <
			datetime(procurement.deadline_at, 'localtime', '+1 year')

		AND (
			seller_role.ended_at IS NULL OR
			datetime(seller_role.ended_at, 'localtime') >
			datetime(procurement.published_at, 'localtime', '-1 year')
		)

		LEFT JOIN people AS seller_person
		ON seller_person.id = seller_role.person_id

		LEFT JOIN political_party_members AS seller_party_member
		ON seller_party_member.normalized_name = seller_person.normalized_name
		AND seller_party_member.birthdate = seller_person.birthdate

		LEFT JOIN political_parties AS seller_party
		ON seller_party.id = seller_party_member.party_id

		LEFT JOIN political_party_donations AS donation
		ON donation.donator_normalized_name = seller_person.normalized_name
		AND donation.donator_birthdate = seller_person.birthdate

		AND datetime(donation.date, 'localtime') >=
			datetime(procurement.published_at, 'localtime', '-1 year')

		AND datetime(donation.date, 'localtime') <
			datetime(procurement.deadline_at, 'localtime', '+1 year')

		LEFT JOIN political_parties AS donation_party
		ON donation_party.id = donation.party_id
		
		GROUP BY seller.id
	`)

	sellers.forEach(function(seller) {
		var people = JSON.parse(seller.people).filter((p) => p.id)
		seller.people = people.map(peopleDb.parse)

		var donations = JSON.parse(seller.donations).filter((d) => d.date)
		seller.donations = _.sortBy(donations.map(donationsDb.parse), "date")
	})

	var contracts = yield contractsDb.search(sql`
		SELECT contract.*
		FROM procurement_contracts AS contract
		WHERE contract.procurement_country = ${procurement.country}
		AND contract.procurement_id = ${procurement.id}
	`)

	res.render("procurements/read_page.jsx", {
		procurement,
		buyer,
		contracts,
		sellers
	})
}))
