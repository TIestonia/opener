var sql = require("sqlate")
var sqlite = require("root").sqlite

exports = module.exports = function() {
	beforeEach(exports.delete)
}

exports.delete = function*() {
	yield sqlite(sql`DELETE FROM procurement_contracts`)
	yield sqlite(sql`DELETE FROM procurements_fts`)
	yield sqlite(sql`DELETE FROM procurements`)
	yield sqlite(sql`DELETE FROM organizations_fts`)
	yield sqlite(sql`DELETE FROM organizations`)
}
