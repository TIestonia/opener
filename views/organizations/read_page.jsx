/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var Page = require("../page")
var DateFns = require("date-fns")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Heading} = Page
var {Section} = Page
var formatDateTime = require("date-fns/format")

var ROLES = {
	JUHE: "Chairman of the board",
	JUHL: "Management board member",
	D: "Auditor",
	N: "Member of the supervisory board",
	E: "Chairman of the supervisory board",
	PROK: "Procurator"
}

module.exports = function(attrs) {
	var organization = attrs.organization
	var people = attrs.people
	var procurements = attrs.procurements
	var contracts = attrs.contracts

	return <Page page="organization" req={attrs.req} title={organization.title}>
		<Header>{organization.name}</Header>

		{procurements.length > 0 ? <Section>
			<Heading>Procurements</Heading>
			<table class="opener-table procurements">
				<thead>
					<th>Nr</th>
					<th>Title</th>
					<th>Estimated Cost</th>
					<th>Cost</th>
				</thead>

				<tbody>{procurements.map(function(procurement) {
					return <tr>
						<td>{procurement.id}</td>

						<td><a
							href={Paths.procurementPath(procurement)}
							class="link-button"
						>
							{procurement.title}
						</a></td>

						<td>{procurement.estimated_cost != null ? _.formatMoney(
							procurement.estimated_cost_currency,
							procurement.estimated_cost
						) : ""}</td>

						<td>{procurement.cost != null ? _.formatMoney(
							procurement.cost_currency,
							procurement.cost
						) : ""}</td>
					</tr>
				})}</tbody>
			</table>
		</Section> : null}

		{contracts.length > 0 ? <Section>
			<Heading>Contracts</Heading>
			<table class="opener-table contracts">
				<thead>
					<th>Procurement</th>
					<th>Title</th>
					<th>Estimated Cost</th>
					<th>Cost</th>
				</thead>

				<tbody>{contracts.map(function(contract) {
					var procurementPath = Paths.procurementPath({
						country: contract.procurement_country,
						id: contract.procurement_id
					})

					return <tr>
						<td><a href={procurementPath} class="link-button">
							{contract.procurement_title}
						</a></td>

						<td>{contract.title}</td>

						<td>{contract.estimated_cost != null ? _.formatMoney(
							contract.estimated_cost_currency,
							contract.estimated_cost
						) : ""}</td>

						<td>{contract.cost != null ? _.formatMoney(
							contract.cost_currency,
							contract.cost
						) : ""}</td>
					</tr>
				})}</tbody>
			</table>
		</Section> : null}

		{people.length > 0 ? <Section>
			<Heading>People</Heading>
			<table class="opener-table people">
				<thead>
					<th>Name</th>
					<th>Role</th>
					<th>From</th>
					<th>Until</th>
				</thead>

				<tbody>{people.map(function(person) {
					return <tr>
						<td>{person.person_name}</td>
						<td>{ROLES[person.role]}</td>
						<td>{formatIsoDate(person.started_at)}</td>

						<td>{person.ended_at
							? formatIsoDate(DateFns.addDays(person.ended_at, -1))
							: null
						}</td>
					</tr>
				})}</tbody>
			</table>
		</Section> : null}
	</Page>
}


function formatIsoDate(time) { return formatDateTime(time, "YYYY-MM-DD") }
