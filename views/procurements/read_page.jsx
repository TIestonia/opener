/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Section} = Page
var {Heading} = Page
var formatDateTime = require("date-fns/format")
var {PROCEDURE_TYPES} = require("root/lib/procurement")

module.exports = function(attrs) {
	var procurement = attrs.procurement
	var buyer = attrs.buyer
	var contracts = attrs.contracts

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
					<td>{PROCEDURE_TYPES[procurement.procedure_type]}</td>
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
		</Section>

		{contracts.length > 0 ?<Section>
			<Heading>Contracts</Heading>

			<table class="opener-table contracts">
				<thead>
					<th>Nr</th>
					<th>Title</th>
					<th>Organization</th>
					<th>Estimated Cost</th>
					<th>Cost</th>
				</thead>

				<tbody>{contracts.map(function(contract) {
					var sellerPath = Paths.organizationPath({
						country: contract.seller_country,
						id: contract.seller_id
					})

					return <tr id={"contract-" + contract.id}>
						<td>{contract.nr}</td>
						<td>{contract.title}</td>

						<td>{contract.seller_id ? <a href={sellerPath} class="link-button">
							{contract.seller_name}
						</a> : "Non-disclosed"}</td>

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

function formatIsoDateTime(time) {
	return formatDateTime(time, "YYYY-MM-DD HH:mm:ss")
}
