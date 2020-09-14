var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "political_party_donations")
exports.idAttribute = null
exports.idColumn = null

exports.parse = function(attrs) {
	return _.defaults({
		donator_birthdate: attrs.donator_birthdate &&
			_.parseIsoDate(attrs.donator_birthdate)
	}, attrs)
}

exports.serialize = function(attrs) {
	var obj = _.clone(attrs)

	if (obj.date) obj.date = _.formatIsoDate(obj.date)

	if (obj.donator_birthdate)
		obj.donator_birthdate = _.formatIsoDate(obj.donator_birthdate)

	return obj
}
