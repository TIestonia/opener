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
var {FlagElement} = Page
var {SortButton} = Page
var COUNTRIES = require("root/lib/countries")

module.exports = function(attrs) {
	var req = attrs.req
	var organizations = attrs.organizations
	var path = req.baseUrl
	var {order} = attrs
	var orderName = order && order[0]
	var orderDirection = order && order[1]

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
					<th>
						<SortButton
							path={path}
							name="name"
							sorted={orderName == "name" ? orderDirection : null}
						>
							Name
						</SortButton>
					</th>

					<th>
						<SortButton
							path={path}
							name="procurements-cost"
							sorted={orderName == "procurements-cost" ? orderDirection : null}
						>
							Procurements
						</SortButton>
					</th>

					<th>
						<SortButton
							path={path}
							name="contracts-cost"
							sorted={orderName == "contracts-cost" ? orderDirection : null}
						>
							Contracts
						</SortButton>
					</th>
				</thead>

				<tbody>{organizations.map(function(org) {
					return <tr class="organization">
						<td>
							<h3 class="name">
								<a href={Paths.organizationPath(org)}>
									{org.name}
								</a>
							</h3>

							<p class="country">
								<FlagElement country={org.country} alt={false} />
								{COUNTRIES[org.country].name}
							</p>
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
