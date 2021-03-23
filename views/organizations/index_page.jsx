/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var {Fragment} = Jsx
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Section} = Page
var {Heading} = Page
var {Table} = Page
var {MoneyElement} = Page
var {FlagElement} = Page
var {SortButton} = Page
var {FiltersView} = Page
var {serializeFiltersQuery} = require("root/lib/filtering")
var COUNTRIES = require("root/lib/countries")
var SUPPORTED_COUNTRIES = require("root/config").countries

var ORDER_NAMES = {
	name: "name",
	"procurements-cost": "procurements cost",
	"contracts-cost": "contracts cost"
}

module.exports = function(attrs) {
	var req = attrs.req
	var {organizations} = attrs
	var {organizationsCountries} = attrs
	var {filters} = attrs
	var {order} = attrs
	var orderName = order && order[0]
	var orderDirection = order && order[1]

	// Don't reflect the default order in the query to properly default to
	// ordering by rank when searching by name.
	var path = req.baseUrl
	var query = serializeFiltersQuery(filters)
	if (order) query.order = (order[1] == "asc" ? "" : "-") + order[0]

	if (order == null && filters.name == null)
		[orderName, orderDirection] = ["name", "asc"]

	return <Page
		page="organizations"
		req={attrs.req}
		title="Organizations"
	>
		<Header>
			<h1>Organizations</h1>
		</Header>

		<Section>
			<p class="intro-text">
				Here's a list of all organizations that have either published procurements or won contracts. You can view organizations only from <a href={path + "?country=EE"} class="example-filter-link">Estonia</a> or <a href={path + "?country=LV"} class="example-filter-link">Latvia</a>, or create your own filter below.
			</p>
		</Section>

		<Section id="organizations-section">
			<Heading>
				Found {organizations.length}
				{" "}
				{_.plural(organizations.length, "organization", "organizations")}
			</Heading>

			{!_.isEmpty(filters) ?
				<FilterDescriptionElement filters={filters} order={order} />
			: null}

			<OrganizationFiltersView
				req={req}
				filters={filters}
				order={order}
				availableCountries={organizationsCountries}
			/>

			<Table id="organizations">
				<thead>
					<th>
						<SortButton
							path={path}
							query={query}
							name="name"
							sorted={orderName == "name" ? orderDirection : null}
						>
							Name
						</SortButton>
					</th>

					<th>
						<SortButton
							path={path}
							query={query}
							name="procurements-cost"
							sorted={orderName == "procurements-cost" ? orderDirection : null}
						>
							Procurements
						</SortButton>
					</th>

					<th>
						<SortButton
							path={path}
							query={query}
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

function OrganizationFiltersView(attrs) {
	var req = attrs.req
	var {filters} = attrs
	var {name} = filters
	var {country} = filters
	var {availableCountries} = attrs
	availableCountries = _.sortBy(availableCountries, (id) => COUNTRIES[id].name)

	var {order} = attrs
	var orderName = order && order[0]
	var orderDirection = order && order[1]

	return <form
		id="filters"
		action={req.baseUrl}
		method="get"
	>
		<FiltersView>
			<ul>
				<li class="filter" id="name-filter">
					<label>Name</label>
					<input type="search" name="name" value={name && name[1]} />
				</li>

				<li class="filter" id="country-filter">
					<label>Country</label>

					<select name="country">
						<option value="" selected={!country || !country[1]}>All</option>

						{SUPPORTED_COUNTRIES.map((id) => <option
							value={id}
							selected={country && country[1] == id}
						>
							{COUNTRIES[id].name}
						</option>)}

						<optgroup label="All Countries">
							{availableCountries.map((id) => <option
								value={id}
								selected={country && country[1] == id}
							>
								{COUNTRIES[id].name}
							</option>)}
						</optgroup>
					</select>
				</li>
			</ul>

			{order ? <input
				type="hidden"
				name="order"
				value={(orderDirection == "asc" ? "" : "-") + orderName}
			/> : null}

			<button type="submit">Filter Procurements</button>
		</FiltersView>
	</form>
}

function FilterDescriptionElement(attrs) {
	var {filters} = attrs
	var {order} = attrs
	if (_.isEmpty(filters)) return null

	var generalCriteria = []
	var attributeCriteria = []

	var country = filters.country
	if (country) generalCriteria.push(_.intersperse([
		"from",
		<strong>{COUNTRIES[country[1]].name}</strong>
	], " "))

	var {name} = filters
	if (name) generalCriteria.push(_.intersperse([
		"named",
		<strong>{name[1]}</strong>
	], " "))

	return <p class="filter-description">
		Organizations

		{generalCriteria.length > 0 ? [
			" ",
			_.intersperse(generalCriteria, " ")
		] : null}

		{attributeCriteria.length > 0 ? [
			" with ", attributeCriteria.length > 1 ? [
				_.intersperse(attributeCriteria.slice(0, -1), ", "),
				" and ",
				_.last(attributeCriteria)
			] : attributeCriteria
		] : null}

		{order ? <Fragment>
			{" "}sorted by <strong>{ORDER_NAMES[order[0]]}</strong>
		</Fragment> : null}
		.
	</p>
}
