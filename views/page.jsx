/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Jsx = require("j6pack")
var LIVERELOAD_PORT = process.env.LIVERELOAD_PORT || 35729
var ENV = process.env.ENV
var COUNTRIES = require("root/lib/countries")
exports = module.exports = Page
exports.Header = Header
exports.Section = Section
exports.Heading = Heading
exports.Subheading = Subheading
exports.Table = Table
exports.DateElement = DateElement
exports.TimeElement = TimeElement
exports.MoneyElement = MoneyElement
exports.FlagElement = FlagElement

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
				<Centered>
					<a href="/" class="home">Opener</a>

					<menu class="pages">
						<ul>
							<li class={prefixed("/procurements/", path)}>
								<a href="/procurements">Procurements</a>
							</li>

							<li class={prefixed("/organizations/", path)}>
								<a href="/organizations">Organizations</a>
							</li>

							<li class={selected("/about", path)}>
								<a href="/about">About</a>
							</li>
						</ul>
					</menu>
				</Centered>
			</nav>

			<main id="main">{children}</main>
		</body>
	</html>
}

function Centered(_attrs, children) {
	return <div class="centered">{children}</div>
}

function Header(_attrs, children) {
	return <header id="header" class="centered">
		{children}
	</header>
}

function Section(attrs, children) {
	return <section id={attrs && attrs.id} class="centered">
		{children}
	</section>
}

function Heading(_attrs, children) {
	return <h2 class="page-heading">{children}</h2>
}

function Subheading(_attrs, children) {
	return <h3 class="page-subheading">{children}</h3>
}

function Table(attrs, children) {
	return <div class="opener-table-wrapper">
		<table {...attrs}>{children}</table>
	</div>
}

function TimeElement(attrs) {
	var at = attrs.at
	return <time datetime={at.toJSON()}>{_.formatDateTime("us", at)}</time>
}

function DateElement(attrs) {
	var at = attrs.at
	return <time datetime={at.toJSON()}>{_.formatDate("us", at)}</time>
}

function MoneyElement(attrs) {
	var amount = attrs.amount
	var currency = attrs.currency

	var text = _.formatMoney(currency, amount)

	var major, cents = ""
	if (/\.\d+$/.test(text)) [major, cents] = text.split(".")
	else major = text

	return <span class="opener-money" title={_.formatPrice(currency, amount)}>
		{major}{cents ? <sup>.{cents}</sup> : null}
	</span>
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

var COUNTRY_FLAGS = {
	EE: "/assets/flag-ee.png",
	LV: "/assets/flag-lv.png"
}

function FlagElement(attrs) {
	var country = attrs.country
	var src = COUNTRY_FLAGS[country]
	var name = COUNTRIES[country].name
	return src ? <img class="opener-flag" src={src} alt={name} /> : null
}

function prefixed(prefix, path) {
	return path.startsWith(prefix) ? "selected" : ""
}

function selected(prefix, path) {
	return prefix == path ? "selected" : ""
}
