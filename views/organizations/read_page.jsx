/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var {Fragment} = Jsx
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Heading} = Page
var {Subheading} = Page
var {Section} = Page
var {Table} = Page
var {FlagElement} = Page
var {DateElement} = Page
var {MoneyElement} = Page
var {ProcurementList} = require("../procurements/index_page")
var ROLES = require("root/lib/procurement").ORGANIZATION_ROLES
var HTTP_URL = /^https?:\/\//i
exports = module.exports = ReadPage
exports.RolesTable = RolesTable

function ReadPage(attrs) {
	var organization = attrs.organization
	var people = attrs.people
	var procurements = attrs.procurements
	var procurementsWon = attrs.procurementsWon

	var procurementsCost = _.sum(procurements.map((procurement) => (
		procurement.cost || procurement.estimated_cost || 0
	)))

	var contractsCount = _.sum(procurementsWon.map((p) => p.contracts.length))

	var contractsCost = _.sum(procurementsWon.map((p) => (
		_.sum(p.contracts.map((contract) => (
			contract.cost || contract.estimated_cost || 0
		)))
	)))

	var [activePeople, inactivePeople] = _.partition(people, (person) => (
		person.roles.some((role) => !role.ended_at
	)))

	return <Page page="organization" req={attrs.req} title={organization.name}>
		<Header>
			<h1>{organization.name}</h1>

			<p class="header-subtitle registry-code">
				<FlagElement country={organization.country} />

				{organization.id}
			</p>
		</Header>

		<Section>
			<div id="summary">
				{procurements.length > 0 ? <div class="attribute">
					<h3>Procurements</h3>

					<strong>
						<MoneyElement currency="EUR" amount={procurementsCost} />
					</strong>

					<br />
					{procurements.length}
					{_.plural(procurements.length, " procurement", " procurements")}

					<br />
					<a href="#procurements-section" class="link-button">
						View Procurements
					</a>
				</div> : null}

				{contractsCount > 0 ? <div class="attribute">
					<h3>Contracts</h3>

					<strong>
						<MoneyElement currency="EUR" amount={contractsCost} />
					</strong>

					<br />
					{contractsCount}
					{_.plural(contractsCount, " contract", " contracts")}

					<br />
					<a href="#contracts-section" class="link-button">View Contracts</a>
				</div> : null}

				{activePeople.length > 0 ? <div class="attribute">
					<h3>Board-Level People</h3>
					<strong>{activePeople.length}</strong>
					<br />
					<a href="#people-section" class="link-button">View People</a>
				</div> : null}
			</div>

			<p>
				{organization.url ? <UntrustedLink href={organization.url} /> : null}
			</p>
		</Section>

		{procurements.length > 0 ? <Section id="procurements-section">
			<Heading>Procurements</Heading>

			<p>
				Procurements the organization has published as a buyer.
			</p>

			<ProcurementList
				procurements={procurements}
				showBuyer={false}
			/>
		</Section> : null}

		{procurementsWon.length > 0 ? <Section id="contracts-section">
			<Heading>Contracts</Heading>

			<p>
				Procurements the organization has bid on or participated in as a seller.
			</p>

			<ProcurementList
				procurements={procurementsWon}
				showAllContracts
			/>
		</Section> : null}

		{people.length > 0 ? <Section id="people-section">
			<Heading>Board-Level People</Heading>
			<PeopleTable people={activePeople} />

			{inactivePeople.length > 0 ? <Fragment>
				<Subheading>Previous Board-Level People</Subheading>
				<PeopleTable people={inactivePeople} class="inactive-people" />
			</Fragment> : null}
		</Section> : null}
	</Page>
}

function PeopleTable(attrs) {
	var {people} = attrs

	return <Table class={"people " + (attrs.class || "")}>
		<thead>
			<th><span class="column-name">Name</span></th>
			<th class="role-column"><span class="column-name">Role</span></th>
		</thead>

		<tbody>{people.map(function(person) {
			var personPath = Paths.personPath(person)
			var roles = _.sortBy(person.roles, "started_at")

			var lastRole = (
				_.findLast(roles, (role) => !role.ended_at) ||
				_.last(roles)
			)

			return <Fragment>
				<tr class={"person" + (lastRole.ended_at ? " ended" : "")}>
					<td>
						<h4 class="name">
							<a href={personPath}>{person.name}</a>
						</h4>

						{person.political_party_name ? <p class="political-party">
							Member of {person.political_party_name} since
							{" "}
							<DateElement at={person.political_party_joined_on} />.
						</p> : null}
					</td>

					<td class="role-column role">
						{lastRole.ended_at
							? "Was " + ROLES[lastRole.role]
							: ROLES[lastRole.role]
						}
					</td>
				</tr>

				<tr class="person-roles">
					<td colspan="2">
						<RolesTable roles={roles} />
					</td>
				</tr>
			</Fragment>
		})}</tbody>
	</Table>
}

function RolesTable(attrs) {
	var {roles} = attrs

	return <table>
		<thead>
			<th class="from-column"><span class="column-name">From</span></th>
			<th class="role-column"><span class="column-name">Role</span></th>
			<th class="until-column"><span class="column-name">Until</span></th>
		</thead>

		<tbody>{roles.map((role) => <tr>
			<td class="from-column">
				<DateElement at={role.started_at} />
			</td>

			<td
				class={"role-column" + (role.ended_at ? " ended" : "")}
			>
				{ROLES[role.role]}
			</td>

			<td class="until-column">{
				role.ended_at ? <DateElement at={role.ended_at} /> : null
			}</td>
		</tr>)}</tbody>
	</table>
}

function UntrustedLink(attrs, children) {
	var href = attrs.href
	var klass = attrs.class || ""
	children = children ? children.filter(Boolean) : []
	var text = children.length ? children : href

	if (HTTP_URL.test(href)) return <a {...attrs} class={klass + " link-button"}>
		{text}
	</a>
	else return <span class={klass}>{text}</span>
}
