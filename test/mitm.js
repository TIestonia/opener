var Mitm = require("mitm")

exports = module.exports = function() {
	beforeEach(exports.listen)
	afterEach(exports.close)
}

exports.listen = function() {
	this.mitm = Mitm()
}

exports.close = function() {
	this.mitm.disable()
}
