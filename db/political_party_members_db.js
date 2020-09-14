var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "political_party_members")
exports.idAttribute = null
exports.idColumn = null

exports.serialize = function(attrs) {
	var obj = _.clone(attrs)
	if (obj.birthdate) obj.birthdate = _.formatIsoDate(obj.birthdate)
	if (obj.joined_on) obj.joined_on = _.formatIsoDate(obj.joined_on)
	return obj
}
