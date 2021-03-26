var _ = require("root/lib/underscore")

module.exports = function(attrs) {
	var name = attrs && attrs.name || "John Smith " + _.uniqueId()

	return _.assign({
		country: "EE",
		personal_id: attrs && attrs.id || String(_.uniqueId()),
		name: name,
		normalized_name: _.normalizeName(name)
	}, attrs)
}
