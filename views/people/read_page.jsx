/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var {Fragment} = Jsx
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Heading} = Page
var {Section} = Page
var {Table} = Page
var {FlagElement} = Page
var {DateElement} = Page
var {MoneyElement} = Page
var {RolesTable} = require("../organizations/read_page")
var ROLES = require("root/lib/procurement").ORGANIZATION_ROLES

module.exports = function(attrs) {
	var {person} = attrs
	var {donations} = attrs
	var {organizations} = attrs

	return <Page page="person" req={attrs.req} title={person.name}>
		<Header>
			<h1>{person.name}</h1>

			<p class="header-subtitle birthdate">
				<FlagElement country={person.country} />

				{person.birthdate ? <Fragment>
					Born <DateElement at={person.birthdate} />
				</Fragment> : null}
			</p>

			{person.political_party_name ? <p class="political-party">
				Member of {person.political_party_name} since
				{" "}
				<DateElement at={person.political_party_joined_on} />.
			</p> : null}
		</Header>

		{organizations.length > 0 ? <Section>
			<Heading>Organizations</Heading>
			<Table id="organizations">
				<thead>
					<th><span class="column-name">Name</span></th>
					<th class="role-column"><span class="column-name">Role</span></th>
				</thead>

				<tbody>{organizations.map(function(org) {
					var organizationPath = Paths.organizationPath(org)
					var roles = _.sortBy(org.roles, "started_at")

					var lastRole = (
						_.findLast(roles, (role) => !role.ended_at) ||
						_.last(roles)
					)

					return <Fragment>
						<tr class="organization">
							<td>
								<h3 class="name">
									<a href={organizationPath}>{org.name}</a>
								</h3>
							</td>

							<td class="role-column role">
								{lastRole.ended_at
									? "Was " + ROLES[lastRole.role].toLowerCase() + "."
									: ROLES[lastRole.role]
								}
							</td>
						</tr>

						<tr class="organization-roles">
							<td colspan="2">
								<RolesTable roles={roles} />
							</td>
						</tr>
					</Fragment>
				})}</tbody>
			</Table>
		</Section> : null}

		{donations.length > 0 ? <Section>
			<Heading>Donations</Heading>
			<Table id="donations">
				<thead>
					<th class="date-column"><span class="column-name">Date</span></th>
					<th><span class="column-name">Political Party</span></th>
					<th class="amount-column"><span class="column-name">Amount</span></th>
				</thead>

				<tbody>{donations.map(function(donation) {
					return <tr class="donation">
						<td class="date-column"><DateElement at={donation.date} /></td>
						<td>{donation.party_name}</td>

						<td class="amount-column">
							<MoneyElement
								currency={donation.currency}
								amount={donation.amount}
							/>
						</td>
					</tr>
				})}</tbody>
			</Table>
		</Section> : null}
	</Page>
}
