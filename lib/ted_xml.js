var _ = require("./underscore")
var Hugml = require("hugml")
var outdent = require("./outdent")
var NS = "http://publications.europa.eu/resource/schema/ted/R2.0.9/reception"
exports.NAMESPACE = NS

var hugml = new Hugml({
	[NS]: "",
	"http://publications.europa.eu/resource/schema/ted/2016/nuts": "nuts"
})

exports.parse = hugml.parse.bind(hugml)

exports.xml = function(_strings) {
	for (var i = 1, a = arguments; i < a.length; ++i) a[i] = _.escapeHtml(a[i])
	var xml = outdent.apply(this, arguments)

	return outdent`
		<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
		<OPEN-DATA>${xml}</OPEN-DATA>
	`
}
