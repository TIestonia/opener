var Config = require("root/config")
var RegisterXml = require("root/lib/estonian_business_register_xml")
var fetch = require("fetch-off")
var URL = "https://ariregxmlv6.rik.ee"

var api = require("fetch-defaults")(fetch, URL, {
	timeout: 10000,
	headers: {Accept: "text/xml"}
})

api = require("fetch-parse")(api, {xml: true})
api = require("fetch-throw")(api)
exports = module.exports = api

exports.readOrganization = function(code) {
	return exports("/", {
		method: "POST",
		headers: {"Content-Type": "text/xml"},

		body: `<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/">
			<Header/>

			<Body xmlns:reg="http://arireg.x-road.eu/producer/">
				<reg:detailandmed_v3>
					<reg:keha>
						<reg:ariregister_kasutajanimi>
							${Config.estonianBusinessRegisterUser}
						</reg:ariregister_kasutajanimi>

						<reg:ariregister_parool>
							${Config.estonianBusinessRegisterPassword}
						</reg:ariregister_parool>

						<reg:ariregistri_kood>${code}</reg:ariregistri_kood>

						<reg:ariregister_valjundi_formaat>
							xml
						</reg:ariregister_valjundi_formaat>

						<reg:yandmed>true</reg:yandmed>
						<reg:iandmed>true</reg:iandmed>
						<reg:kandmed>false</reg:kandmed>
						<reg:dandmed>false</reg:dandmed>
						<reg:maarused>false</reg:maarused>
						<reg:keel>eng</reg:keel>
					</reg:keha>
				</reg:detailandmed_v3>
			</Body>
		</Envelope>`
	}).then(function(res) {
		// The register responds with an empty <ettevotjad> tag but no <item> if
		// not found.
		var soap = RegisterXml.parse(res.body).soap$Envelope.soap$Body
		var orgs = soap.detailandmed_v3Response.keha.ettevotjad.item || null
		return orgs || (orgs instanceof Array ? orgs[0].item : orgs.item)
	})
}
