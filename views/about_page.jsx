/** @jsx Jsx */
var Jsx = require("j6pack")
var Page = require("./page")
var Markdown = require("root/lib/markdown")
var {Header} = Page
var {Section} = Page
var ABOUT_HTML = Markdown.readSync(__dirname + "/about_page.md")

module.exports = function(attrs) {
	return <Page page="about" req={attrs.req} title="About">
		<Header>
			<h1>About</h1>
		</Header>

		<Section class="text-section">
			{Jsx.html(ABOUT_HTML)}
		</Section>
	</Page>
}
