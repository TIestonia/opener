/** @jsx Jsx */
var Jsx = require("j6pack")
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Section} = Page

module.exports = function(attrs) {
	var req = attrs.req
	var contracts = attrs.contracts
	var path = req.baseUrl

	return <Page
		page="procurement-contracts"
		req={attrs.req}
		title="Contracts"
	>
		<Header>Contracts</Header>

		<Section>
			<ul class="queries">
				<li>
					<a href={path + "/after-donation"} class="link-button">
						Contracts won after donation
					</a>
				</li>
			</ul>

			<ol class="contracts">{contracts.map(function(contract) {
				return <li>
					<h2>
						<a href={Paths.contractPath(contract)} class="link-button">
							{contract.title}
						</a>

						{contract.seller_name ? <span>
							{" — "}{contract.seller_name}
						</span> : null}
					</h2>

					<span>{contract.procurement_title}</span>
					{" — "}
					<span>{contract.buyer_name}</span>
				</li>
			})}</ol>
		</Section>
	</Page>
}
