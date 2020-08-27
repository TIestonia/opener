/** @jsx Jsx */
var Jsx = require("j6pack")
var Page = require("../page")
var Paths = require("root/lib/paths")
var {Header} = Page
var {Section} = Page

module.exports = function(attrs) {
	var organizations = attrs.organizations

	return <Page
		page="organizations"
		req={attrs.req}
		title="Organizations"
	>
		<Header>Organizations</Header>

		<Section>
			<ol class="organizations">{organizations.map(function(organization) {
				return <li class="organization">
					<h2>
						<a href={Paths.organizationPath(organization)}>
							{organization.name}
						</a>
					</h2>

					<ul>
						{organization.procurement_count > 0 ? <li>
							{organization.procurement_count} procurements
						</li> : null}

						{organization.contract_count > 0 ? <li>
							{organization.contract_count} contracts
						</li> : null}
					</ul>
				</li>
			})}</ol>
		</Section>
	</Page>
}
