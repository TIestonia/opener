/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var {Fragment} = Jsx
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Section} = Page
var {Table} = Page
var {MoneyElement} = Page

module.exports = function(attrs) {
	var organizations = attrs.organizations

	return <Page
		page="organizations"
		req={attrs.req}
		title="Organizations"
	>
		<Header>
			<h1>Organizations</h1>
		</Header>

		<Section>
			<Table id="organizations">
				<thead>
					<th><span class="column-name">Name</span></th>
					<th><span class="column-name">Procurements</span></th>
					<th><span class="column-name">Contracts</span></th>
				</thead>

				<tbody>{organizations.map(function(org) {
					return <tr class="organization">
						<td>
							<h3 class="name">
								<a href={Paths.organizationPath(org)}>
									{org.name}
								</a>
							</h3>
						</td>

						<td class="procurements-column">
							{org.procurement_count > 0 ? <Fragment>
								<strong>
									<MoneyElement currency="EUR" amount={org.procurements_cost} />
								</strong>

								<br />
								{org.procurement_count}
								{" "}
								{_.plural(org.procurement_count, "procurement", "procurements")}
							</Fragment> : null}
						</td>

						<td class="contracts-column">
							{org.contract_count > 0 ? <Fragment>
								<strong>
									<MoneyElement currency="EUR" amount={org.contracts_cost} />
								</strong>

								<br />
								{org.contract_count}
								{" "}
								{_.plural(org.contract_count, "contract", "contracts")}
							</Fragment> : null}
						</td>
					</tr>
				})}</tbody>
			</Table>
		</Section>
	</Page>
}
