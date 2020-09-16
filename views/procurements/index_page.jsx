/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Qs = require("qs")
var Jsx = require("j6pack")
var {Fragment} = Jsx
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Heading} = Page
var {Section} = Page
var {Table} = Page
var {DateElement} = Page
var {MoneyElement} = Page
var {FlagElement} = Page
var {javascript} = require("root/lib/jsx")
var diffInDays = require("date-fns").differenceInCalendarDays
var {PROCEDURE_TYPES} = require("root/lib/procurement")
var COUNTRY_NAMES = require("root/lib/country_names")
var ROLES = require("root/lib/procurement").ORGANIZATION_ROLES
exports = module.exports = IndexPage
exports.ProcurementList = ProcurementList

var COMPARATOR_SUFFIXES = {
	"=": "",
	"<": "<<",
	"<=": "<",
	">=": ">",
	">": ">>"
}

var ORDER_NAMES = {
	title: "title",
	"buyer-name": "buyer name",
	"published-at": "publishing date",
	"bidding-duration": "bidding duration",
	"bidder-count": "bidder count",
	cost: "cost"
}

function IndexPage(attrs) {
	var {req} = attrs
	var {procurements} = attrs
	var {filters} = attrs
	var {order} = attrs
	var path = req.baseUrl

	return <Page
		page="procurements"
		req={attrs.req}
		title="Procurements"
	>
		<Header>
			<h1>Procurements</h1>
		</Header>

		<Section>
			<p class="intro-text">
				Here you can review and filter public procurements from Estonia and Latvia. Try filtering for <a href={path + "?bidding-duration<14d&bidder-count=1"} class="example-filter-link">Single bidder procurements with brief bidding periods</a> or <a href={path + "?political-party-donations<=12"} class="example-filter-link">Contracts won after political donations</a>, or create your own below.
			</p>
		</Section>

		<Section id="procurements-section">
			<Heading>
				Found {procurements.length}
				{" "}
				{_.plural(procurements.length, "procurement", "procurements")}
			</Heading>

			{!_.isEmpty(filters) ?
				<FilterDescriptionElement filters={filters} order={order} />
			: null}

			<FiltersView req={req} filters={filters} order={order} />

			<ProcurementList
				url={path}
				filters={filters}
				order={order}
				procurements={procurements}
				sortable
			/>
		</Section>
	</Page>
}

function FiltersView(attrs) {
	var req = attrs.req
	var filters = attrs.filters
	var bidderCount = filters["bidder-count"]
	var contractCount = filters["contract-count"]
	var biddingDuration = filters["bidding-duration"]
	var procedureType = filters["procedure-type"]
	var politicalPartyDonations = filters["political-party-donations"]

	var {order} = attrs
	var orderName = order && order[0]
	var orderDirection = order && order[1]

	return <div id="filters">
		<input id="filters-toggle" type="checkbox" hidden />
		<label for="filters-toggle" class="link-button">Show filters</label>

		<form
			id="filter-form"
			action={req.baseUrl}
			method="get"
		>
			<ul>
				<li class="filter">
					<label>Buyer Country</label>

					<select name="country">
						<option value="EE" selected>Estonia</option>
					</select>
				</li>

				<li class="filter">
					<label>Bidding Duration</label>

					<ComparisonSelectInput
						value={biddingDuration && biddingDuration[0]}
					/>

					<input
						name={"bidding-duration" + suffixComparator(biddingDuration)}
						type="number"
						min="0"
						disabled={!biddingDuration}
						value={biddingDuration && biddingDuration[1].replace(/d$/, "")}
					/> days
				</li>

				<li class="filter">
					<label>Bidder Count</label>

					<ComparisonSelectInput
						value={bidderCount && bidderCount[0]}
					/>

					<input
						name={"bidder-count" + suffixComparator(bidderCount)}
						type="number"
						min="0"
						disabled={!bidderCount}
						value={bidderCount && bidderCount[1]}
					/>
				</li>

				<li class="filter">
					<label>Procedure</label>

					<select name="procedure-type">
						<option value="" selected={!procedureType}>All</option>

						{_.map(PROCEDURE_TYPES, (title, type) => <option
							value={type}
							selected={procedureType && procedureType[1] == type}
						>
							{title}
						</option>)}
					</select>
				</li>

				<li class="filter">
					<label>Contract Count</label>

					<ComparisonSelectInput
						value={contractCount && contractCount[0]}
					/>

					<input
						name={"contract-count" + suffixComparator(contractCount)}
						type="number"
						min="0"
						disabled={!contractCount}
						value={contractCount && contractCount[1]}
					/>
				</li>

				<li class="filter">
					<label>Possibly Related Political Donations</label>

					<ComparisonSelectInput
						value={politicalPartyDonations && politicalPartyDonations[0]}
					/>

					<input
						name={
							"political-party-donations" +
							suffixComparator(politicalPartyDonations)
						}
						type="number"
						min="0"
						disabled={!politicalPartyDonations}
						value={politicalPartyDonations && politicalPartyDonations[1]}
					/> months before
				</li>
			</ul>

			{order ? <input
				type="hidden"
				name="order"
				value={(orderDirection == "asc" ? "" : "-") + orderName}
			/> : null}

			<button type="submit">Filter Procurements</button>

			<script>{javascript`(function() {
				var forEach = Function.call.bind(Array.prototype.forEach)
				var selects = document.getElementsByClassName("comparison-select")
				var COMPARATOR_SUFFIXES = ${COMPARATOR_SUFFIXES}

				forEach(selects, function(select) {
					select.addEventListener("change", handleChange)
				})

				function handleChange(ev) {
					var select = ev.target
					var comparator = select.value

					var input = select.nextElementSibling
					input.name = input.name.replace(/[<>]+$/, "")
					input.disabled = !comparator

					if (comparator) {
						input.name += COMPARATOR_SUFFIXES[comparator]
						input.focus()
					}
					else input.value = ""
				}
			})()`}
			</script>
		</form>
	</div>
}

function ComparisonSelectInput(attrs) {
	var value = attrs.value

	return <select name={attrs.name} class="comparison-select">
		<option value="" selected={value == null}>All</option>
		<option value="<" selected={value == "<"}>Less than</option>
		<option value="<=" selected={value == "<="}>At most</option>
		<option value="=" selected={value == "="}>Exactly</option>
		<option value=">=" selected={value == ">="}>At least</option>
		<option value=">" selected={value == ">"}>More than</option>
	</select>
}

function ProcurementList(attrs) {
	var {procurements} = attrs
	var {sortable} = attrs
	var {showAllContracts} = attrs
	var {filters} = attrs
	var {order} = attrs
	var showBuyer = attrs.showBuyer === undefined ? true : attrs.showBuyer
	var baseUrl = attrs.url
	var query = filters ? serializeFiltersQuery(filters) : {}
	var url = baseUrl + (query && "?" + query)
	var orderName = order && order[0]
	var orderDirection = order && order[1]

	var MaybeSortButton = sortable
		? SortButton
		: (_attrs, children) => <span class="column-name">{children}</span>

	return <Table class="opener-procurements">
		<thead>
			<tr>
				<th>
					<MaybeSortButton
						url={url}
						name="title"
						sorted={orderName == "title" ? orderDirection : null}
					>
						Title
					</MaybeSortButton>
					{" "}
					<MaybeSortButton
						url={url}
						name="buyer-name"
						sorted={orderName == "buyer-name" ? orderDirection : null}
					>
						Buyer
					</MaybeSortButton>
					{" "}
					<MaybeSortButton
						url={url}
						name="published-at"
						sorted={orderName == "published-at" ? orderDirection : null}
					>
						Publishing Date
					</MaybeSortButton>
				</th>

				<th class="bidding-duration-column">
					<MaybeSortButton
						url={url}
						name="bidding-duration"
						sorted={orderName == "bidding-duration" ? orderDirection : null}
					>
						Bidding
					</MaybeSortButton>
				</th>

				<th class="bidders-column">
					<MaybeSortButton
						url={url}
						name="bidder-count"
						sorted={orderName == "bidder-count" ? orderDirection : null}
					>
						Bidders
					</MaybeSortButton>
				</th>

				<th class="cost-column">
					<MaybeSortButton
						url={url}
						name="cost"
						sorted={orderName == "cost" ? orderDirection : null}
					>
						Cost
					</MaybeSortButton>
				</th>
			</tr>
		</thead>

		<tbody>{procurements.map(function(procurement) {
			var donations = procurement.donations || []
			var contracts = procurement.contracts || []

			var sellers = _.uniqBy(contracts, "seller_name").map((contract) => ({
				country: contract.seller_country,
				id: contract.seller_id,
				name: contract.seller_name
			}))

			var contractsToggleId = _.uniqueId("contracts-toggle-")

			var biddingDuration = procurement.deadline_at ? diffInDays(
				procurement.deadline_at,
				procurement.published_at
			) : null

			return <Fragment>
				<tr class="procurement">
					<td class="title-column">
						<h3 class="title">
							<a href={Paths.procurementPath(procurement)}>
								{procurement.title}
							</a>
						</h3>

						{showBuyer ? <p class="buyer-name">
							<FlagElement country={procurement.buyer_country} />

							<a href={Paths.organizationPath({
								country: procurement.buyer_country,
								id: procurement.buyer_id,
							})}>{procurement.buyer_name}</a>
						</p> : null}

						<p class="dates">
							Published <DateElement at={procurement.published_at} />

							{procurement.deadline_at ? <Fragment>
								{" "}and bidding deadline
								{" "}<DateElement at={procurement.deadline_at} />
							</Fragment> : null}.
						</p>
					</td>

					<td class="bidding-duration-column">
						{biddingDuration != null ? <strong>
							{Math.floor(biddingDuration)}
							{" "}
							{_.plural(biddingDuration, "day", "days")}
						</strong> : null}
					</td>

					<td class="bidders-column">
						<strong>
							{procurement.bidder_count > 0 ? <Fragment>
								{procurement.bidder_count}
								{" "}
								{_.plural(procurement.bidder_count, "bidder", "bidders")}
							</Fragment> : null}
						</strong>

						{procurement.bid_count > 0 ? <Fragment>
							<br />
							{procurement.bid_count}
							{" "}
							{_.plural(procurement.bid_count, "bid", "bids")}
						</Fragment> : null}
					</td>

					<td class="cost-column">
						<strong>
							{procurement.cost != null ? <MoneyElement
								currency={procurement.cost_currency}
								amount={procurement.cost}
							/> : procurement.estimated_cost != null ? <MoneyElement
								currency={procurement.estimated_cost_currency}
								amount={procurement.estimated_cost}
							/> : null}
						</strong>
					</td>
				</tr>

				{contracts.length > 0 ? <tr class="procurement-contracts">
					<td colspan="5">
						<input
							id={contractsToggleId}
							class="contracts-toggle"
							type="checkbox"
							checked={contracts.length == 1 || showAllContracts}
							hidden
						/>

						<label
							for={contractsToggleId}
							tabindex="0"
							class="link-button contracts-toggle-button"
						>
							Reveal all contracts
						</label>

						<div class="summary">
							{_.plural(contracts.length, "Contract", "Contracts")} awarded
							to <ul>{sellers.map((seller, i) => <li>
								{seller.id ? <a
									class="link-button"
									href={Paths.organizationPath(seller)}
								>{seller.name}</a> : "non-disclosed seller"}

								{i < sellers.length - 1 ? ", " : ""}
							</li>)}</ul>.

							{" "}
						</div>

						<table>{contracts.map((contract) => <tr>
							<td>{contract.seller_id ? <a
								class="link-button"
								href={Paths.organizationPath({
									country: contract.seller_country,
									id: contract.seller_id
								})}>{contract.seller_name}</a> : "Non-disclosed"}
							</td>

							<td>{contract.title} {contract.id}</td>

							<td class="cost-column">
								{contract.cost != null ? <MoneyElement
									currency={contract.cost_currency}
									amount={contract.cost}
								/> : "Non-disclosed"}
							</td>
						</tr>)}</table>
					</td>
				</tr> : null}

				{donations.length > 0 ? <tr class="procurement-donations">
					<td colspan="5">
						<p>
							Political donations by board-members prior to contract
							totalling <MoneyElement
								currency="EUR"
								amount={_.sum(_.map(donations, "amount"))}
							/>.
						</p>

						<table>{donations.map((donation) => <tr>
							<td>
								<DateElement at={donation.date} />
							</td>

							<td>
								<a class="link-button" href={Paths.personPath({
									country: donation.donator_country,
									id: donation.donator_id
								})}>{donation.donator_name}</a>
							</td>

							<td>
								{ROLES[donation.donator_role]}
							</td>

							<td>
								{donation.party_name}
							</td>

							<td class="amount-column">
								<MoneyElement
									currency={donation.currency}
									amount={donation.amount}
								/>
							</td>
						</tr>)}</table>
					</td>
				</tr> : null}
			</Fragment>
		})}</tbody>
	</Table>
}

var COMPARATORS = {
	"<": "less than",
	"<=": "at most",
	"=": "exactly",
	">=": "at least",
	">": "more than"
}

function FilterDescriptionElement(attrs) {
	var {filters} = attrs
	var {order} = attrs
	if (_.isEmpty(filters)) return null

	var originCriteria
	var criteria = []

	var country = filters.country
	if (country) originCriteria = <strong>{COUNTRY_NAMES[country[1]]}</strong>

	var procedureType = filters["procedure-type"]
	if (procedureType) criteria.push(_.intercalate([
		"the",
		<strong>{PROCEDURE_TYPES[procedureType[1]]}</strong>,
		"process",
	], " "))

	var biddingDuration = filters["bidding-duration"]
	if (biddingDuration) {
		var days = Number(biddingDuration[1].replace(/d$/, ""))

		criteria.push(_.intercalate([
			<strong>bidding duration</strong>,
			COMPARATORS[biddingDuration[0]],
			<strong>{days} {_.plural(days, "day", "days")}</strong>
		], " "))
	}

	var bidderCount = filters["bidder-count"]
	if (bidderCount) {
		let count = Number(bidderCount[1])

		criteria.push(_.intercalate([
			COMPARATORS[bidderCount[0]],
			<strong>{count} {_.plural(count, "bidder", "bidders")}</strong>
		], " "))
	}

	var contractCount = filters["contract-count"]
	if (contractCount) {
		let count = Number(contractCount[1])

		criteria.push(_.intercalate([
			COMPARATORS[contractCount[0]],
			<strong>{count} {_.plural(count, "contract", "contracts")}</strong>
		], " "))
	}

	var politicalPartyDonations = filters["political-party-donations"]
	if (politicalPartyDonations) {
		let months = Number(politicalPartyDonations[1])

		criteria.push(_.intercalate([
			<strong>political party donations</strong>,
			COMPARATORS[politicalPartyDonations[0]],
			<strong>{months} {_.plural(months, "month", "months")} before</strong>
		], " "))
	}

	return <p class="filter-description">
		Procurements{originCriteria ? [
			" from ", originCriteria
		] : null}{criteria.length > 0 ? [" with ", criteria.length > 1
			? [_.intercalate(criteria.slice(0, -1), ", "), " and ", _.last(criteria)]
			: criteria
		] : null}{order ? <Fragment>
			{" "}sorted by <strong>{ORDER_NAMES[order[0]]}</strong>
		</Fragment> : null}.
	</p>
}

function SortButton(attrs, children) {
	var {name} = attrs
	var {sorted} = attrs
	var defaultDirection = attrs.direction || "asc"
	var direction = !sorted ? defaultDirection : sorted == "asc" ? "desc" : "asc"

	var {url} = attrs
	url += url.indexOf("?") >= 0 ? "&" : "?"
	url += "order=" + (direction == "asc" ? "" : "-") + name

	return <a href={url} class={"column-name sort-button " + (sorted || "")}>
		{children}
	</a>
}

function serializeFiltersQuery(filters) {
	return Qs.stringify(_.mapValues(
		_.mapKeys(filters, (name, filter) => name + suffixComparator(filter)),
		_.second
	))
}

function suffixComparator(filter) {
	return filter ? COMPARATOR_SUFFIXES[filter[0]] : ""
}
