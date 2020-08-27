exports.procurementPath = function(procurement) {
	return "/procurements/" + procurement.country + ":" + procurement.id
}

exports.organizationPath = function(organization) {
	return "/organizations/" + organization.country + ":" + organization.id
}
