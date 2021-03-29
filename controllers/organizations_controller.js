var _ = require("root/lib/underscore")
var Router = require("express").Router
var HttpError = require("standard-http-error")
var organizationsDb = require("root/db/organizations_db")
var peopleDb = require("root/db/people_db")
var orgPeopleDb = require("root/db/organization_people_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var sql = require("sqlate")
var next = require("co-next")
var ID_PATH = "/:country([A-Z][A-Z])::id"
var {parseFilters} = require("root/lib/filtering")
var {parseOrder} = require("root/lib/filtering")
var {serializeFts} = require("root/lib/filtering")
var sqlite = require("root").sqlite
var PAGE_SIZE = 200
exports.router = Router({mergeParams: true})

var FILTERS = [
	"name",
	"country",
	"person"
]

var ORDER_COLUMNS = {
	name: sql`org.name`,
	"procurements-cost": sql`procurements_cost`,
	"contracts-cost": sql`contracts_cost`
}

exports.router.get("/", next(function*(req, res) {
	var filters = parseFilters(FILTERS, req.query)
	var {name} = filters
	var {country} = filters
	var {person} = filters
	var order = req.query.order ? parseOrder(req.query.order) : null
	var limit = req.query.limit ? Number(req.query.limit) : PAGE_SIZE
	var offset = req.query.offset ? Number(req.query.offset) : 0

	var organizationsCountries = _.map(yield sqlite(sql`
		SELECT DISTINCT country FROM organizations
	`), "country")

	var organizations = yield organizationsDb.search(sql`
		SELECT
			org.country,
			org.id,
			org.name,
			COALESCE(procurements.count, 0) AS procurement_count,
			COALESCE(procurements.cost, 0) AS procurements_cost,
			COALESCE(contracts.count, 0) AS contract_count,
			COALESCE(contracts.cost, 0) AS contracts_cost,
			COUNT(org.id) OVER () AS of

			${person ? sql`,
				json_group_array(DISTINCT json_object(
					'person_id', person.id,
					'person_country', person.country,
					'person_personal_id', person.personal_id,
					'person_name', person.name,
					'role', role.role,
					'started_at', role.started_at,
					'ended_at', role.ended_at
				)) AS matched_roles
			` : sql``}

		${name ? sql`
			FROM organizations_fts AS fts
			JOIN organizations AS org ON org.rowid = fts.rowid
		` : sql`
			FROM organizations AS org
		`}

		${person ? sql`
			JOIN people_fts AS person_fts
			JOIN organization_people AS role ON role.person_id = person_fts.rowid
			JOIN people AS person ON person.id = person_fts.rowid
		` : sql``}

		LEFT JOIN (
			SELECT
				buyer_country,
				buyer_id,
				COUNT(*) AS count,
				SUM(COALESCE(cost, estimated_cost, 0)) AS cost

			FROM procurements
			GROUP BY buyer_country, buyer_id
		) AS procurements
		ON procurements.buyer_country = org.country
		AND procurements.buyer_id = org.id

		LEFT JOIN (
			SELECT
				seller_country,
				seller_id,
				COUNT(*) AS count,
				SUM(COALESCE(cost, estimated_cost, 0)) AS cost

			FROM procurement_contracts AS contract
			GROUP BY seller_country, seller_id
		) AS contracts
		ON contracts.seller_country = org.country
		AND contracts.seller_id = org.id

		WHERE 1 = 1

		${name ? sql`
			AND fts.organizations_fts MATCH ${serializeFts(name[1])}
		` : sql``}

		${person ? sql`
			AND person_fts.people_fts MATCH ${serializeFts(person[1])}
			AND org.country = role.organization_country
			AND org.id = role.organization_id
		` : sql``}

		${country && country[1] ? sql`
			AND org.country = ${country[1]}
		`: sql``}

		GROUP BY org.country, org.id

		${order ? sql`
			ORDER BY ${ORDER_COLUMNS[order[0]]}
			${order[1] == "asc" ? sql`ASC` : sql`DESC`}
		`: name ? sql`ORDER BY fts.rank` : sql`ORDER BY org.name ASC`}

		LIMIT ${limit}
		OFFSET ${offset}
	`)

	organizations.forEach(function(org) {
		org.matched_roles = org.matched_roles
			? JSON.parse(org.matched_roles).map(orgPeopleDb.parse)
			: []
	})

	res.render("organizations/index_page.jsx", {
		organizationsCountries,
		organizations,
		filters,
		order,
		limit,
		offset
	})
}))

exports.router.use(ID_PATH, next(function*(req, _res, next) {
	var organization = yield organizationsDb.read(sql`
		SELECT country, id, name, url FROM organizations
		WHERE country = ${req.params.country}
		AND id = ${req.params.id}
	`)

	if (organization == null) throw new HttpError(404)
	req.organization = organization
	next()
}))

exports.router.get(ID_PATH, next(function*(req, res) {
	var organization = req.organization

	var people = yield peopleDb.search(sql`
		SELECT
			person.*,
			party.name AS political_party_name,
			member.joined_on AS political_party_joined_on,

			json_group_array(DISTINCT json_object(
				'role', role.role,
				'started_at', role.started_at,
				'ended_at', role.ended_at
			)) AS roles

		FROM people AS person

		JOIN organization_people AS role
		ON role.organization_country = ${organization.country}
		AND role.organization_id = ${organization.id}
		AND role.person_id = person.id

		LEFT JOIN political_party_members AS member
		ON member.normalized_name = person.normalized_name
		AND member.birthdate = person.birthdate

		LEFT JOIN political_parties AS party ON party.id = member.party_id

		GROUP BY person.country, person.id
	`)

	people.forEach(function(person) {
		person.political_party_joined_on = (
			person.political_party_joined_on &&
			_.parseIsoDate(person.political_party_joined_on)
		)

		person.roles = JSON.parse(person.roles).map(orgPeopleDb.parse)
	})

	var procurements = yield procurementsDb.search(sql`
		SELECT * FROM procurements
		WHERE buyer_country = ${organization.country}
		AND buyer_id = ${organization.id}
	`)

	var procurementsWon = yield procurementsDb.search(sql`
		SELECT
			procurement.*,
			buyer.name AS buyer_name,

			json_group_array(DISTINCT json_object(
				'id', contract.id,
				'title', contract.title,
				'cost', contract.cost,
				'cost_currency', contract.cost_currency,
				'seller_country', contract.seller_country,
				'seller_id', contract.seller_id,
				'seller_name', seller.name
			)) AS contracts

		FROM procurements AS procurement

		JOIN organizations AS buyer
		ON buyer.country = procurement.buyer_country
		AND buyer.id = procurement.buyer_id

		JOIN procurement_contracts AS contract
		ON contract.procurement_country = procurement.country
		AND contract.procurement_id = procurement.id
		AND contract.seller_country = ${organization.country}
		AND contract.seller_id = ${organization.id}

		LEFT JOIN organizations AS seller
		ON seller.country = contract.seller_country
		AND seller.id = contract.seller_id

		GROUP BY procurement.country, procurement.id
	`)

	procurementsWon.forEach(function(procurement) {
		var contracts = JSON.parse(procurement.contracts).filter((c) => c.id)
		procurement.contracts = contracts.map(contractsDb.parse)
	})

	res.render("organizations/read_page.jsx", {
		organization: organization,
		people: people,
		procurements: procurements,
		procurementsWon: procurementsWon
	})
}))
