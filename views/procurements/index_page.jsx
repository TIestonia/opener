/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Section} = Page
var {PROCEDURE_TYPE} = require("root/lib/procurement")

module.exports = function(attrs) {
	var req = attrs.req
	var procurements = attrs.procurements
	var path = req.baseUrl
	var bidderCountFilter = attrs.bidderCountFilter
	var procedureTypeFilter = attrs.procedureTypeFilter

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
					<ul class="attributes">
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
							Process is
							{" "}
							<select name="process-type">
								<option value="" selected={!procedureTypeFilter}>All</option>

								{_.map(PROCEDURE_TYPE, (title, type) => <option
									value={type}
									selected={procedureTypeFilter == type}>
									{title}
								</option>)}
							</select>
						</li>
					</ul>

					<button type="submit">Filter</button>
				</form>

				<ul class="predefined-filters">
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

			<ProcurementList procurements={procurements} />
		</Section>
	</Page>
}

function ProcurementList(attrs) {
	var procurements = attrs.procurements

	return <ol class="procurements">{procurements.map(function(procurement) {
		return <li class="procurement">
			<h3>
				<a href={Paths.procurementPath(procurement)}>{procurement.title}</a>
				{" — "}
				<span class="buyer-name">{procurement.buyer_name}</span>
			</h3>

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

				{(
					procurement.bidding_duration != null &&
					procurement.bidding_duration >= 0 
				) ? <li>
					{procurement.bidding_duration.toFixed(2)} days of bidding
				</li> : null}
			</ul>
		</li>
	})}</ol>
}
