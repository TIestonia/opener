var _ = require("root/lib/underscore")

module.exports = function(attrs) {
	return _.assign({
		country: "EE",
		id: attrs && attrs.id || String(_.uniqueId()),
		name: attrs && attrs.name || "Company " + _.uniqueId(),
		url: null,
		business_register_data: null,
		business_register_synced_at: null
	}, attrs)
}
