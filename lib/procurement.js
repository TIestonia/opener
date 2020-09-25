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
	MS: null, // Toetuse saaja ost
	PK: null, // Piiratud osalejate arvuga ideekonkurss
	PN: null, // Eelteade tähtaegade lühendamiseks
	P: "restricted", // Piiratud hankemenetlus
	SE: null, // Sotsiaal- ja eriteenuste erimenetlus
	T: null, // Väljakuulutamiseta läbirääkimistega hankemenetlus
	VD: "competitive-dialog", // Võistlev dialoog
	VO: null // Väikehange
}

// Values come from klassifikaatorid_v1 response.
// http://www2.rik.ee/schemas/xtee6/arireg/live/xroad6_klassifikaatorid_v1.xsd
// See the Makefile for a request task.
exports.ORGANIZATION_ROLES = {
	A: "Founder",
	B: "Founder",
	ASES: "Person with right to represent the agency",
	D: "Auditor",
	E: "Chairman of the supervisory board",
	JUHE: "Chairman of the board",
	JUHL: "Management board member",
	N: "Member of the supervisory board",
	PROK: "Procurator",
	S: "Stockholder",
	O: "Shareholder",
	V: "Authorised person",
	M: "Auditor of valuation of non-monetary contribution",
	JUHJ: "Management board member (director)",
	UOSAN: "Limited partner",
	FIE: "Sole trader",
	PANKR: "Trustee in bankruptcy"
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
