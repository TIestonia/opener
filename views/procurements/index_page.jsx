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
var {SortButton} = Page
var {FiltersView} = Page
var {serializeFiltersQuery} = require("root/lib/filtering")
var {suffixComparator} = require("root/lib/filtering")
var diffInDays = require("date-fns").differenceInCalendarDays
var concat = Array.prototype.concat.bind(Array.prototype)
var {PROCEDURE_TYPES} = require("root/lib/procurement")
var COUNTRIES = require("root/lib/countries")
var ROLES = require("root/lib/procurement").ORGANIZATION_ROLES
var SUPPORTED_COUNTRIES = require("root/config").countries
var {PAGE_SIZE} = require("root/controllers/procurements_controller")
var COMPARATOR_OPTIONS = new Set([null, "<", "<=", "=", ">=", ">"])
exports = module.exports = IndexPage
exports.ProcurementList = ProcurementList

var ORDER_NAMES = {
	title: "title",
	"buyer-name": "buyer name",
	"published-at": "publishing date",
	"bidding-duration": "bidding duration",
	"bidder-count": "bidder count",
	cost: "cost"
}

var COMPARATOR_NAMES = {
	"<": "less than",
	"<=": "at most",
	"=": "exactly",
	">=": "at least",
	">": "more than"
}

function IndexPage(attrs) {
	var {req} = attrs
	var {procurements} = attrs
	var procurementsTotalCount = procurements[0] && procurements[0].of || 0
	var {filters} = attrs
	var {order} = attrs
	var {offset} = attrs

	var path = req.baseUrl
	var query = serializeFiltersQuery(filters)
	if (order) query.order = (order[1] == "asc" ? "" : "-") + order[0]

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
				Here you can review and filter public procurements from <a href={path + "?country=EE"} class="example-filter-link">Estonia</a> and <a href={path + "?country=LV"} class="example-filter-link">Latvia</a> from 2018–2019. Try filtering for <a href={path + "?bidding-duration<14d&bidder-count=1"} class="example-filter-link">Single bidder procurements with brief bidding periods</a> or <a href={path + "?political-party-donations<=12"} class="example-filter-link">Contracts won before or after political donations</a>, or create your own below.
			</p>
		</Section>

		<Section id="procurements-section">
			<Heading>
				Found {procurementsTotalCount}
				{" "}
				{_.plural(procurementsTotalCount, "procurement", "procurements")}
			</Heading>

			{!_.isEmpty(filters) ?
				<FilterDescriptionElement filters={filters} order={order} />
			: null}

			<ProcurementFiltersView
				req={req}
				filters={filters}
				order={order}
			/>

			<ProcurementList
				id="procurements"
				path={path}
				query={query}
				order={order}
				procurements={procurements}
				donationRange={filters["political-party-donations"]}
				sortable
			/>

			{procurementsTotalCount > 0 ? <Pagination
				total={procurementsTotalCount}
				index={offset}
				pageSize={PAGE_SIZE}
				path={path}
				query={query}
			/> : null}
		</Section>
	</Page>
}

function ProcurementFiltersView(attrs) {
	var req = attrs.req
	var {filters} = attrs
	var {text} = filters
	var {country} = filters
	var publishedSince = filters["published-since"]
	var publishedUntil = filters["published-until"]
	var bidderCount = filters["bidder-count"]
	var contractCount = filters["contract-count"]
	var biddingDuration = filters["bidding-duration"]
	var {cost} = filters
	var procedureType = filters["procedure-type"]
	var politicalPartyDonations = filters["political-party-donations"]
	var {buyer} = filters
	var {seller} = filters

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
				<li class="filter" id="text-filter">
					<label>Title or description</label>
					<input type="search" name="text" value={text && text[1]} />
				</li>

				<li class="filter">
					<label>Country</label>

					<select name="country">
						<option value="" selected={!country || !country[1]}>All</option>

						{SUPPORTED_COUNTRIES.map((id) => <option
							value={id}
							selected={country && country[1] == id}
						>
							{COUNTRIES[id].name}
						</option>)}
					</select>
				</li>

				<li class="filter">
					<label>Publishing Date</label>

					<input
						name="published-since"
						type="date"
						pattern="\d\d\d\d-\d\d-\d\d"
						value={publishedSince && publishedSince[1]}
					/>

					{" until "}

					<input
						name="published-until"
						type="date"
						pattern="\d\d\d\d-\d\d-\d\d"
						value={publishedUntil && publishedUntil[1]}
					/>
				</li>

				<br />

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

				<li class="filter" id="procedure-filter">
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

				<li class="filter" id="cost-filter">
					<label>Cost</label>

					<ComparisonSelectInput
						value={cost && cost[0]}
					/>

					<input
						name={"cost" + suffixComparator(cost)}
						type="number"
						min="0"
						disabled={!cost}
						value={cost && cost[1]}
					/> euros
				</li>

				<li class="filter">
					<label>Possibly Related Political Donations</label>

					<ComparisonSelectInput
						value={politicalPartyDonations && politicalPartyDonations[0]}
						options={[null, "<", "<="]}
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
					/> months before or after
				</li>

				<br />

				<li class="filter" id="buyer-filter">
					<label>Buyer name or registry code</label>
					<input type="search" name="buyer" value={buyer && buyer[1]} />
				</li>

				<li class="filter" id="seller-filter">
					<label>Seller name or registry code</label>
					<input type="search" name="seller" value={seller && seller[1]} />
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

function ComparisonSelectInput(attrs) {
	var {value} = attrs
	var options = attrs.options ? new Set(attrs.options) : COMPARATOR_OPTIONS

	return <select name={attrs.name} class="comparison-select">
		<option value="" selected={value == null} disabled={!options.has(null)}>
			All
		</option>
		<option value="<" selected={value == "<"} disabled={!options.has("<")}>
			Less than
		</option>
		<option value="<=" selected={value == "<="} disabled={!options.has("<=")}>
			At most
		</option>
		<option value="=" selected={value == "="} disabled={!options.has("=")}>
			Exactly
		</option>
		<option value=">=" selected={value == ">="} disabled={!options.has(">=")}>
			At least
		</option>
		<option value=">" selected={value == ">"} disabled={!options.has(">")}>
			More than
		</option>
	</select>
}

function ProcurementList(attrs) {
	var {procurements} = attrs
	var {sortable} = attrs
	var {showAllContracts} = attrs
	var {order} = attrs
	var {donationRange} = attrs
	var showBuyer = attrs.showBuyer === undefined ? true : attrs.showBuyer
	var {path} = attrs
	var {query} = attrs
	var orderName = order && order[0]
	var orderDirection = order && order[1]

	var MaybeSortButton = sortable
		? SortButton
		: (_attrs, children) => <span class="column-name">{children}</span>

	return <Table id={attrs.id} class="opener-procurements">
		<thead>
			<tr>
				<th>
					<MaybeSortButton
						path={path}
						query={query}
						name="title"
						sorted={orderName == "title" ? orderDirection : null}
					>
						Title
					</MaybeSortButton>
					{" "}
					<MaybeSortButton
						path={path}
						query={query}
						name="buyer-name"
						sorted={orderName == "buyer-name" ? orderDirection : null}
					>
						Buyer
					</MaybeSortButton>
					{" "}
					<MaybeSortButton
						path={path}
						query={query}
						name="published-at"
						sorted={orderName == "published-at" ? orderDirection : null}
					>
						Publishing Date
					</MaybeSortButton>
				</th>

				<th class="bidding-duration-column">
					<MaybeSortButton
						path={path}
						query={query}
						name="bidding-duration"
						sorted={orderName == "bidding-duration" ? orderDirection : null}
					>
						Bidding
					</MaybeSortButton>
				</th>

				<th class="bidders-column">
					<MaybeSortButton
						path={path}
						query={query}
						name="bidder-count"
						sorted={orderName == "bidder-count" ? orderDirection : null}
					>
						Bidders
					</MaybeSortButton>
				</th>

				<th class="cost-column">
					<MaybeSortButton
						path={path}
						query={query}
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
				name: contract.seller_name,
				matched: contract.seller_matched
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
							<FlagElement country={procurement.country} />

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
							to <ul>{sellers.map((seller, i) => <li
							class={"seller-name" + (seller.matched ? " matched" : "")}
						>
								{seller.id ? <a
									class="link-button"
									href={Paths.organizationPath(seller)}
								>{seller.name}</a> : "non-disclosed seller"}

								{i < sellers.length - 1 ? ", " : ""}
							</li>)}</ul>.

							{" "}
						</div>

						<table>{contracts.map((contract) => <tr
							class={"contract" + (contract.seller_matched ? " matched" : "")}
						>
							<td class="seller-column">{contract.seller_id ? <a
								class="link-button"
								href={Paths.organizationPath({
									country: contract.seller_country,
									id: contract.seller_id
								})}>{contract.seller_name}</a> : "Non-disclosed"}
							</td>

							<td class="title-column">{contract.title} {contract.id}</td>

							<td class="cost-column">
								{contract.cost != null ? <MoneyElement
									currency={contract.cost_currency}
									amount={contract.cost}
								/> : "Non-disclosed"}
							</td>
						</tr>)}</table>
					</td>
				</tr> : null}

				{(
					donationRange && donations.length > 0
				) ? <tr class="procurement-donations">
					<td colspan="5">
						<p>
							Political donations by board-members
							{" "}
							{COMPARATOR_NAMES[donationRange[0]]}
							{" "}
							{Number(donationRange[1])}
							{" "}
							{_.plural(Number(donationRange[1]), "month", "months")}
							{" "}
							before or after totalling
							{" "}
							<MoneyElement
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
									id: donation.donator_id,
									country: donation.donator_country,
									personal_id: donation.donator_personal_id
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

function FilterDescriptionElement(attrs) {
	var {filters} = attrs
	var {order} = attrs
	if (_.isEmpty(filters)) return null

	var generalCriteria = []
	var attributeCriteria = []

	var {country} = filters
	if (country) generalCriteria.push(_.intersperse([
		"from",
		<strong>{COUNTRIES[country[1]].name}</strong>
	], " "))

	var publishedSince = filters["published-since"]
	if (publishedSince) generalCriteria.push(_.intersperse([
		"from",
		<strong><DateElement at={new Date(publishedSince[1])} /></strong>
	], " "))

	var publishedUntil = filters["published-until"]
	if (publishedUntil) generalCriteria.push(_.intersperse([
		"until",
		<strong><DateElement at={new Date(publishedUntil[1])} /></strong>
	], " "))

	var {text} = filters
	if (text) generalCriteria.push(_.intersperse([
		"matching",
		<strong>{text[1]}</strong>
	], " "))

	var {buyer} = filters
	if (buyer) attributeCriteria.push(_.intersperse([
		"buyer",
		<strong>{buyer[1]}</strong>
	], " "))

	var {seller} = filters
	if (seller) attributeCriteria.push(_.intersperse([
		"seller",
		<strong>{seller[1]}</strong>
	], " "))

	var procedureType = filters["procedure-type"]
	if (procedureType) attributeCriteria.push(_.intersperse([
		"the",
		<strong>{PROCEDURE_TYPES[procedureType[1]]}</strong>,
		"process",
	], " "))

	var biddingDuration = filters["bidding-duration"]
	if (biddingDuration) {
		var days = Number(biddingDuration[1].replace(/d$/, ""))

		attributeCriteria.push(_.intersperse([
			<strong>bidding duration</strong>,
			COMPARATOR_NAMES[biddingDuration[0]],
			<strong>{days} {_.plural(days, "day", "days")}</strong>
		], " "))
	}

	var cost = filters.cost
	if (cost) attributeCriteria.push(_.intersperse([
		<strong>cost</strong>,
		COMPARATOR_NAMES[cost[0]],
		<MoneyElement currency="EUR" amount={Number(cost[1])} />
	], " "))

	var bidderCount = filters["bidder-count"]
	if (bidderCount) {
		let count = Number(bidderCount[1])

		attributeCriteria.push(_.intersperse([
			COMPARATOR_NAMES[bidderCount[0]],
			<strong>{count} {_.plural(count, "bidder", "bidders")}</strong>
		], " "))
	}

	var contractCount = filters["contract-count"]
	if (contractCount) {
		let count = Number(contractCount[1])

		attributeCriteria.push(_.intersperse([
			COMPARATOR_NAMES[contractCount[0]],
			<strong>{count} {_.plural(count, "contract", "contracts")}</strong>
		], " "))
	}

	var politicalPartyDonations = filters["political-party-donations"]
	if (politicalPartyDonations) {
		let months = Number(politicalPartyDonations[1])

		attributeCriteria.push(_.intersperse([
			<strong>political party donations</strong>,
			COMPARATOR_NAMES[politicalPartyDonations[0]],
			<strong>{months} {_.plural(months, "month", "months")} before or after</strong>
		], " "))
	}

	return <p class="filter-description">
		Procurements

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

function Pagination(attrs) {
	var {total} = attrs
	var {index} = attrs
	var {pageSize} = attrs
	var {path} = attrs
	var {query} = attrs

	var pages = _.times(Math.ceil(total / pageSize), _.id)
	var currentPage = Math.floor(index / pageSize)
	var isAtEnd = currentPage < 3 || currentPage >= pages.length - 3

	var pageGroups = pages.length <= 10 ? [pages] : _.groupAdjacent(_.uniq(concat(
		pages.slice(0, isAtEnd ? 5 : 3),
		pages.slice(Math.max(currentPage - 2, 0), currentPage + 3),
		pages.slice(isAtEnd ? -5 : -3)
	).sort(_.sub)), (a, b) => a + 1 == b)

	return <ol id="pagination">
		{_.intersperse(pageGroups.map((pages) => pages.map(function(page) {
			var url = path + "?" + Qs.stringify(_.assign({}, query, {
				offset: page * pageSize
			}))

			var isCurrent = page == currentPage

			return <li class={isCurrent ? "page current" : "page"}>
				<a href={isCurrent ? "#" : url}>{page + 1}</a>
			</li>
			})
		), <li class="middle">…</li>)}
	</ol>
}
