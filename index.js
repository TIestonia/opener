var Fs = require("fs")
var lazy = require("lazy-object").defineLazyProperty
var ENV = process.env.ENV

lazy(exports, "sqlite", function() {
	var connect = require("root/lib/sqlite")

	switch (ENV) {
		case "test":
			var sqlite = connect(":memory:")
			var sql = require("sqlate")
			sqlite.batch(String(Fs.readFileSync(__dirname + "/db/schema.sql")))
			sqlite(sql`PRAGMA foreign_keys = ON`) // Schema resets foreign_keys.
			return sqlite

		default: return connect(__dirname + "/config/" + ENV + ".sqlite3")
	}
})
