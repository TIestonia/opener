var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "organization_people")
exports.idAttribute = null
exports.idColumn = null

exports.parse = function(attrs) {
	return _.defaults({
		started_at: attrs.started_at && new Date(attrs.started_at),
		ended_at: attrs.ended_at && new Date(attrs.ended_at)
	}, attrs)
}
