var _ = require("root/lib/underscore")
var Fs = require("fs")
var PromiseStream = require("root/lib/promise_stream")
var parseCsv = require("csv-parse")

exports.readCsv = function(path, opts) {
	return exports.readStream(path).pipe(parseCsv(_.assign({
		columns: true
	}, opts)))
}

exports.readStream = function(path) {
	return path == "-" ? process.stdin : Fs.createReadStream(path)
}

exports.stream = function(stream, fn) {
	return new Promise(function(resolve, reject) {
		stream = stream.pipe(new PromiseStream(fn))
		stream.on("finish", resolve)
		stream.on("error", reject)
	})
}
