var _ = require("root/lib/underscore")

module.exports = function(attrs) {
	return _.assign({
		nr: attrs && attrs.nr || String(_.uniqueId()),
		title: attrs && attrs.name || "Procurement " + _.uniqueId(),
		seller_country: null,
		seller_id: null,
		deadline_at: null,
		ends_at: null,
		cost: null,
		cost_currency: null,
		estimated_cost: null,
		estimated_cost_currency: null
	}, attrs)
}
