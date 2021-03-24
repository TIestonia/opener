var Http = require("http")
var Web = require("root/bin/web")
var fetchDefaults = require("fetch-defaults")
var {wait} = require("root/lib/promise")

var request = require("fetch-off")
request = require("fetch-parse")(request, {"text/html": true})
request = require("root/lib/fetch/fetch_nodeify")(request)

exports = module.exports = function() {
	before(exports.listen)
	after(exports.close)
}

exports.listen = function*() {
	this.server = new Http.Server(Web)
	this.server.listen(0, "127.0.0.1")
	yield wait(this.server, "listening")

	this.url = "http://localhost:" + this.server.address().port
	this.request = fetchDefaults(request, this.url)
}

exports.close = function(done) {
	this.server.close(done)
}
