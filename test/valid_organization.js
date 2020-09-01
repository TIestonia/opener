var _ = require("root/lib/underscore")

module.exports = function(attrs) {
	return _.assign({
		url: null,
		business_register_data: null,
		business_register_synced_at: null
	}, attrs)
}
