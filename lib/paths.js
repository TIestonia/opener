exports.procurementPath = function(procurement) {
	return "/procurements/" + procurement.country + ":" + procurement.id
}

exports.organizationPath = function(organization) {
	return "/organizations/" + organization.country + ":" + organization.id
}

exports.personPath = function(person) {
	return "/people/" + person.country + ":" + person.id
}
