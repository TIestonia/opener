/** @jsx Jsx */
var _ = require("root/lib/underscore")
var Qs = require("querystring")
var Jsx = require("j6pack")
var LIVERELOAD_PORT = process.env.LIVERELOAD_PORT || 35729
var ENV = process.env.ENV
var COUNTRIES = require("root/lib/countries")
var {javascript} = require("root/lib/jsx")
var {COMPARATOR_SUFFIXES} = require("root/lib/filtering")
var concat = Array.prototype.concat.bind(Array.prototype)
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
exports.SortButton = SortButton
exports.FiltersView = FiltersView
exports.PaginationView = PaginationView

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
	return <section
		id={attrs && attrs.id}
		class={"centered " + (attrs && attrs.class || "")}
	>
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

function SortButton(attrs, children) {
	var {name} = attrs
	var {sorted} = attrs
	var defaultDirection = attrs.direction || "asc"
	var direction = !sorted ? defaultDirection : sorted == "asc" ? "desc" : "asc"

	var {path} = attrs
	var {query} = attrs
	query = _.assign({}, query, {order: (direction == "asc" ? "" : "-") + name})
	var url = path + "?" + Qs.stringify(query)

	return <a href={url} class={"column-name sort-button " + (sorted || "")}>
		{children}
	</a>
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

function FiltersView(_attrs, children) {
	return <div class="opener-filters">
		<input id="filters-toggle" type="checkbox" hidden />

		<label for="filters-toggle" class="link-button">
			Show search and filters
		</label>

		<fieldset>
			{children}
		</fieldset>

		<script>{javascript`(function() {
			var forEach = Function.call.bind(Array.prototype.forEach)
			var selects = document.getElementsByClassName("comparison-select")
			var COMPARATOR_SUFFIXES = ${COMPARATOR_SUFFIXES}

			forEach(selects, function(select) {
				select.addEventListener("change", handleChange)
			})

			function handleChange(ev) {
				var select = ev.target
				var comparator = select.value

				var input = select.nextElementSibling
				input.name = input.name.replace(/[<>]+$/, "")
				input.disabled = !comparator

				if (comparator) {
					input.name += COMPARATOR_SUFFIXES[comparator]
					input.focus()
				}
				else input.value = ""
			}
		})()`}</script>
	</div>
}

function PaginationView(attrs) {
	var {total} = attrs
	var {index} = attrs
	var {pageSize} = attrs
	var {path} = attrs
	var {query} = attrs

	var pages = _.times(Math.ceil(total / pageSize), _.id)
	var currentPage = Math.floor(index / pageSize)
	var isAtEnd = currentPage < 3 || currentPage >= pages.length - 3

	var pageGroups = pages.length <= 10 ? [pages] : _.groupAdjacent(_.uniq(concat(
		pages.slice(0, isAtEnd ? 5 : 3),
		pages.slice(Math.max(currentPage - 2, 0), currentPage + 3),
		pages.slice(isAtEnd ? -5 : -3)
	).sort(_.sub)), (a, b) => a + 1 == b)

	return <ol class="opener-pagination">
		{_.intersperse(pageGroups.map((pages) => pages.map(function(page) {
			var url = path + "?" + Qs.stringify(_.assign({}, query, {
				offset: page * pageSize
			}))

			var isCurrent = page == currentPage

			return <li class={isCurrent ? "page current" : "page"}>
				<a href={isCurrent ? "#" : url}>{page + 1}</a>
			</li>
			})
		), <li class="middle">…</li>)}
	</ol>
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

function FlagElement({country, alt}) {
	var src = COUNTRY_FLAGS[country]
	if (src == null) return null

	var name = alt == null || alt ? COUNTRIES[country].name : null
	return <img class="opener-flag" src={src} alt={name} />
}

function prefixed(prefix, path) {
	return path.startsWith(prefix) ? "selected" : ""
}

function selected(prefix, path) {
	return prefix == path ? "selected" : ""
}
