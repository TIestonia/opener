var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "people")
exports.idAttribute = null
exports.idColumn = null

exports.parse = function(attrs) {
	return _.defaults({
		birthdate: attrs.birthdate && _.parseIsoDate(attrs.birthdate)
	}, attrs)
}

exports.serialize = function(attrs) {
	var obj = _.clone(attrs)
	if (obj.birthdate) obj.birthdate = _.formatIsoDate(obj.birthdate)
	return obj
}
