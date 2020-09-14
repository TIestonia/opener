var _ = require("root/lib/underscore")
var Router = require("express").Router
var HttpError = require("standard-http-error")
var peopleDb = require("root/db/people_db")
var organizationsDb = require("root/db/organizations_db")
var donationsDb = require("root/db/political_party_donations_db")
var orgPeopleDb = require("root/db/organization_people_db")
var next = require("co-next")
var sql = require("sqlate")
var ID_PATH = "/:country([A-Z][A-Z])::id"

exports.router = Router({mergeParams: true})

exports.router.use(ID_PATH, next(function*(req, _res, next) {
	var person = yield peopleDb.read(sql`
		SELECT
			person.*,
			party.name AS political_party_name,
			member.joined_on AS political_party_joined_on

		FROM people AS person

		LEFT JOIN political_party_members AS member
		ON member.normalized_name = person.normalized_name
		AND member.birthdate = person.birthdate

		LEFT JOIN political_parties AS party ON party.id = member.party_id

		WHERE person.country = ${req.params.country}
		AND person.id = ${req.params.id}
	`)


	if (person == null) throw new HttpError(404)

	person.political_party_joined_on = (
		person.political_party_joined_on &&
		_.parseIsoDate(person.political_party_joined_on)
	)

	req.person = person
	next()
}))

exports.router.get(ID_PATH, next(function*(req, res) {
	var person = req.person

	var organizations = yield organizationsDb.search(sql`
		SELECT
			org.*,

			json_group_array(DISTINCT json_object(
				'role', role.role,
				'started_at', role.started_at,
				'ended_at', role.ended_at
			)) AS roles

		FROM organizations AS org

		JOIN organization_people AS role
		ON role.organization_country  = org.country
		AND role.organization_id = org.id

		WHERE role.person_country = ${person.country}
		AND role.person_id = ${person.id}

		GROUP BY org.country, org.id
	`)

	organizations.forEach(function(organization) {
		organization.roles = JSON.parse(organization.roles).map(orgPeopleDb.parse)
	})

	var donations = yield donationsDb.search(sql`
		SELECT donation.*, party.name AS party_name
		FROM political_party_donations AS donation
		JOIN political_parties AS party ON party.id = donation.party_id
		WHERE party.country = ${person.country}
		AND donator_normalized_name = ${person.normalized_name}
		AND donator_birthdate = ${_.formatIsoDate(person.birthdate)}
	`)

	res.render("people/read_page.jsx", {
		person: person,
		organizations: organizations,
		donations: donations
	})
}))
