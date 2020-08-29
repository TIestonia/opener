exports.procurementPath = function(procurement) {
	return "/procurements/" + procurement.country + ":" + procurement.id
}

exports.contractPath = function(contract) {
	return exports.procurementPath({
		country: contract.procurement_country,
		id: contract.procurement_id
	}) + "#contract-" + contract.id
}

exports.organizationPath = function(organization) {
	return "/organizations/" + organization.country + ":" + organization.id
}

exports.personPath = function(person) {
	return "/people/" + person.country + ":" + person.id
}
