var Router = require("express").Router
var contractsDb = require("root/db/procurement_contracts_db")
var next = require("co-next")
var sql = require("sqlate")

exports.router = Router({mergeParams: true})

exports.router.get("/", next(function*(_req, res) {
	var contracts = yield contractsDb.search(sql`
		SELECT
			contract.*,
			procurement.title AS procurement_title,
			buyer.name AS buyer_name,
			seller.name AS seller_name

		FROM procurement_contracts AS contract

		JOIN procurements AS procurement
		ON procurement.country = contract.procurement_country
		AND procurement.id = contract.procurement_id

		JOIN organizations AS buyer
		ON buyer.country = procurement.buyer_country
		AND buyer.id = procurement.buyer_id

		LEFT JOIN organizations AS seller
		ON seller.country = contract.seller_country
		AND seller.id = contract.seller_id
	`)

	res.render("procurement_contracts/index_page.jsx", {
		contracts: contracts
	})
}))

exports.router.get("/after-donation", next(function*(_req, res) {
	var contracts = yield contractsDb.search(sql`
		SELECT
			contract.*,
			procurement.title AS procurement_title,
			buyer.name AS buyer_name,
			seller.country AS seller_country,
			seller.id AS seller_id,
			seller.name AS seller_name,

			json_group_array(json_object(
				'date', donation.date,
				'donator_name', person.name,
				'amount', donation.amount,
				'currency', donation.currency,
				'party_name', party.name
			)) AS donations

		FROM political_party_donations AS donation

		JOIN people AS person
		ON person.normalized_name = donation.donator_normalized_name
		AND person.birthdate = donation.donator_birthdate

		JOIN organization_people AS role
		ON role.person_country = person.country
		AND role.person_id = person.id

		JOIN procurement_contracts AS contract
		ON contract.seller_country = role.organization_country
		AND contract.seller_id = role.organization_id

		JOIN procurements AS procurement
		ON procurement.country = contract.procurement_country
		AND procurement.id = contract.procurement_id

		JOIN organizations AS buyer
		ON buyer.country = procurement.buyer_country
		AND buyer.id = procurement.buyer_id

		LEFT JOIN organizations AS seller
		ON seller.country = contract.seller_country
		AND seller.id = contract.seller_id

		JOIN political_parties AS party ON party.id = donation.party_id

		WHERE datetime(donation.date, 'localtime') >=
			datetime(procurement.deadline_at, 'localtime', '-1 year')

		AND datetime(donation.date, 'localtime') <
			datetime(procurement.deadline_at, 'localtime')

		AND datetime(donation.date, 'localtime') >=
			datetime(role.started_at, 'localtime')

		AND datetime(donation.date, 'localtime') <
			datetime(role.ended_at, 'localtime')

		GROUP BY contract.id
	`)

	contracts.forEach(function(contract) {
		contract.donations = JSON.parse(contract.donations)
	})

	res.render("procurement_contracts/after_donations_page.jsx", {
		contracts: contracts
	})
}))
