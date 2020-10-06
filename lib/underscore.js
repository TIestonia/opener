var _ = require("lodash")
var O = require("oolong")
var formatDateTime = require("date-fns/format")
var ISO8601_DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/
var ESTONIAN_DATE = /^(\d\d)\.(\d\d)\.(\d\d\d\d)$/
var ESTONIAN_DATE_TIME = /^(\d\d)\.(\d\d)\.(\d\d\d\d) (\d\d):(\d\d):(\d\d)$/

exports.create = O.create
exports.assign = O.assign
exports.defaults = O.defaults
exports.clone = O.clone
exports.merge = O.merge
exports.keys = O.keys
exports.mapKeys = O.mapKeys
exports.mapValues = O.map
exports.filterValues = O.filter
exports.each = _.each
exports.groupBy = _.groupBy
exports.indexBy = _.keyBy
exports.countBy = _.countBy
exports.map = _.map
exports.isEmpty = O.isEmpty
exports.escapeHtml = _.escape
exports.findLast = _.findLast
exports.find = _.find
exports.chunk = _.chunk
exports.reduce = _.reduce
exports.last = _.last
exports.uniq = _.uniq
exports.uniqBy = _.uniqBy
exports.uniqueId = _.uniqueId
exports.sortBy = _.sortBy
exports.partition = _.partition
exports.times = _.times
exports.wrap = _.wrap
exports.add = function(a, b) { return a + b }
exports.sub = function(a, b) { return a - b }
exports.sum = function(array) { return array.reduce(exports.add, 0) }
exports.second = function(array) { return array[1] }
exports.id = function(value) { return value }

exports.parseIsoDate = function(date) {
	var match = ISO8601_DATE.exec(date)
	if (match == null) throw new SyntaxError("Invalid Date: " + date)
	return new Date(+match[1], +match[2] - 1, +match[3])
}

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

exports.formatDate = function(format, date) {
	switch (format) {
		case "us": return formatDateTime(date, "MMM D, YYYY")
		default: throw new RangeError("Invalid format: " + format)
	}
}

exports.formatDateTime = function(format, time) {
	switch (format) {
		case "us": return formatDateTime(time, "MMM D, YYYY h:mma")
		default: throw new RangeError("Invalid format: " + format)
	}
}

exports.formatIsoDate = function(date) {
	return formatDateTime(date, "YYYY-MM-DD")
}

exports.formatPrice = function(currency, price) {
	switch (currency) {
		case "EUR": return "€" + fmt(price)
		default: throw new RangeError("Unsupported currency: " + currency)
	}

	function fmt(n) {
		var [int, fraction] = n.toFixed(2).split(".")

		int = int.slice(0, int.length % 3 || 3) + (
			int.slice(int.length % 3 || 3).replace(/.../g, ",$&")
		)

		return fraction == "00" ? int : int + "." + fraction
	}
}

exports.formatMoney = function(currency, price) {
	var [adjustedPrice, suffix] =
		price >= 1e9 ? [price / 1e9, "B"] :
		price >= 1e6 ? [price / 1e6, "M"] :
		[price, ""]

	return exports.formatPrice(currency, adjustedPrice) + suffix
}

exports.birthdateFromEstonianPersonalId = function(id) {
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
		default: throw new RangeError("Invalid century: " + id)
	}
}

exports.birthdateFromLatvianPersonalId = function(id) {
	id = id.replace(/-/, "")
	var century = +id[6]
	var decade = +id.slice(4, 6)
	var month = +id.slice(2, 4)
	var date = +id.slice(0, 2)

	switch (century) {
		case 0: return new Date(1800 + decade, month - 1, date)
		case 1: return new Date(1900 + decade, month - 1, date)
		case 2: return new Date(2000 + decade, month - 1, date)
		default: throw new RangeError("Invalid century: " + id)
	}
}

exports.sexFromPersonalId = function(id) {
	switch (+id[0]) {
		case 1:
		case 3:
		case 5: return "male"
		case 2:
		case 4:
		case 6: return "female"
		default: throw new RangeError("Invalid century: " + +id[0])
	}
}

exports.normalizeName = function(name) {
	return name.toLowerCase()
}

exports.plural = function(n, singular, plural) {
	return n == 1 ? singular : plural
}

exports.intercalate = function(array, elem) {
	if (array.length < 2) return array
	var output = new Array(array.length + array.length - 1)
	output.push(array[0])
	for (var i = 1; i < array.length; ++i) output.push(elem, array[i])
	return output
}

exports.groupAdjacent = function(array, fn) {
	if (array.length == 0) return []
	if (array.length == 1) return [array]

	var grouped = [[array[0]]]

	for (var i = 1; i < array.length; ++i) {
		if (fn(array[i - 1], array[i])) _.last(grouped).push(array[i])
		else grouped.push([array[i]])
	}

	return grouped
}

exports.asArray = function(value) {
	return value instanceof Array ? value : [value]
}
