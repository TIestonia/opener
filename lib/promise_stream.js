var WritableStream = require("stream").Writable
module.exports = PromiseStream

function PromiseStream(promise) {
  WritableStream.call(this, {objectMode: true})
	this.promise = promise
}

PromiseStream.prototype = Object.create(WritableStream.prototype, {
  constructor: {value: PromiseStream, configurable: true, writeable: true}
})

PromiseStream.prototype._write = function(msg, _encoding, done) {
	this.promise(msg).then(done.bind(null, null), function(err) {
		err.erroredMessage = msg
		done(err)
	})
}
