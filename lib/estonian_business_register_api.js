var HttpAgent = require("https").Agent
var fetch = require("fetch-off")
var URL = "https://ariregxmlv6.rik.ee"

var api = require("fetch-defaults")(fetch, URL, {
	timeout: 10000,
	headers: {Accept: "application/soap+xml"},

	agent: process.env.ENV === "test" ? null : new HttpAgent({
		keepAlive: true,
		keepAliveMsecs: 10000,
		maxSockets: 4
	})
})

api = require("fetch-parse")(api, {xml: true})
api = require("fetch-throw")(api)
module.exports = api
