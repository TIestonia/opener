var _ = require("root/lib/underscore")
var Router = require("express").Router
var HttpError = require("standard-http-error")
var peopleDb = require("root/db/people_db")
var donationsDb = require("root/db/political_party_donations_db")
var orgPeopleDb = require("root/db/organization_people_db")
var next = require("co-next")
var sql = require("sqlate")
var ID_PATH = "/:country([A-Z][A-Z])::id"

exports.router = Router({mergeParams: true})

exports.router.use(ID_PATH, next(function*(req, _res, next) {
	var person = yield peopleDb.read(sql`
		SELECT * FROM people
		WHERE country = ${req.params.country}
		AND id = ${req.params.id}
	`)

	if (person == null) throw new HttpError(404)
	req.person = person
	next()
}))

exports.router.get(ID_PATH, next(function*(req, res) {
	var person = req.person
	var birthdate = _.birthdateFromPersonalId(person.id)

	var roles = yield orgPeopleDb.search(sql`
		SELECT role.*, org.name AS organization_name
		FROM organization_people AS role

		JOIN organizations AS org
		ON org.country = role.organization_country AND org.id = role.organization_id

		WHERE role.person_country = ${person.country}
		AND role.person_id = ${person.id}
	`)

	var donations = yield donationsDb.search(sql`
		SELECT donation.*, party.name AS party_name
		FROM political_party_donations AS donation
		JOIN political_parties AS party ON party.id = donation.party_id
		WHERE party.country = ${person.country}
		AND donator_name = ${person.name.toUpperCase()}
		AND donator_birthdate = ${_.formatIsoDate(birthdate)}
	`)

	res.render("people/read_page.jsx", {
		person: person,
		roles: roles,
		donations: donations
	})
}))
