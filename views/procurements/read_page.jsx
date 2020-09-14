/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var {Fragment} = Jsx
var Page = require("../page")
var Paths = require("root/lib/paths")
var Procurement = require("root/lib/procurement")
var {Header} = Page
var {Section} = Page
var {Heading} = Page
var {Table} = Page
var {DateElement} = Page
var {TimeElement} = Page
var {MoneyElement} = Page
var {FlagElement} = Page
var diffInDays = require("date-fns").differenceInCalendarDays
var {PROCEDURE_TYPES} = require("root/lib/procurement")
var ROLES = require("root/lib/procurement").ORGANIZATION_ROLES

var INDICATORS = {
	biddingPeriod: [
		"Bidding period is associated with an increased risk factor",
		"Bidding period is adequate"
	],

	multipleBidders: [
		"Has a single bidder",
		"Has multiple bidders"
	],

	sellerDonations: [
		"Sellers have recently made political party donations",
		"Sellers have not recently made any political party donations",
	],

	costAndEstimation: [
		"Actual cost beyond the estimated cost",
		"Estimated and actual costs are within range",
	],

	disputes: [
		"Some sellers have disputed the awards",
		"No disputes from bidders or outsiders",
	]
}

var ESTONIAN_PROCEDURE_TYPES = {
	A: "Avatud hankemenetlus",
	DP: "Dünaamilise hankesüsteemi piiratud hankemenetlus",
	G: "Konkurentsipõhine läbirääkimistega hankemenetlus",
	IK: "Avatud ideekonkurss",
	KE: "Kontsessiooni erimenetlus",
	LA: "Erandi alusel",
	LM: "Lihthange",
	LT: "Lihtsustatud korras teenuste tellimine",
	M: "Minikonkurss raamlepingu alusel",
	MS: "Toetuse saaja ost",
	PK: "Piiratud osalejate arvuga ideekonkurss",
	PN: "Eelteade tähtaegade lühendamiseks",
	P: "Piiratud hankemenetlus",
	SE: "Sotsiaal- ja eriteenuste erimenetlus",
	T: "Väljakuulutamiseta läbirääkimistega hankemenetlus",
	VD: "Võistlev dialoog",
	VO: "Väikehange"
}

module.exports = function(attrs) {
	var procurement = attrs.procurement
	var buyer = attrs.buyer
	var contracts = attrs.contracts

	var biddingDuration = procurement.deadline_at ? diffInDays(
		procurement.deadline_at,
		procurement.published_at
	) : null

	return <Page page="procurement" req={attrs.req} title={procurement.title}>
		<Header>
			<h1>{procurement.title}</h1>

			<p class="header-subtitle buyer-name">
				<FlagElement country={procurement.buyer_country} />

				<a
					class="buyer-name"
					href={Paths.organizationPath(buyer)}
				>
					{buyer.name}
				</a>
			</p>

			<p class="dates">
				Published <TimeElement at={procurement.published_at} />

				{procurement.deadline_at ? <Fragment>
					{" "}and bidding deadline
					{" "}<TimeElement at={procurement.deadline_at} />
				</Fragment> : null}.
			</p>
		</Header>

		<Section>
			<div id="summary">
				<IntegrityIndicatorElement
					procurement={procurement}
					contracts={contracts}
				/>

				<div class="attribute">
					<h3>Estimated Cost</h3>
					<strong>{procurement.estimated_cost != null ? <MoneyElement
						currency={procurement.estimated_cost_currency}
						amount={procurement.estimated_cost}
					/> : " "}</strong>
				</div>

				<div class="attribute">
					<h3>Actual Cost</h3>
					<strong>{procurement.cost != null ? <MoneyElement
						currency={procurement.cost_currency}
						amount={procurement.cost}
					/> : " "}</strong>
				</div>

				<br />

				<div class="attribute">
					<h3>Duration</h3>
					<strong>{biddingDuration != null ? <Fragment>
						{Math.floor(biddingDuration)}
						{" "}
						{_.plural(biddingDuration, "day", "days")}
					</Fragment> : null}</strong>
				</div>

				<div class="attribute">
					<h3>Bidders</h3>
					<strong>
						{procurement.bidder_count}
						{" "}
						{_.plural(procurement.bidder_count, "bidder", "bidders")}
					</strong>
				</div>

				<div class="attribute">
					<h3>Bids</h3>
					<strong>
						{procurement.bid_count}
						{" "}
						{_.plural(procurement.bid_count, "bid", "bids")}
					</strong>
				</div>

				<br />

				<div class="attribute">
					<h3>Disputes</h3>
					<strong>
						{procurement.dispute_count}
						{" "}
						{_.plural(procurement.dispute_count, "dispute", "disputes")}
					</strong>
				</div>
			</div>
		</Section>

		<Section id="details">
			<Heading>Details</Heading>

			<table>
				<tr>
					<th>Process Type</th>
					<td>{
						PROCEDURE_TYPES[procurement.procedure_type] ||
						ESTONIAN_PROCEDURE_TYPES[procurement.procedure_type]
					}</td>
				</tr>

				<tr>
					<th>Offers Revealed At</th>
					<td>{procurement.revealed_at
						? <TimeElement at={procurement.revealed_at} />
						: null
					}</td>
				</tr>
			</table>
		</Section>

		{contracts.length > 0 ? <Section id="contracts-section">
			<Heading>Contracts</Heading>

			<Table id="contracts">
				<tbody>{contracts.map(function(contract) {
					var sellerPath = Paths.organizationPath({
						country: contract.seller_country,
						id: contract.seller_id
					})

					var donations = contract.donations

					return <Fragment>
						<tr id={"contract-" + contract.id} class="contract">
							<td>
								<h3 class="seller-name">{contract.seller_id ? <a
									href={sellerPath}>
										<FlagElement country={contract.seller_country} />
										{contract.seller_name}
									</a> : "Non-disclosed"}
								</h3>

								<p class="title">
									{contract.nr}. {contract.title}
								</p>

								<p class="dates">
									Signed <DateElement at={contract.created_at} />

									{contract.deadline_at ? <Fragment>
										{" "}with completion deadline
										{" "}<DateElement at={contract.deadline_at} />
									</Fragment> : null}.
								</p>
							</td>

							<td class="cost-column">
								<strong>{contract.cost != null ? <MoneyElement
									currency={contract.cost_currency}
									amount={contract.cost}
								/> : "Non-disclosed"}</strong>

								{contract.estimated_cost != null ? <Fragment>
									<br />

									est. <MoneyElement
										currency={contract.estimated_cost_currency}
										amount={contract.estimated_cost}
									/>
								</Fragment> : null}
							</td>
						</tr>

						{donations.length > 0 ? <tr class="contract-donations">
							<td colspan="2">
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
		</Section> : null}
	</Page>
}

function IntegrityIndicatorElement(attrs) {
	var procurement = attrs.procurement
	var contracts = attrs.contracts

	var indicators = Procurement.indicateIntegrity(procurement, contracts)
	indicators = _.filterValues(indicators, (v) => v != null)
	var count = _.keys(indicators).length
	var okCount = _.reduce(indicators, (sum, v) => sum + (v ? 1 : 0), 0)

	return <div class="attribute" id="integrity-indicators">
		<h3>Integrity Indicators</h3>
		<strong>{okCount} out of {count}</strong>

		<ul>{_.map(indicators, function(ok, indicator) {
			if (ok == null) return null

			return <li>
				<i class={ok ? "ok" : "not-ok"} />
				{INDICATORS[indicator][ok ? 1 : 0]}
			</li>
		})}
		</ul>
	</div>
}
