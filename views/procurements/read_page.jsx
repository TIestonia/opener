/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var {Fragment} = Jsx
var Page = require("../page")
var Paths = require("root/lib/paths")
var Procurement = require("root/lib/procurement")
var {Section} = Page
var {Heading} = Page
var formatDateTime = require("date-fns/format")
var {PROCEDURE_TYPES} = require("root/lib/procurement")

var FLAGS = {
	"bidding-period": "Bidding period is between 0–32 or 50–57 days."
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
	var flags = Procurement.flag(procurement)

	return <Page page="procurement" req={attrs.req} title={procurement.title}>
		<header id="header">
			<h1 class="centered">{procurement.title}</h1>

			<a
				class="centered buyer-name"
				href={Paths.organizationPath(buyer)}
			>
				{buyer.name}
			</a>
		</header>

		<Section>
			<table class="properties">
				<tr>
					<th>Process Type</th>
					<td>{
						PROCEDURE_TYPES[procurement.procedure_type] ||
						ESTONIAN_PROCEDURE_TYPES[procurement.procedure_type]
					}</td>
				</tr>

				<tr>
					<th>Published At</th>
					<td><TimeElement at={procurement.published_at} /></td>
				</tr>

				<tr>
					<th>Deadline At</th>
					<td>{procurement.deadline_at
						? <TimeElement at={procurement.deadline_at} />
						: null
					}</td>
				</tr>

				<tr>
					<th>Offers Revealed At</th>
					<td>{procurement.revealed_at
						? <TimeElement at={procurement.revealed_at} />
						: null
					}</td>
				</tr>

				<tr>
					<th>Estimated Cost</th>
					<td>{procurement.estimated_cost != null ? _.formatMoney(
						procurement.estimated_cost_currency,
						procurement.estimated_cost
					) : "Non-disclosed"}</td>
				</tr>

				<tr>
					<th>Actual Cost</th>
					<td>{procurement.cost != null ? _.formatMoney(
						procurement.cost_currency,
						procurement.cost
					) : "Non-disclosed"}</td>
				</tr>

				<tr>
					<th>Bidder Count</th>
					<td>{procurement.bidder_count}</td>
				</tr>

				<tr>
					<th>Bid Count</th>
					<td>{procurement.bid_count}</td>
				</tr>

				<tr>
					<th>Dispute Count</th>
					<td>{procurement.dispute_count}</td>
				</tr>
			</table>

			{flags.length > 0 ? <div class="flags">
				<Heading>Red Flags</Heading>
				<ol>{flags.map((flag) => <li>{FLAGS[flag]}</li>)}</ol>
			</div> : null}
		</Section>

		{contracts.length > 0 ?<Section>
			<Heading>Contracts</Heading>

			<table class="opener-table contracts">
				<thead>
					<th>
						Nr<br />
						<small>Date</small>
					</th>

					<th>Title</th>

					<th>
						Organization<br />
						<small>Possibly Related Donations</small>
					</th>

					<th>Estimated Cost</th>
					<th>Cost</th>
				</thead>

				<tbody>{contracts.map(function(contract) {
					var sellerPath = Paths.organizationPath({
						country: contract.seller_country,
						id: contract.seller_id
					})

					return <tr id={"contract-" + contract.id}>
						<td>
							{contract.nr}<br />
							<small><DateElement at={procurement.published_at} /></small>
						</td>

						<td>{contract.title}</td>

						<td>{contract.seller_id ? <Fragment>
							<a href={sellerPath} class="link-button">
								{contract.seller_name}
							</a><br />

							<ul>{contract.donations.map((donation) => <li><small>
								{donation.donator_name} {_.formatMoney(
									donation.currency,
									donation.amount
								)} to {donation.party_name} on {donation.date}.
							</small></li>)}</ul>
						</Fragment> : "Non-disclosed"}</td>

						<td>{contract.estimated_cost != null ? _.formatMoney(
							contract.estimated_cost_currency,
							contract.estimated_cost
						) : "Non-disclosed"}</td>

						<td>{contract.cost != null ? _.formatMoney(
							contract.cost_currency,
							contract.cost
						) : "Non-disclosed"}</td>
					</tr>
				})}</tbody>
			</table>
		</Section> : null}
	</Page>
}

function TimeElement(attrs) {
	var at = attrs.at
	return <time datetime={at.toJSON()}>{formatIsoDateTime(at)}</time>
}

function DateElement(attrs) {
	var at = attrs.at
	return <time datetime={at.toJSON()}>{_.formatIsoDate(at)}</time>
}

function formatIsoDateTime(time) {
	return formatDateTime(time, "YYYY-MM-DD HH:mm:ss")
}
