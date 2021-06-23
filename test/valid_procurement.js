var _ = require("root/lib/underscore")

module.exports = function(attrs) {
	return _.assign({
		country: "EE",
		id: attrs && attrs.id || String(_.uniqueId()),
		origin: "csv",
		published_at: new Date,
		bid_count: 0,
		bidder_count: 0,
		procedure_type: "open",
		description: "",
		cost: null,
		cost_currency: null,
		estimated_cost: null,
		estimated_cost_currency: null,
		dispute_count: 0,
		revealed_at: null
	}, attrs)
}
