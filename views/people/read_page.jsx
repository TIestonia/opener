/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var Page = require("../page")
var Paths = require("root/lib/paths")
var DateFns = require("date-fns")
var {Header} = Page
var {Heading} = Page
var {Section} = Page
var ROLES = require("root/lib/procurement").ORGANIZATION_ROLES

module.exports = function(attrs) {
	var person = attrs.person
	var donations = attrs.donations
	var roles = attrs.roles

	return <Page page="person" req={attrs.req} title={person.name}>
		<Header>{person.name}</Header>

		{roles.length > 0 ? <Section>
			<Heading>Roles</Heading>
			<table class="opener-table people">
				<thead>
					<th>Organization</th>
					<th>Role</th>
					<th>From</th>
					<th>Until</th>
				</thead>

				<tbody>{roles.map(function(role) {
					var organizationPath = Paths.organizationPath({
						country: role.organization_country,
						id: role.organization_id
					})

					return <tr>
						<td><a href={organizationPath} class="link-button">
							{role.organization_name}
						</a></td>

						<td>{ROLES[role.role]}</td>
						<td>{_.formatIsoDate(role.started_at)}</td>

						<td>{role.ended_at
							? _.formatIsoDate(DateFns.addDays(role.ended_at, -1))
							: null
						}</td>
					</tr>
				})}</tbody>
			</table>
		</Section> : null}

		{donations.length > 0 ? <Section>
			<Heading>Donations</Heading>
			<table class="opener-table donations">
				<thead>
					<th>Date</th>
					<th>Political Party</th>
					<th>Amount</th>
				</thead>

				<tbody>{donations.map(function(donation) {
					return <tr>
						<td>{donation.date}</td>
						<td>{donation.party_name}</td>

						<td>{_.formatMoney(
							donation.currency,
							donation.amount
						)}</td>
					</tr>
				})}</tbody>
			</table>
		</Section> : null}
	</Page>
}
