var Db = require("root/lib/db")
var sqlite = require("root").sqlite
var sql = require("sqlate")
exports = module.exports = new Db(Object, sqlite, "organizations")
exports.idAttribute = null
exports.idColumn = null

exports.reindex = function() {
	return Promise.all([
		this.execute(sql`DELETE FROM organizations_fts`),

		this.execute(sql`
			INSERT INTO organizations_fts (rowid, country, id, name)
			SELECT rowid, country, id, name
			FROM organizations;
		`)
	])
}
