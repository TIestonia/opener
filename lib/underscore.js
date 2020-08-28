var _ = require("lodash")
var O = require("oolong")
var formatDateTime = require("date-fns/format")
var ESTONIAN_DATE = /^(\d\d)\.(\d\d)\.(\d\d\d\d)$/
var ESTONIAN_DATE_TIME = /^(\d\d)\.(\d\d)\.(\d\d\d\d) (\d\d):(\d\d):(\d\d)$/

exports.create = O.create
exports.assign = O.assign
exports.defaults = O.defaults
exports.clone = O.clone
exports.merge = O.merge
exports.each = _.each
exports.groupBy = _.groupBy
exports.map = _.map

exports.parseEstonianDate = function(date) {
	var match = ESTONIAN_DATE.exec(date)
	if (match == null) throw new SyntaxError("Invalid Date: " + date)
	return new Date(+match[3], +match[2] - 1, +match[1])
}

exports.parseEstonianDateTime = function(time) {
	var m = ESTONIAN_DATE_TIME.exec(time)
	if (m == null) throw new SyntaxError("Invalid Date-Time: " + time)
	return new Date(+m[3], +m[2] - 1, +m[1], m[4], m[5], m[6])
}

exports.formatIsoDate = function(date) {
	return formatDateTime(date, "YYYY-MM-DD")
}

exports.formatPrice = function(currency, price) {
	switch (currency) {
		case "EUR": return "€" + price.toFixed(4).replace(/00$/, "")
		default: throw new RangeError("Unsupported currency: " + currency)
	}
}

exports.formatMoney = function(currency, price) {
	var [adjustedPrice, suffix] =
		price >= 1e9 ? [price / 1e9, "B"] :
		price >= 1e6 ? [price / 1e6, "M"] :
		[price, ""]

	return exports.formatPrice(currency, adjustedPrice) + suffix
}

exports.birthdateFromPersonalId = function(id) {
	var century = +id[0]
	var decade = +id.slice(1, 3)
	var month = +id.slice(3, 5)
	var date = +id.slice(5, 7)

	switch (century) {
		case 1:
		case 2: return new Date(1800 + decade, month - 1, date)
		case 3:
		case 4: return new Date(1900 + decade, month - 1, date)
		case 5:
		case 6: return new Date(2000 + decade, month - 1, date)
		default: throw new RangeError("Invalid century: " + century)
	}
}
