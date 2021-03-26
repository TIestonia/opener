var _ = require("root/lib/underscore")
var Qs = require("querystring")
var ValidOrganization = require("root/test/valid_organization")
var ValidProcurement = require("root/test/valid_procurement")
var ValidContract = require("root/test/valid_procurement_contract")
var organizationsDb = require("root/db/organizations_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var parseDom = require("root/lib/dom").parse

describe("ProcurementsController", function() {
	require("root/test/web")()
	require("root/test/db")()

	describe("GET /", function() {
		it("must render if no procurements", function*() {
			var res = yield this.request("/procurements")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var table = dom.querySelector("#procurements")
			table.tBodies[0].rows.length.must.equal(0)
		})

		it("must render procurements", function*() {
			var buyers = yield organizationsDb.create([
				new ValidOrganization({country: "EE", name: "Haigla"}),
				new ValidOrganization({country: "LV", name: "University"})
			])

			yield procurementsDb.create([new ValidProcurement({
				country: buyers[0].country,
				id: "12345",
				buyer_country: buyers[0].country,
				buyer_id: buyers[0].id,
				title: "Riietus"
			}), new ValidProcurement({
				country: buyers[1].country,
				id: "LV:2018/S 100",
				buyer_country: buyers[1].country,
				buyer_id: buyers[1].id,
				title: "Materials"
			})])

			var res = yield this.request("/procurements")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#procurements").tBodies[0].rows
			rows.length.must.equal(2)
			rows[0].querySelector(".title").textContent.must.equal("Riietus")
			rows[0].querySelector(".opener-flag").alt.must.equal("Estonia")
			rows[0].querySelector(".buyer-name").textContent.must.equal("Haigla")
			rows[1].querySelector(".title").textContent.must.equal("Materials")
			rows[1].querySelector(".opener-flag").alt.must.equal("Latvia")
			rows[1].querySelector(".buyer-name").textContent.must.equal("University")
		})

		it("must filter by title", function*() {
			var buyer = yield organizationsDb.create(new ValidOrganization)

			yield procurementsDb.create([new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Bikes, Cars etc."
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Fast motorcars"
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Fast Boats and Bikes"
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?text=cars&order=title")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#procurements").tBodies[0].rows
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(2)
			titles[0].must.equal("Bikes, Cars etc.")
			titles[1].must.equal("Fast motorcars")
		})

		it("must filter by description", function*() {
			var buyer = yield organizationsDb.create(new ValidOrganization)

			yield procurementsDb.create([new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Automotive parts",
				description: "For cars and motorcycles."
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Trams",
				description: "Tramcars"
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Sea transportation",
				description: "No four-wheels here"
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?text=cars&order=title")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#procurements").tBodies[0].rows
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(2)
			titles[0].must.equal("Automotive parts")
			titles[1].must.equal("Trams")
		})

		it("must filter by contract title", function*() {
			var buyer = yield organizationsDb.create(new ValidOrganization)

			var procurements = yield procurementsDb.create([new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Automotive parts"
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Trams",
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Sea transportation"
			})])

			yield contractsDb.create([new ValidContract({
				procurement_country: procurements[0].country,
				procurement_id: procurements[0].id,
				title: "For cars and motorcycles."
			}), new ValidContract({
				procurement_country: procurements[1].country,
				procurement_id: procurements[1].id,
				title: "Tramcars"
			}), new ValidContract({
				procurement_country: procurements[2].country,
				procurement_id: procurements[2].id,
				title: "No four-wheels here"
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?text=cars&order=title")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelectorAll("#procurements tr.procurement")
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(2)
			titles[0].must.equal("Automotive parts")
			titles[1].must.equal("Trams")
		})

		it("must filter by title and country", function*() {
			var buyer = yield organizationsDb.create(new ValidOrganization)

			yield procurementsDb.create([new ValidProcurement({
				country: "EE",
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Bikes, Cars etc."
			}), new ValidProcurement({
				country: "LV",
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Fast Cars"
			}), new ValidProcurement({
				country: "EE",
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Fast Boats and Bikes"
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?" + Qs.stringify({
				country: "EE",
				text: "cars",
				order: "title"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#procurements").tBodies[0].rows
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(1)
			titles[0].must.equal("Bikes, Cars etc.")
		})

		it("must filter by buyer name", function*() {
			var buyers = yield organizationsDb.create([
				new ValidOrganization({name: "Rakvere Hospital"}),
				new ValidOrganization({name: "Rationalist Hospital Corpus"}),
				new ValidOrganization({name: "Private Prison"})
			])

			yield organizationsDb.reindex()

			yield procurementsDb.create([new ValidProcurement({
				buyer_country: buyers[0].country,
				buyer_id: buyers[0].id,
				title: "Computers"
			}), new ValidProcurement({
				buyer_country: buyers[1].country,
				buyer_id: buyers[1].id,
				title: "Syringes"
			}), new ValidProcurement({
				buyer_country: buyers[2].country,
				buyer_id: buyers[2].id,
				title: "Handcuffs"
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?" + Qs.stringify({
				buyer: "hospital",
				order: "title"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#procurements").tBodies[0].rows
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(2)
			titles[0].must.equal("Computers")
			titles[1].must.equal("Syringes")
		})

		it("must filter by buyer name and country", function*() {
			var buyers = yield organizationsDb.create([
				new ValidOrganization({name: "Rakvere Hospital"}),
				new ValidOrganization({name: "Rationalist Hospital Corpus"}),
				new ValidOrganization({name: "Private Prison"})
			])

			yield organizationsDb.reindex()

			yield procurementsDb.create([new ValidProcurement({
				country: "EE",
				buyer_country: buyers[0].country,
				buyer_id: buyers[0].id,
				title: "Computers"
			}), new ValidProcurement({
				country: "LV",
				buyer_country: buyers[1].country,
				buyer_id: buyers[1].id,
				title: "Syringes"
			}), new ValidProcurement({
				country: "EE",
				buyer_country: buyers[2].country,
				buyer_id: buyers[2].id,
				title: "Handcuffs"
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?" + Qs.stringify({
				buyer: "hospital",
				country: "EE",
				order: "title"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#procurements").tBodies[0].rows
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(1)
			titles[0].must.equal("Computers")
		})

		it("must filter by title and buyer name", function*() {
			var buyers = yield organizationsDb.create([
				new ValidOrganization({name: "Rakvere Hospital"}),
				new ValidOrganization({name: "Rationalist Hospital Corpus"}),
				new ValidOrganization({name: "Private Prison"})
			])

			yield organizationsDb.reindex()

			yield procurementsDb.create([new ValidProcurement({
				buyer_country: buyers[0].country,
				buyer_id: buyers[0].id,
				title: "Desktop Computers"
			}), new ValidProcurement({
				buyer_country: buyers[1].country,
				buyer_id: buyers[1].id,
				title: "Syringes"
			}), new ValidProcurement({
				buyer_country: buyers[2].country,
				buyer_id: buyers[2].id,
				title: "Laptop Computers"
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?" + Qs.stringify({
				text: "computer",
				buyer: "hospital",
				order: "title"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#procurements").tBodies[0].rows
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(1)
			titles[0].must.equal("Desktop Computers")
		})

		it("must filter by seller name", function*() {
			var buyer = yield organizationsDb.create(new ValidOrganization)

			var sellers = yield organizationsDb.create([
				new ValidOrganization({name: "Rakvere Hospital"}),
				new ValidOrganization({name: "Rationalist Hospital Corpus"}),
				new ValidOrganization({name: "Private Prison"})
			])

			yield organizationsDb.reindex()

			var procurements = yield procurementsDb.create([new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Cheap Colonoscopies"
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Plastic Surgeries"
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Handcuffs"
			})])

			yield contractsDb.create([new ValidContract({
				procurement_country: procurements[0].country,
				procurement_id: procurements[0].id,
				seller_country: sellers[0].country,
				seller_id: sellers[0].id
			}), new ValidContract({
				procurement_country: procurements[1].country,
				procurement_id: procurements[1].id,
				seller_country: sellers[1].country,
				seller_id: sellers[1].id
			}), new ValidContract({
				procurement_country: procurements[2].country,
				procurement_id: procurements[2].id,
				seller_country: sellers[2].country,
				seller_id: sellers[2].id
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?" + Qs.stringify({
				seller: "hospital",
				order: "title"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelectorAll("#procurements tr.procurement")
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(2)
			titles[0].must.equal("Cheap Colonoscopies")
			titles[1].must.equal("Plastic Surgeries")
		})

		it("must filter by seller name and country", function*() {
			var buyer = yield organizationsDb.create(new ValidOrganization)

			var sellers = yield organizationsDb.create([
				new ValidOrganization({name: "Rakvere Hospital"}),
				new ValidOrganization({name: "Rationalist Hospital Corpus"}),
				new ValidOrganization({name: "Private Prison"})
			])

			yield organizationsDb.reindex()

			var procurements = yield procurementsDb.create([new ValidProcurement({
				country: "EE",
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Cheap Colonoscopies"
			}), new ValidProcurement({
				country: "LV",
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Plastic Surgeries"
			}), new ValidProcurement({
				country: "EE",
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Handcuffs"
			})])

			yield contractsDb.create([new ValidContract({
				procurement_country: procurements[0].country,
				procurement_id: procurements[0].id,
				seller_country: sellers[0].country,
				seller_id: sellers[0].id
			}), new ValidContract({
				procurement_country: procurements[1].country,
				procurement_id: procurements[1].id,
				seller_country: sellers[1].country,
				seller_id: sellers[1].id
			}), new ValidContract({
				procurement_country: procurements[2].country,
				procurement_id: procurements[2].id,
				seller_country: sellers[2].country,
				seller_id: sellers[2].id
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?" + Qs.stringify({
				seller: "hospital",
				country: "EE",
				order: "title"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelectorAll("#procurements tr.procurement")
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(1)
			titles[0].must.equal("Cheap Colonoscopies")
		})

		it("must filter by title and seller name", function*() {
			var buyer = yield organizationsDb.create(new ValidOrganization)

			var sellers = yield organizationsDb.create([
				new ValidOrganization({name: "Julio Ferraring"}),
				new ValidOrganization({name: "Matsda"}),
				new ValidOrganization({name: "Lada"})
			])

			yield organizationsDb.reindex()

			var procurements = yield procurementsDb.create([new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Bikes, Cars etc."
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Fast motorcars"
			}), new ValidProcurement({
				buyer_country: buyer.country,
				buyer_id: buyer.id,
				title: "Fast Boats and Bikes"
			})])

			yield contractsDb.create([new ValidContract({
				procurement_country: procurements[0].country,
				procurement_id: procurements[0].id,
				seller_country: sellers[0].country,
				seller_id: sellers[0].id
			}), new ValidContract({
				procurement_country: procurements[1].country,
				procurement_id: procurements[1].id,
				seller_country: sellers[1].country,
				seller_id: sellers[1].id
			}), new ValidContract({
				procurement_country: procurements[2].country,
				procurement_id: procurements[2].id,
				seller_country: sellers[2].country,
				seller_id: sellers[2].id
			})])

			yield procurementsDb.reindex()

			var res = yield this.request("/procurements?" + Qs.stringify({
				text: "car",
				seller: "ferrari"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelectorAll("#procurements tr.procurement")
			var titles = _.map(rows, (row) => row.querySelector(".title").textContent)
			titles.length.must.equal(1)
			titles[0].must.equal("Bikes, Cars etc.")
		})
	})
})
