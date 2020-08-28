var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "political_party_donations")
exports.idAttribute = null
exports.idColumn = null

exports.serialize = function(attrs) {
	var obj = _.clone(attrs)

	if ("date" in obj) obj.date = _.formatIsoDate(obj.date)

	if ("donator_birthdate" in obj)
		obj.donator_birthdate = _.formatIsoDate(obj.donator_birthdate)

	return obj
}
