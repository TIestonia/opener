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
var {javascript} = require("root/lib/jsx")
var concat = Array.prototype.concat.bind(Array.prototype)
var flatten = Function.apply.bind(Array.prototype.concat, Array.prototype)
var {PROCEDURE_TYPES} = require("root/lib/procurement")
var ROLES = require("root/lib/procurement").ORGANIZATION_ROLES
var outdent = require("root/lib/outdent")

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

var POLITICAL_PARTY_LOGOS = {
	"ISAMAA Erakond": "/assets/isamaa.svg",
	"Eesti Reformierakond": "/assets/reformierakond.svg",
	"Eesti Keskerakond": "/assets/keskerakond.svg",
	"Sotsiaaldemokraatlik Erakond": "/assets/sotsiaaldemokraadid.svg"
}

module.exports = function(attrs) {
	var {procurement} = attrs
	var {buyer} = attrs
	var {contracts} = attrs
	var {sellers} = attrs
	var sellersById = _.indexBy(sellers, (s) => s.country + ":" + s.id)

	var biddingDuration = procurement.deadline_at ? diffInDays(
		procurement.deadline_at,
		procurement.published_at
	) : null

	return <Page page="procurement" req={attrs.req} title={procurement.title}>
		<script src="/assets/page.js" />

		<Header>
			<h1>{procurement.title}</h1>

			<p class="header-subtitle buyer-name">
				<FlagElement country={procurement.country} />

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
					sellers={sellers}
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
			{procurement.description ? <p class="description">
				{procurement.description}
			</p> : null}

			<table>
				<tr>
					<th>Process Type</th>
					<td>{
						PROCEDURE_TYPES[procurement.procedure_type] ||
						ESTONIAN_PROCEDURE_TYPES[procurement.procedure_type] ||
							procurement.procedure_type ||
							"Unknown"
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

		<Section id="graph-section">
			<figure>
				<div id="graph" />

				<figcaption>
					Showing board-level people associated with the buyer and seller organizations 12 months prior up to 12 months after the procurement process. Also shown are their political affiliations and donations within the same period.
				</figcaption>
			</figure>

			<script>{javascript`(function() {
				var visualize = require("@opener/page").visualize

				visualize(
					document.getElementById("graph"),
					${renderGraph(procurement, buyer, contracts, sellers)}
				)
			})()`}</script>
		</Section>

		{contracts.length > 0 ? <Section id="contracts-section">
			<Heading>Contracts</Heading>

			<Table id="contracts">
				<tbody>{contracts.map(function(contract) {
					var sellerId = contract.seller_country + ":" + contract.seller_id
					var seller = sellersById[sellerId]
					var donations = seller.donations

					return <Fragment>
						<tr id={"contract-" + contract.id} class="contract">
							<td>
								<h3 class="seller-name">{seller ? <a
									href={Paths.organizationPath(seller)}>
										<FlagElement country={seller.country} />
										{seller.name}
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
		</Section> : null}
	</Page>
}

function IntegrityIndicatorElement(attrs) {
	var {procurement} = attrs
	var {contracts} = attrs
	var {sellers} = attrs

	var indicators = _.filterValues(Procurement.indicateIntegrity(
		procurement,
		contracts,
		sellers
	), (v) => v != null)

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

function renderGraph(procurement, buyer, contracts, sellers) {
	var contractsBySeller = _.groupBy(contracts, (contract) => (
		contract.seller_country + ":" + contract.seller_id
	))

	var procurementNode = {
		id: `procurements/${procurement.country}:${procurement.id}`,
		group: "procurement",
		x: 0,
		y: 0
	}

	var buyerNode = {
		id: `organizations/${buyer.country}:${buyer.id}`,

		label: outdent`
			${escapeHtmlForVis(buyer.name)}
			<i>Buyer</i>
		`,

		group: "buyer"
	}

	var buyerPeople = buyer.people
	var sellerPeople = flatten(_.map(sellers, "people"))

	var people = _.uniqBy(concat(buyerPeople, sellerPeople), (person) => (
		person.country + ":" + person.id
	))

	var peopleNodes = people.map(function(person) {
		var sex = person.country == "EE" && person.personal_id
			? _.sexFromPersonalId(person.personal_id)
			: "male"

		return {
			id: `people/${person.country}:${person.id}`,
			label: person.name,
			image: "/assets/person-" + sex + ".svg",
			group: "person"
		}
	})

	var sellerNodes = _.uniqBy(sellers.map((seller) => ({
		id: `organizations/${seller.country}:${seller.id}`,

		label: outdent`
			${escapeHtmlForVis(seller.name)}
			<i>Seller</i>
		`,

		group: "seller"
	})), "id")

	var politicalParties = _.uniqBy(people.map((person) => person.party_id ? {
		id: person.party_id,
		name: person.party_name,
	} : null).filter(Boolean), "id")

	var politicalPartyNodes = politicalParties.map((party) => ({
		id: `political-parties/${party.id}`,
		label: party.name,
		image: POLITICAL_PARTY_LOGOS[party.name],
		shape: party.name in POLITICAL_PARTY_LOGOS ? "image" : "box",
		group: "political-party"
	}))

	var buyerRelationship = {
		from: `organizations/${buyer.country}:${buyer.id}`,
		to: `procurements/${procurement.country}:${procurement.id}`,
		arrows: {to: {enabled: true}}
	}

	var buyerPeopleRelationships = buyer.people.map((person) => ({
		from: `organizations/${buyer.country}:${buyer.id}`,
		to: `people/${person.country}:${person.id}`,
		dashes: true
	}))

	var contractRelationships = sellers.map(function(seller) {
		var sellerId = seller.country + ":" + seller.id
		var contracts = contractsBySeller[sellerId] || []
		var amount = _.sum(contracts.map((c) => c.cost || c.estimated_cost || 0))


		return {
			from: `procurements/${procurement.country}:${procurement.id}`,
			to: `organizations/${seller.country}:${seller.id}`,
			arrows: {to: {enabled: true}},
			label: _.formatMoney("EUR", amount)
		}
	})

	var sellerPeopleRelationships = flatten(sellers.map((seller) => (
		seller.people.map((person) => ({
			from: `organizations/${seller.country}:${seller.id}`,
			to: `people/${person.country}:${person.id}`,
			dashes: true
		})
	))))

	var donations = flatten(_.map(sellers, "donations"))
	var donationsByDonatorAndParty = _.groupBy(donations, (donation) => [
		donation.donator_country,
		donation.donator_id,
		donation.party_id
	].join(":"))

	var donationRelationships = _.map(donationsByDonatorAndParty,
		function(donations) {
		var donation = donations[0]
		var amount = _.sum(_.map(donations, "amount"))

		return {
			from: `people/${donation.donator_country}:${donation.donator_id}`,
			to: `political-parties/${donation.party_id}`,
			group: "donation",
			arrows: {to: {enabled: true}},
			color: "#e21a58",
			label: _.formatMoney(donation.currency, amount),
		}
	})

	var politicalRelationships = people.map((person) => person.party_id ? {
		from: `people/${person.country}:${person.id}`,
		to: `political-parties/${person.party_id}`,
		dashes: true
	} : null).filter(Boolean)

	return {
		nodes: concat(
			procurementNode,
			buyerNode,
			peopleNodes,
			sellerNodes,
			politicalPartyNodes
		),

		edges: concat(
			buyerRelationship,
			buyerPeopleRelationships,
			contractRelationships,
			sellerPeopleRelationships,
			donationRelationships,
			politicalRelationships
		)
	}
}

function escapeHtmlForVis(text) {
	// While https://visjs.github.io/vis-network/examples/network/labels/labelMultifont.html
	// says the only entities Vis.js is supposed to support are &lt; and &amp;,
	// it doesn't seem to even support those.
	// https://github.com/visjs/vis-network/blob/7c18684006827125b37f736fabeb5b15e338a666/lib/network/modules/components/shared/LabelSplitter.js#L414
	// seems to intend to do some entity parsing, but for some reason it's not
	// working as of Sep 24, 2020.
	return text.replace(/</g, "«")
}
