var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "procurements")
exports.idAttribute = null
exports.idColumn = null

exports.parse = function(attrs) {
	return _.defaults({
		published_at: attrs.published_at && new Date(attrs.published_at),
		deadline_at: attrs.deadline_at && new Date(attrs.deadline_at),
		revealed_at: attrs.revealed_at && new Date(attrs.revealed_at)
	}, attrs)
}
