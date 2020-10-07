/** @jsx Jsx */
var Jsx = require("j6pack")
var Page = require("./page")
var {Header} = Page
var {Section} = Page

module.exports = function(attrs) {
	return <Page page="home" req={attrs.req}>
		<Header>
			<h1>Opener</h1>
		</Header>

		<Section>
			<p class="tagline">
				Detecting conflicts of interest in public procurement and political financing across borders
			</p>

			<ul class="features">
				<li class="feature">
					<img alt="" src="/assets/home-government.svg" />

					<p>
						Explore how public funds are used.
					</p>
				</li>

				<li class="feature">
					<img alt="" src="/assets/home-donation.svg" />

					<p>
						Explore organisations and donations to political parties that are connected to public procurement.
					</p>
				</li>

				<li class="feature">
					<img alt="" src="/assets/home-graph.svg" />

					<p>
						Explore visualisations to detect potential cases of conflicts of interest, including across borders.
					</p>
				</li>

				<li class="feature">
					<img alt="" src="/assets/home-filter.svg" />

					<p>
						Filter and create your own indicators.
					</p>
				</li>
			</ul>

			<ul class="logos">
				<a href="http://www.transparency.ee" class="logo">
					<img alt="Korruptsioonivaba Eesti" src="/assets/kv-logo.png" />
				</a>

				<a href="https://delna.lv" id="delna-logo" class="logo">
					<img alt="Delna" src="/assets/delna-logo.png" />
				</a>

				<a
					href="https://lv.schoolofdata.org"
					id="school-of-data-logo"
					class="logo"
				>
					<img
						alt="School of Data Latvia"
						src="/assets/school-of-data-latvia-logo.png"
					/>
				</a>

				<a href="https://www.just.ee" class="logo">
					<img
						alt="Estonian Ministry of Justice"
						src="/assets/ministry-of-justice-logo.svg"
					/>
				</a>

				<a href="https://okee.ee/" id="okee-logo" class="logo">
					<img alt="Open Knowledge Estonia" src="/assets/okee-logo.png" />
				</a>
			</ul>

			<p class="epilogue">
				This is a demo version of Opener, with data from Estonia and Latvia for years 2018–2019. All of your suggestions and comments are highly welcome! Write to us at <a href="mailto:info@transparency.ee">info@transparency.ee</a> or find us on <a href="https://github.com/TIestonia/opener">GitHub</a>.
			</p>
		</Section>
	</Page>
}
