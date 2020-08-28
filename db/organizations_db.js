var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "organizations")
exports.idAttribute = null
exports.idColumn = null

exports.serialize = function(attrs) {
	var obj = _.clone(attrs)

	if ("business_register_data" in obj)
		obj.business_register_data = JSON.stringify(obj.business_register_data)

	return obj
}
