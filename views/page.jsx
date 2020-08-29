/** @jsx Jsx */
var Jsx = require("j6pack")
var LIVERELOAD_PORT = process.env.LIVERELOAD_PORT || 35729
var ENV = process.env.ENV
exports = module.exports = Page
exports.Header = Header
exports.Section = Section
exports.Heading = Heading

function Page(attrs, children) {
	var req = attrs.req
	var title = attrs.title
	var page = attrs.page
	var path = (req.baseUrl || "") + req.path

	return <html lang="en" class={attrs.class}>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width" />
			<link rel="stylesheet" href="/assets/page.css" type="text/css" />
			<title>{title == null ? "" : title + " - "} Opener</title>
			<LiveReload req={req} />
		</head>

		<body id={page + "-page"}>
			<nav id="nav">
				<div class="centered">
					<a href="/" class="home">Opener</a>

					<menu class="pages">
						<ul>
							<li><a
								href="/procurements"
								class={prefixed("/procurements/", path)}
							>
								Procurements
							</a></li>

							<li><a
								href="/procurement-contracts"
								class={prefixed("/procurement-contracts/", path)}
							>
								Contracts
							</a></li>

							<li><a
								href="/organizations"
								class={prefixed("/organizations/", path)}
							>
								Organizations
							</a></li>
						</ul>
					</menu>
				</div>
			</nav>

			<main id="main">{children}</main>
		</body>
	</html>
}

function Header(_attrs, children) {
	return <header id="header">
		<h1 class="centered">{children}</h1>
	</header>
}

function Section(_attrs, children) {
	return <section class="centered">{children}</section>
}

function Heading(_attrs, children) {
	return <h2 class="page-heading">{children}</h2>
}

function LiveReload(attrs) {
	if (ENV != "development") return null
	var req = attrs.req

	return <script
		src={`http://${req.hostname}:${LIVERELOAD_PORT}/livereload.js?snipver=1`}
		async
		defer
	/>
}

function prefixed(prefix, path) {
	return path.startsWith(prefix) ? "selected" : ""
}
