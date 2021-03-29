var ValidOrganization = require("root/test/valid_organization")
var organizationsDb = require("root/db/organizations_db")
var orgPeopleDb = require("root/db/organization_people_db")
var peopleDb = require("root/db/people_db")
var outdent = require("root/lib/outdent")
var sql = require("sqlate")
var {importOrganization} = require("root/cli/estonian_business_register_cli")

describe("EstonianBusinessRegisterCli", function() {
	require("root/test/db")()
	require("root/test/mitm")()

	describe(".import", function() {
		it("must request organization and update name", function*() {
			var org = yield organizationsDb.create(new ValidOrganization({
				id: "90006399",
				country: "EE",
				name: "Haigla"
			}))

			var requested = 0

			this.mitm.on("request", function(req, res) {
				;++requested

				req.method.must.equal("POST")
				req.headers.host.must.equal("ariregxmlv6.rik.ee")
				req.headers["content-type"].must.equal("text/xml")
				req.headers.accept.must.equal("text/xml")

				respond(res, outdent`<reg:item>
					<reg:ariregistri_kood>${org.id}</reg:ariregistri_kood>
					<reg:nimi>Põhja-Eesti Regionaalhaigla</reg:nimi>

					<reg:isikuandmed>
						<reg:kaardile_kantud_isikud />
						<reg:kaardivalised_isikud />
					</reg:isikuandmed>
				</reg:item>`)
			})

			yield importOrganization(org)
			requested.must.equal(1)

			var updated = yield organizationsDb.read(sql`
				SELECT * FROM organizations
				WHERE country = ${org.country} AND id = ${org.id}
			`)

			updated.must.eql({
				__proto__: org,
				name: "Põhja-Eesti Regionaalhaigla",
				business_register_synced_at: updated.business_register_synced_at,
				business_register_data: updated.business_register_data
			})
		})

		it("must import board member", function*() {
			var org = yield organizationsDb.create(new ValidOrganization({
				country: "EE"
			}))

			this.mitm.on("request", (_req, res) => respond(res, outdent`<reg:item>
				<reg:ariregistri_kood>${org.id}</reg:ariregistri_kood>
				<reg:nimi>Põhja-Eesti Regionaalhaigla</reg:nimi>

				<reg:isikuandmed>
					<reg:kaardile_kantud_isikud>
						<reg:item>
							<reg:isiku_tyyp>F</reg:isiku_tyyp>
							<reg:isiku_roll>JUHL</reg:isiku_roll>

							<reg:isikukood_registrikood>
								38706181337
							</reg:isikukood_registrikood>

							<reg:eesnimi>John</reg:eesnimi>
							<reg:nimi_arinimi>Smith</reg:nimi_arinimi>
							<reg:algus_kpv>2015-06-18Z</reg:algus_kpv>
						</reg:item>
					</reg:kaardile_kantud_isikud>

					<reg:kaardivalised_isikud />
				</reg:isikuandmed>
			</reg:item>`))

			yield importOrganization(org)

			var people = yield peopleDb.search(sql`SELECT * FROM people`)

			people.must.eql([{
				id: 1,
				country: "EE",
				personal_id: "38706181337",
				name: "John Smith",
				normalized_name: "john smith",
				birthdate: new Date(1987, 5, 18)

			}])

			var orgPeople = yield orgPeopleDb.search(sql`
				SELECT * FROM organization_people
			`)

			orgPeople.must.eql([{
				organization_country: "EE",
				organization_id: org.id,
				person_id: 1,
				person_country: "EE",
				person_personal_id: "38706181337",
				person_birthdate: new Date(1987, 5, 18),
				role: "executive_board_member",
				started_at: new Date(2015, 5, 18),
				ended_at: null
			}])
		})

		// Noticed a bug on Mar 25, 2021 that associated roles of people with no
		// personal ids with a previous person. The issue arose from not
		// clearing a variable in a loop that was hoisted out of the scope of the
		// for-loop.
		it("must ignore person with no personal id", function*() {
			var org = yield organizationsDb.create(new ValidOrganization({
				country: "EE"
			}))

			this.mitm.on("request", (_req, res) => respond(res, outdent`<reg:item>
				<reg:ariregistri_kood>${org.id}</reg:ariregistri_kood>
				<reg:nimi>Põhja-Eesti Regionaalhaigla</reg:nimi>

				<reg:isikuandmed>
					<reg:kaardile_kantud_isikud>
						<reg:item>
							<reg:isiku_tyyp>F</reg:isiku_tyyp>
							<reg:isiku_roll>JUHL</reg:isiku_roll>

							<reg:isikukood_registrikood>
								38706181337
							</reg:isikukood_registrikood>

							<reg:eesnimi>John</reg:eesnimi>
							<reg:nimi_arinimi>Smith</reg:nimi_arinimi>
							<reg:algus_kpv>2015-06-18Z</reg:algus_kpv>
						</reg:item>

						<reg:item>
							<reg:kirje_id>31338</reg:kirje_id>
							<reg:isiku_tyyp>F</reg:isiku_tyyp>
							<reg:isiku_roll>N</reg:isiku_roll>

							<reg:eesnimi>Mary</reg:eesnimi>
							<reg:nimi_arinimi>Smith</reg:nimi_arinimi>
							<reg:algus_kpv>2015-06-19Z</reg:algus_kpv>
						</reg:item>
					</reg:kaardile_kantud_isikud>

					<reg:kaardivalised_isikud />
				</reg:isikuandmed>
			</reg:item>`))

			yield importOrganization(org)

			var people = yield peopleDb.search(sql`SELECT * FROM people`)

			people.must.eql([{
				id: 1,
				country: "EE",
				personal_id: "38706181337",
				name: "John Smith",
				normalized_name: "john smith",
				birthdate: new Date(1987, 5, 18)

			}])

			var orgPeople = yield orgPeopleDb.search(sql`
				SELECT * FROM organization_people
			`)

			orgPeople.must.eql([{
				organization_country: "EE",
				organization_id: org.id,
				person_id: 1,
				person_country: "EE",
				person_personal_id: "38706181337",
				person_birthdate: new Date(1987, 5, 18),
				role: "executive_board_member",
				started_at: new Date(2015, 5, 18),
				ended_at: null
			}])
		})
	})
})

function respond(res, body) {
	res.setHeader("Content-Type", "text/xml")
	res.end(wrapResponse(body))
}

function wrapResponse(res) {
	return outdent`<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
		<Header />

		<Body xmlns:reg="http://arireg.x-road.eu/producer/">
			<reg:detailandmed_v3Response>
				<reg:keha>
					<reg:ettevotjad>${res}</reg:ettevotjad>
				</reg:keha>
			</reg:detailandmed_v3Response>
		</Body>
	</Envelope>`
}
