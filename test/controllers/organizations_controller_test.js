var _ = require("root/lib/underscore")
var Qs = require("querystring")
var ValidOrganization = require("root/test/valid_organization")
var ValidOrganizationPerson = require("root/test/valid_organization_person")
var ValidPerson = require("root/test/valid_person")
var organizationsDb = require("root/db/organizations_db")
var orgPeopleDb = require("root/db/organization_people_db")
var peopleDb = require("root/db/people_db")
var parseDom = require("root/lib/dom").parse

describe("OrganizationsController", function() {
	require("root/test/web")()
	require("root/test/db")()

	describe("GET /", function() {
		it("must render if no organizations", function*() {
			var res = yield this.request("/organizations")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var table = dom.querySelector("#organizations")
			table.tBodies[0].rows.length.must.equal(0)
		})

		it("must render organizations", function*() {
			yield organizationsDb.create([
				new ValidOrganization({country: "EE", name: "Haigla"}),
				new ValidOrganization({country: "LV", name: "University"})
			])

			var res = yield this.request("/organizations")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#organizations").tBodies[0].rows
			rows.length.must.equal(2)
			rows[0].querySelector(".name").textContent.must.equal("Haigla")
			rows[0].querySelector(".country").textContent.must.equal("Estonia")
			rows[1].querySelector(".name").textContent.must.equal("University")
			rows[1].querySelector(".country").textContent.must.equal("Latvia")
		})

		it("must filter by name", function*() {
			yield organizationsDb.create([
				new ValidOrganization({name: "Rakvere Haigla"}),
				new ValidOrganization({name: "Tallinna Haigla"}),
				new ValidOrganization({name: "Tallinna Vangla"})
			])

			yield organizationsDb.reindex()

			var res = yield this.request("/organizations?name=haigla")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#organizations").tBodies[0].rows
			var names = _.map(rows, (row) => row.querySelector(".name").textContent)
			names.length.must.equal(2)
			names[0].must.equal("Rakvere Haigla")
			names[1].must.equal("Tallinna Haigla")
		})

		it("must filter by name and country", function*() {
			yield organizationsDb.create([
				new ValidOrganization({country: "EE", name: "Rakvere Haigla"}),
				new ValidOrganization({country: "LV", name: "Lätlaste Haigla"}),
				new ValidOrganization({country: "EE", name: "Tallinna Vangla"})
			])

			yield organizationsDb.reindex()

			var res = yield this.request("/organizations?name=haigla&country=EE")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelector("#organizations").tBodies[0].rows
			var names = _.map(rows, (row) => row.querySelector(".name").textContent)
			names.length.must.equal(1)
			names[0].must.equal("Rakvere Haigla")
		})

		it("must filter by person", function*() {
			var organizations = yield organizationsDb.create([
				new ValidOrganization({name: "Rakvere Haigla"}),
				new ValidOrganization({name: "Tallinna Haigla"}),
				new ValidOrganization({name: "Tallinna Vangla"})
			])

			yield organizationsDb.reindex()

			var john = yield peopleDb.create(new ValidPerson({name: "John Smith"}))
			var joe = yield peopleDb.create(new ValidPerson({name: "Joe Mack"}))
			yield peopleDb.reindex()

			yield orgPeopleDb.create([
				new ValidOrganizationPerson({
					organization_country: organizations[0].country,
					organization_id: organizations[0].id,
					person_id: john.id,
					person_country: john.country,
					person_personal_id: john.personal_id
				}),

				new ValidOrganizationPerson({
					organization_country: organizations[1].country,
					organization_id: organizations[1].id,
					person_id: joe.id,
					person_country: joe.country,
					person_personal_id: joe.personal_id
				}),

				new ValidOrganizationPerson({
					organization_country: organizations[2].country,
					organization_id: organizations[2].id,
					person_id: john.id,
					person_country: john.country,
					person_personal_id: john.personal_id
				})
			])

			var res = yield this.request("/organizations?person=smith")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelectorAll("#organizations .organization")
			var names = _.map(rows, (row) => row.querySelector(".name").textContent)
			names.length.must.equal(2)
			names[0].must.equal("Rakvere Haigla")
			names[1].must.equal("Tallinna Vangla")
		})

		it("must filter by person and country", function*() {
			var organizations = yield organizationsDb.create([
				new ValidOrganization({country: "EE", name: "Rakvere Haigla"}),
				new ValidOrganization({country: "LV", name: "Lätlaste Haigla"}),
				new ValidOrganization({country: "EE", name: "Tallinna Vangla"})
			])

			yield organizationsDb.reindex()

			var john = yield peopleDb.create(new ValidPerson({name: "John Smith"}))
			var joe = yield peopleDb.create(new ValidPerson({name: "Joe Mack"}))
			yield peopleDb.reindex()

			yield orgPeopleDb.create([
				new ValidOrganizationPerson({
					organization_country: organizations[0].country,
					organization_id: organizations[0].id,
					person_id: john.id,
					person_country: john.country,
					person_personal_id: john.personal_id
				}),

				new ValidOrganizationPerson({
					organization_country: organizations[1].country,
					organization_id: organizations[1].id,
					person_id: john.id,
					person_country: john.country,
					person_personal_id: john.personal_id
				}),

				new ValidOrganizationPerson({
					organization_country: organizations[2].country,
					organization_id: organizations[2].id,
					person_id: joe.id,
					person_country: joe.country,
					person_personal_id: joe.personal_id
				})
			])

			var res = yield this.request("/organizations?person=smith&country=EE")
			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelectorAll("#organizations .organization")
			var names = _.map(rows, (row) => row.querySelector(".name").textContent)
			names.length.must.equal(1)
			names[0].must.equal("Rakvere Haigla")
		})

		it("must filter by name, person and country", function*() {
			var organizations = yield organizationsDb.create([
				new ValidOrganization({country: "EE", name: "Rakvere Haigla"}),
				new ValidOrganization({country: "LV", name: "Lätlaste Haigla"}),
				new ValidOrganization({country: "EE", name: "Tallinna Vangla"})
			])

			yield organizationsDb.reindex()

			var john = yield peopleDb.create(new ValidPerson({name: "John Smith"}))
			yield peopleDb.reindex()

			yield orgPeopleDb.create([
				new ValidOrganizationPerson({
					organization_country: organizations[0].country,
					organization_id: organizations[0].id,
					person_id: john.id,
					person_country: john.country,
					person_personal_id: john.personal_id
				}),

				new ValidOrganizationPerson({
					organization_country: organizations[1].country,
					organization_id: organizations[1].id,
					person_id: john.id,
					person_country: john.country,
					person_personal_id: john.personal_id
				}),

				new ValidOrganizationPerson({
					organization_country: organizations[2].country,
					organization_id: organizations[2].id,
					person_id: john.id,
					person_country: john.country,
					person_personal_id: john.personal_id
				})
			])

			var res = yield this.request("/organizations?" + Qs.stringify({
				country: "EE",
				name: "haigla",
				person: "smith"
			}))

			res.statusCode.must.equal(200)

			var dom = parseDom(res.body)
			var rows = dom.querySelectorAll("#organizations .organization")
			var names = _.map(rows, (row) => row.querySelector(".name").textContent)
			names.length.must.equal(1)
			names[0].must.equal("Rakvere Haigla")
		})
	})
})
