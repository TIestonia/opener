/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Section} = Page

module.exports = function(attrs) {
	var contracts = attrs.contracts

	return <Page
		page="procurement-contracts-after-donation"
		req={attrs.req}
		title="Contracts"
	>
		<Header>Contracts Won After Donations</Header>

		<Section>
			<table class="contracts opener-table">
				<thead>
					<th>Date</th>
					<th>
						Contract Title<br />
						<small>Procurement</small>
					</th>

					<th>
						Won By<br />
						<small>Possibly Related Donations</small>
					</th>
				</thead>

				<tbody>{contracts.map(function(contract) {
					return <tr>
						<td>{_.formatIsoDate(contract.created_at)}</td>

						<td>
							<a href={Paths.contractPath(contract)} class="link-button">
								{contract.title}
							</a>
							<br />
							<small>
								<strong>{contract.procurement_title}</strong>
								<br />
								<span>{contract.buyer_name}</span>
							</small>
						</td>

						<td>
							<a class="link-button" href={Paths.organizationPath({
								country: contract.seller_country,
								id: contract.seller_id
							})}>{contract.seller_name}</a><br />

							<ul>{contract.donations.map((donation) => <li><small>
								{donation.donator_name} {_.formatMoney(
									donation.currency,
									donation.amount
								)} to {donation.party_name} on {donation.date}.
							</small></li>)}</ul>
						</td>
					</tr>
				})}</tbody>
			</table>
		</Section>
	</Page>
}
