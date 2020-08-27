var Router = require("express").Router
var HttpError = require("standard-http-error")
var organizationsDb = require("root/db/organizations_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var sql = require("sqlate")
var next = require("co-next")
var ID_PATH = "/:country([A-Z][A-Z])::id"

exports.router = Router({mergeParams: true})

exports.router.get("/", next(function*(_req, res) {
	var organizations = yield organizationsDb.search(sql`
		SELECT
			org.*,
			COUNT(procurement.id) AS procurement_count,
			COUNT(contract.id) AS contract_count

		FROM organizations AS org

		LEFT JOIN procurements AS procurement
		ON procurement.buyer_country = org.country
		AND procurement.buyer_id = org.id

		LEFT JOIN procurement_contracts AS contract
		ON contract.seller_country = org.country
		AND contract.seller_id = org.id

		GROUP BY org.id
	`)

	res.render("organizations/index_page.jsx", {organizations: organizations})
}))

exports.router.use(ID_PATH, next(function*(req, _res, next) {
	var organization = yield organizationsDb.read(sql`
		SELECT * FROM organizations
		WHERE country = ${req.params.country}
		AND id = ${req.params.id}
	`)

	if (organization == null) throw new HttpError(404)
	req.organization = organization
	next()
}))

exports.router.get(ID_PATH, next(function*(req, res) {
	var organization = req.organization

	var procurements = yield procurementsDb.search(sql`
		SELECT * FROM procurements
		WHERE buyer_country = ${organization.country}
		AND buyer_id = ${organization.id}
	`)

	var contracts = yield contractsDb.search(sql`
		SELECT contract.*, procurement.title AS procurement_title
		FROM procurement_contracts AS contract

		JOIN procurements AS procurement
		ON procurement.id = contract.procurement_id

		WHERE contract.seller_country = ${organization.country}
		AND contract.seller_id = ${organization.id}
	`)

	res.render("organizations/read_page.jsx", {
		organization: organization,
		procurements: procurements,
		contracts: contracts
	})
}))
