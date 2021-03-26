var diffInDays = require("date-fns").differenceInCalendarDays

// Available procedure types: https://op.europa.eu/en/web/eu-vocabularies/at-dataset/-/resource/dataset/procurement-procedure-type.
exports.PROCEDURE_TYPES = {
	open: "Open procedure",
	restricted: "Restricted procedure",
	"competitive-negotation": "Competitive procedure with negotiation",
	"competitive-dialog": "Competitive dialogue",
	"innovation-partnership": "Innovation partnership",
	"involving-negotation": "Involving negotation",
	"negotatiated-with-prior-call": "Negotiated with prior call for competition",
	"award-contract-without-call": "Award of a contract without prior publication of a call for competition",
	"award-contract-with-prior-publication": "Award procedure with prior publication of a concession notice",
	"award-contract-without-prior-publication": "Award procedure without prior publication of a concession notice",
	"2014-24-eu/negotiated-without-publication": "Negotiated procedure without prior publication (in accordance with Article 32 of Directive 2014/24/EU)",
	"2014-24-eu/award-contract-without-call": "Award of a contract without prior publication of a call for competition"
}

exports.ESTONIAN_PROCEDURE_TYPES = {
	A: "open", // Avatud hankemenetlus
	DP: null, // Dünaamilise hankesüsteemi piiratud hankemenetlus
	G: null, // Konkurentsipõhine läbirääkimistega hankemenetlus
	IK: null, // Avatud ideekonkurss
	KE: null, // Kontsessiooni erimenetlus
	LA: null, // Erandi alusel
	LM: null, // Lihthange
	LT: null, // Lihtsustatud korras teenuste tellimine
	M: null, // Minikonkurss raamlepingu alusel
	IP: "innovation-partnership", // Innovatsioonipartnerlus
	MS: null, // Toetuse saaja ost
	PK: null, // Piiratud osalejate arvuga ideekonkurss
	PN: null, // Eelteade tähtaegade lühendamiseks
	P: "restricted", // Piiratud hankemenetlus
	SE: null, // Sotsiaal- ja eriteenuste erimenetlus
	T: null, // Väljakuulutamiseta läbirääkimistega hankemenetlus
	VD: "competitive-dialog", // Võistlev dialoog
	VO: null // Väikehange
}

exports.ORGANIZATION_ROLES = {
	unknown: "Unknown",
	owner: "Owner",
	founder: "Founder",
	general_manager: "General Manager",
	representative_manager: "Representative Manager",
	authorized_representative: "Authorized Representative",
	administrator: "Administrator",
	administrative_manager: "Administrative Manager",
	liquidator: "Liquidator",
	auditor: "Auditor",
	auditor_of_nonmonetary_contribution:
		"Auditor of Non-Monetary Contribution Valuation",
	branch_representative: "Branch Representative",
	branch_director: "Branch Director",
	procurator: "Procurator",
	shareholder: "Shareholder",
	authorized_person: "Authorized Person",
	limited_partner: "Limited Partner",
	limited_partner_representative: "Limited Partner Representative",
	sole_trader: "Sole Trader",
	bankcruptcy_trustee: "Trustee in Bankcruptcy",
	interim_bankcruptcy_trustee:
		"Interim Trustee in Bankcruptcy Acting As Liquidator",
	depositary_of_documents: "Depositary of Documents",
	entrepreneur: "Entrepreneur",
	contact: "Contact Person",
	person_for_procedural_documents: "Person Competent For Procedural Documents",
	representative: "Representative",
	general_partner: "General Partner",
	association_member: "General Partner",
	supervising_bankcruptcy_trustee: "Supervising Trustee in Bankcruptcy",

	bankcruptcy_committee_member: "Bankcruptcy Comittee Member",
	auditing_committee_member: "Auditing Comittee Member",
	administrative_board_member: "Administrative Board Member",

	executive_board_member: "Executive Board Member",
	executive_board_liquidator_member: "Liquidator as Executive Board Member",
	executive_board_sole_member: "Executive Board Sole Member",
	chair_of_executive_board: "Chair of Executive Board",
	director_of_executive_board: "Director of Executive Board",

	// Supervisory Board is sometimes called the Board of Directors.
	supervisory_board_member: "Supervisory Board Member",
	chair_of_supervisory_board: "Chair of Supervisory Board",
	deputy_chair_of_supervisory_board: "Deputy Chair of Supervisory Board"
}

exports.indicateIntegrity = function(procurement, _contracts, sellers) {
	// Inspired by Opentender's found red flag measurements.
	// https://opentender.eu/ee/about/how-opentender-works
	// https://drive.google.com/file/d/1u2o9MH2p0mhVJeMmUzZsAKq5HzQJP2Us/view?usp=sharing
	var indicators = {}

	indicators.multipleBidders = (
		procurement.bidder_count == 0 ? null :
		procurement.bidder_count != 1
	)

	indicators.costAndEstimation = (
		procurement.estimated_cost != null &&
		procurement.cost != null
	) ? (
		procurement.cost <= procurement.estimated_cost * 1.1
	) : null

	indicators.disputes = procurement.dispute_count == 0

	indicators.sellerDonations = sellers.length > 0 ? (
		sellers.every((seller) => seller.donations.length == 0)
	) : null

	var biddingPeriodIndicator = null

	if (procurement.deadline_at) {
		var biddingDurationInDays = diffInDays(
			procurement.deadline_at,
			procurement.published_at
		)

		// Time ranges originate from digiwhist_indicatorlist_description_v1.0.xlsx
		// "bidding deadline" sheet available from the link above.
		if (procurement.country == "EE") biddingPeriodIndicator = !(
			biddingDurationInDays >= 0 && biddingDurationInDays < 33 ||
			biddingDurationInDays >= 50 && biddingDurationInDays < 58
		)
		else if (procurement.country == "LV") biddingPeriodIndicator = !(
			biddingDurationInDays >= 0 && biddingDurationInDays < 41 ||
			biddingDurationInDays >= 51 && biddingDurationInDays < 58
		)
	}

	indicators.biddingPeriod = biddingPeriodIndicator

	return indicators
}
