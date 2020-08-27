describe("Web", function() {
	require("root/test/web")()

	it("must redirect / to /procurements", function*() {
		var res = yield this.request("/", {method: "HEAD"})
		res.statusCode.must.equal(302)
		res.headers.location.must.equal("/procurements")
	})
})
