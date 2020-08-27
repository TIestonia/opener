/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Fragment} = require("j6pack")
var {Header} = Page
var {Heading} = Page
var {Section} = Page
var {STATUSES} = require("root/lib/procurement")
var {PROCESS_TYPES} = require("root/lib/procurement")

module.exports = function(attrs) {
	var req = attrs.req
	var procurements = attrs.procurements
	var path = req.baseUrl
	var statusFilter = attrs.statusFilter
	var bidderCountFilter = attrs.bidderCountFilter
	var processTypeFilter = attrs.processTypeFilter

	var groupedProcurements = _.groupBy(procurements, "status")

	return <Page
		page="procurements"
		req={attrs.req}
		title="Procurements"
	>
		<Header>Procurements</Header>

		<Section>
			<div id="filter">
				<form
					action={path}
					method="get"
				>
					<ul>
						<li>
							Bidder Count is
							{" "}
							<input
								name="bidder-count"
								type="number"
								value={bidderCountFilter}
							/>
						</li>

						<li>
							Status is
							{" "}
							<select name="status">
								<option value="" selected={!statusFilter}>All</option>

								{STATUSES.map((status) => <option
									value={status}
									selected={statusFilter == status}>
									{status}
								</option>)}
							</select>
						</li>

						<li>
							Process is
							{" "}
							<select name="process-type">
								<option value="" selected={!processTypeFilter}>All</option>

								{_.map(PROCESS_TYPES, (title, type) => <option
									value={type}
									selected={processTypeFilter == type}>
									{title}
								</option>)}
							</select>
						</li>
					</ul>

					<button>Filter</button>
				</form>

				<ul>
					<li>
						<a href={path + "?bidding-duration<14d"} class="link-button">
							Very Short Procurements
						</a>
					</li>

					<li>
						<a
							href={path + "?bidder-count=1&contract-count>=1"}
							class="link-button"
						>
							Single Bidder Procurements
						</a>
					</li>

					<li>
						<a
							href={path + "?bidder-count=1&contract-count>=1&bidding-duration<14d"}
							class="link-button"
						>
							Very Short Procurements with a Single Bidder
						</a>
					</li>
				</ul>
			</div>

			{STATUSES.map(function(type) {
				var procurements = groupedProcurements[type]
				if (procurements == null) return null

				return <Fragment>
					<Heading>{type}</Heading>
					<ProcurementList procurements={procurements} />
				</Fragment>
			})}
		</Section>
	</Page>
}

function ProcurementList(attrs) {
	var procurements = attrs.procurements

	return <ol class="procurements">{procurements.map(function(procurement) {
		return <li class="procurement">
			<h2>
				<a href={Paths.procurementPath(procurement)}>{procurement.title}</a>
				{" — "}
				<span class="buyer-name">{procurement.buyer_name}</span>
			</h2>

			<ul>
				{procurement.contract_count > 0 ? <li>
					{procurement.contract_count} contracts
				</li> : null}

				{procurement.bidder_count > 0 ? <li>
					{procurement.bidder_count} bidders
				</li> : null}

				{procurement.bid_count > 0 ? <li>
					{procurement.bid_count} bids
				</li> : null}

				{procurement.bidding_duration >= 0 ? <li>
					{procurement.bidding_duration.toFixed(2)} days of bidding
				</li> : null}
			</ul>
		</li>
	})}</ol>
}
