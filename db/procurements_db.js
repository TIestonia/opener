var _ = require("root/lib/underscore")
var Db = require("root/lib/db")
var sqlite = require("root").sqlite
var sql = require("sqlate")
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

exports.reindex = function() {
	return Promise.all([
		this.execute(sql`DELETE FROM procurements_fts`),

		this.execute(sql`
			INSERT INTO procurements_fts (
				rowid,
				title,
				description,
				contract_titles
			)
			SELECT
				procurement.rowid,
				procurement.title,
				procurement.description,
				group_concat(contract.title || ' ' || contract.id, char(10))

			FROM procurements AS procurement

			LEFT JOIN procurement_contracts AS contract
			ON contract.procurement_country = procurement.country
			AND contract.procurement_id = procurement.id

			GROUP BY procurement.country, procurement.id;
		`)
	])
}
