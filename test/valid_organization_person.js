var _ = require("root/lib/underscore")

module.exports = function(attrs) {
	return _.assign({
		role: "executive_board_member",
		started_at: new Date
	}, attrs)
}
