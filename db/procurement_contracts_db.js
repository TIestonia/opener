var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "procurement_contracts")
exports.idAttribute = null
exports.idColumn = null

exports.parse = function(attrs) {
	return _.defaults({
		created_at: attrs.created_at && new Date(attrs.created_at),
		ends_at: attrs.ends_at && new Date(attrs.ends_at),
		deadline_at: attrs.deadline_at && new Date(attrs.deadline_at)
	}, attrs)
}
