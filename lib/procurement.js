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

exports.ORGANIZATION_ROLES = {
	JUHE: "Chairman of the board",
	JUHL: "Management board member",
	D: "Auditor",
	S: "Stockholder",
	N: "Member of the supervisory board",
	E: "Chairman of the supervisory board",
	PROK: "Procurator"
}

exports.flag = function(procurement) {
	// Inspired by Opentender's found red flag measurements.
	// https://opentender.eu/ee/about/how-opentender-works
	// https://drive.google.com/file/d/1u2o9MH2p0mhVJeMmUzZsAKq5HzQJP2Us/view?usp=sharing
	var flags = []

	if (procurement.deadline_at) {
		var biddingDays = diffInDays(
			procurement.deadline_at,
			procurement.published_at
		)

		if (
			biddingDays >= 0 && biddingDays <= 32 ||
			biddingDays >= 50 && biddingDays <= 57
		) flags.push("bidding-period")
	}

	return flags
}
