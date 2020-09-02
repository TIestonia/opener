var Hugml = require("hugml")

var hugml = new Hugml({
	"http://schemas.xmlsoap.org/soap/envelope/": "soap",
	"http://arireg.x-road.eu/producer/": ""
})

exports.parse = hugml.parse.bind(hugml)
exports.serialize = hugml.stringify.bind(hugml)
