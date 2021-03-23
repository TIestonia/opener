var _ = require("root/lib/underscore")
var sql = require("sqlate")
exports.suffixComparator = suffixComparator

exports.COMPARATOR_SQL = {
	"<": sql`<`,
	"<=": sql`<=`,
	"=": sql`=`,
	">=": sql`>=`,
	">": sql`>`
}

var COMPARATOR_SUFFIXES = exports.COMPARATOR_SUFFIXES = {
	"=": "",
	"<": "<<",
	"<=": "<",
	">=": ">",
	">": ">>"
}

exports.parseOrder = function(query) {
	var direction = query[0] == "-" ? "desc" : "asc"
	var field = query.replace(/^[-+]/, "")
	return [field, direction]
}

exports.serializeFiltersQuery = function(filters) {
	return _.mapValues(
		_.mapKeys(filters, (name, filter) => name + suffixComparator(filter)),
		_.second
	)
}

exports.parseFilters = function(allowedFilters, query) {
	var filters = {}, name, value

	for (var filter in query) {
		if (filter.includes("<")) {
			[name, value] = filter.split("<")
			if (filter.endsWith("<<")) filters[name] = ["<", query[filter]]
			else if (query[filter]) filters[name] = ["<=", query[filter]]
			else if (value) filters[name] = ["<", value]
		}
		else if (filter.includes(">")) {
			[name, value] = filter.split(">")
			if (filter.endsWith(">>")) filters[name] = [">", query[filter]]
			else if (query[filter]) filters[name] = [">=", query[filter]]
			else if (value) filters[name] = [">", value]
		}
		else if (query[filter]) filters[filter] = ["=", query[filter]]
	}

	return _.filterValues(filters, (_v, name) => allowedFilters.includes(name))
}

exports.serializeFts = function(query) {
	var words = query.split(/\s+/g)
	words = words.map((word) => "\"" + word.replace(/"/g, "\"\"") + "\"")
	return words.join(" ")
}

function suffixComparator(filter) {
	return filter ? COMPARATOR_SUFFIXES[filter[0]] : ""
}
