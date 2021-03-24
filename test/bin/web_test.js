describe("Web", function() {
	require("root/test/web")()

	describe("GET /", function() {
		it("must render", function*() {
			var res = yield this.request("/")
			res.statusCode.must.equal(200)
		})
	})
})
