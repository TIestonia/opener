var encode = encodeURIComponent

exports.procurementPath = function(procurement) {
	return "/procurements/" + procurement.country + ":" + encode(procurement.id)
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
	if (person.country && person.personal_id)
		return "/people/" + person.country + ":" + person.personal_id
	else
		return "/people/" + person.id
}
