/** @jsx Jsx */
var Jsx = require("j6pack")
var Page = require("./page")
var {Header} = Page
var {Section} = Page

module.exports = function(attrs) {
	var title = attrs.title
	var body = attrs.body

	return <Page
		page="error"
		req={attrs.req}
		title={title || "An error occurred"}
	>
		<Header>
			<h1>{title || "An error occurred. Sorry!"}</h1>
		</Header>

		<Section>{body ? <p>{body}</p> : null}</Section>
	</Page>
}
