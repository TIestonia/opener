var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
exports = module.exports = new Db(Object, sqlite, "organization_people")
exports.idAttribute = null
exports.idColumn = null

exports.parse = function(attrs) {
	return _.defaults({
		started_at: attrs.started_at && new Date(attrs.started_at),
		ended_at: attrs.ended_at && new Date(attrs.ended_at),

		person_birthdate: attrs.person_birthdate &&
			_.parseIsoDate(attrs.person_birthdate),
	}, attrs)
}

exports.serialize = function(attrs) {
	var obj = _.clone(attrs)

	if (obj.person_birthdate)
		obj.person_birthdate = _.formatIsoDate(obj.person_birthdate)

	return obj
}
