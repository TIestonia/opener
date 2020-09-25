var concatStream = require("concat-stream")
var split = require("split")

exports.slurp = function(stream, encoding) {
	return new Promise(function(resolve, reject) {
		if (encoding) stream.setEncoding(encoding)
		stream.pipe(concatStream(resolve))
		stream.on("error", reject)
	})
}

exports.lines = function() {
	return split(null, null, {trailing: false})
}
