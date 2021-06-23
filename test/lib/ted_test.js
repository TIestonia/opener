var Ted = require("root/lib/ted")
var ValidOrganization = require("root/test/valid_organization")
var ValidProcurement = require("root/test/valid_procurement")
var ValidContract = require("root/test/valid_procurement_contract")
var organizationsDb = require("root/db/organizations_db")
var procurementsDb = require("root/db/procurements_db")
var contractsDb = require("root/db/procurement_contracts_db")
var {NAMESPACE} = require("root/lib/ted_xml")
var {xml} = require("root/lib/ted_xml")
var sql = require("sqlate")
var UUID = "d2221705-9d13-48c2-9d14-76fc4b4bbf48"
var BUYER_ID = "77000499"
var BUYER_NAME = "Narva-Jõesuu Linnavalitsus"
var CONTRACT_TITLE = "New shoes"

describe("Ted", function() {
	require("root/test/db")()

	describe(".import", function() {
		describe("given contract notice (F02)", function() {
			it("must create buyer organization and procurement", function*() {
				// Example from HT_2019_1.xml.
				// https://riigihanked.riik.ee/rhr-web/#/open-data
				yield parseAndImport(xml`<TED_ESENDERS xmlns="${NAMESPACE}">
					<SENDER><CONTACT><COUNTRY VALUE="EE" /></CONTACT></SENDER>

					<FORM_SECTION>
						<NOTICE_UUID>${UUID}</NOTICE_UUID>
						<F02_2014 FORM="F02">
							<OBJECT_CONTRACT>
								<REFERENCE_NUMBER>203245</REFERENCE_NUMBER>

								<TITLE>
									<P>Pärnu jahtklubi statsionaarse tõstekraana soetamine</P>
								</TITLE>

								<CPV_MAIN><CPV_CODE CODE="42414120" /></CPV_MAIN>

                <SHORT_DESCR>
									<P>Tõstekraana soetamine väikealuste teemindamiseks</P>
                </SHORT_DESCR>

                <VAL_ESTIMATED_TOTAL CURRENCY="EUR">50000</VAL_ESTIMATED_TOTAL>
							</OBJECT_CONTRACT>

							<CONTRACTING_BODY>
								<ADDRESS_CONTRACTING_BODY>
									<OFFICIALNAME>Pärnu Jahtklubi</OFFICIALNAME>
									<NATIONALID>80058516</NATIONALID>
									<COUNTRY VALUE="EE" />
									<URL_GENERAL>www.jahtklubi.ee</URL_GENERAL>
								</ADDRESS_CONTRACTING_BODY>
							</CONTRACTING_BODY>

							<PROCEDURE>
								<DATE_RECEIPT_TENDERS>2015-06-10</DATE_RECEIPT_TENDERS>
								<TIME_RECEIPT_TENDERS>13:37</TIME_RECEIPT_TENDERS>
							</PROCEDURE>

							<COMPLEMENTARY_INFO>
								<DATE_DISPATCH_NOTICE>2015-06-18</DATE_DISPATCH_NOTICE>
							</COMPLEMENTARY_INFO>
						</F02_2014>
					</FORM_SECTION>
				</TED_ESENDERS>`)

				var buyers = yield organizationsDb.search(sql`
					SELECT * FROM organizations
				`)

				buyers.must.eql([new ValidOrganization({
					country: "EE",
					id: "80058516",
					name: "Pärnu Jahtklubi",
					url: "https://www.jahtklubi.ee"
				})])

				var procurements = yield procurementsDb.search(sql`
					SELECT * FROM procurements
				`)

				procurements.must.eql([new ValidProcurement({
					country: "EE",
					id: "203245",
					origin: "ted",
					buyer_country: buyers[0].country,
					buyer_id: buyers[0].id,
					title: "Pärnu jahtklubi statsionaarse tõstekraana soetamine",
					description: "Tõstekraana soetamine väikealuste teemindamiseks",
					published_at: new Date(2015, 5, 18),
					deadline_at: new Date(2015, 5, 10, 13, 37),
					procedure_type: "open",
					estimated_cost: 50000,
					estimated_cost_currency: "EUR",
					cpv_code: "42414120"
				})])
			})
		})

		describe("given contract award notice (F03)", function() {
			it("must create buyer organization, procurement and contract",
				function*() {
				// Example from HLST_2019_11.xml.
				// https://riigihanked.riik.ee/rhr-web/#/open-data
				yield parseAndImport(xml`<TED_ESENDERS xmlns="${NAMESPACE}">
					<SENDER><CONTACT><COUNTRY VALUE="EE" /></CONTACT></SENDER>

					<FORM_SECTION>
						<NOTICE_UUID>${UUID}</NOTICE_UUID>
						<F03_2014 FORM="F03">
							<OBJECT_CONTRACT>
								<REFERENCE_NUMBER>213798</REFERENCE_NUMBER>

								<TITLE>
									<P>Narva-Jõesuu linnas asuva muuli eeluuringute koostamine</P>
								</TITLE>

								<CPV_MAIN><CPV_CODE CODE="71240000" /></CPV_MAIN>
							</OBJECT_CONTRACT>

							<CONTRACTING_BODY>
								<ADDRESS_CONTRACTING_BODY>
									<OFFICIALNAME>Narva-Jõesuu Linnavalitsus</OFFICIALNAME>
									<NATIONALID>77000499</NATIONALID>
									<COUNTRY VALUE="EE" />
								</ADDRESS_CONTRACTING_BODY>
							</CONTRACTING_BODY>

							<PROCEDURE>
                <PT_OPEN />
							</PROCEDURE>

							<COMPLEMENTARY_INFO>
								<DATE_DISPATCH_NOTICE>2015-06-18</DATE_DISPATCH_NOTICE>
							</COMPLEMENTARY_INFO>

							<AWARD_CONTRACT ITEM="1">
								<CONTRACT_NO>29112019</CONTRACT_NO>
								<TITLE><P>Töövõtuleping</P></TITLE>

								<AWARDED_CONTRACT>
									<DATE_CONCLUSION_CONTRACT>
										2015-08-15
									</DATE_CONCLUSION_CONTRACT>

									<VALUES>
										<VAL_TOTAL CURRENCY="EUR">89945</VAL_TOTAL>
									</VALUES>

									<TENDERS>
										<NB_TENDERS_RECEIVED>2</NB_TENDERS_RECEIVED>
										<NB_TENDERS_RECEIVED_SME>2</NB_TENDERS_RECEIVED_SME>
										<NB_TENDERS_RECEIVED_OTHER_EU>
											0
										</NB_TENDERS_RECEIVED_OTHER_EU>
										<NB_TENDERS_RECEIVED_NON_EU>0</NB_TENDERS_RECEIVED_NON_EU>
										<NB_TENDERS_RECEIVED_EMEANS>2</NB_TENDERS_RECEIVED_EMEANS>
									</TENDERS>

									<CONTRACTORS>
										<CONTRACTOR>
											<ADDRESS_CONTRACTOR>
												<OFFICIALNAME>Osaühing Reaalprojekt</OFFICIALNAME>
												<NATIONALID>10765904</NATIONALID>
												<COUNTRY VALUE="EE"/>
											</ADDRESS_CONTRACTOR>
										</CONTRACTOR>
									</CONTRACTORS>
								</AWARDED_CONTRACT>
							</AWARD_CONTRACT>
						</F03_2014>
					</FORM_SECTION>
				</TED_ESENDERS>`)

				var orgs = yield organizationsDb.search(sql`
					SELECT * FROM organizations
				`)

				orgs.must.eql([new ValidOrganization({
					country: "EE",
					id: "77000499",
					name: "Narva-Jõesuu Linnavalitsus"
				}), new ValidOrganization({
					country: "EE",
					id: "10765904",
					name: "Osaühing Reaalprojekt"
				})])

				var procurements = yield procurementsDb.search(sql`
					SELECT * FROM procurements
				`)

				procurements.must.eql([new ValidProcurement({
					country: "EE",
					id: "213798",
					origin: "ted",
					buyer_country: orgs[0].country,
					buyer_id: orgs[0].id,
					title: "Narva-Jõesuu linnas asuva muuli eeluuringute koostamine",
					published_at: new Date(2015, 5, 18),
					deadline_at: null,
					procedure_type: "open",
					cpv_code: "71240000"
				})])

				var contracts = yield contractsDb.search(sql`
					SELECT * FROM procurement_contracts
				`)

				contracts.must.eql([new ValidContract({
					id: 1,
					procurement_country: procurements[0].country,
					procurement_id: procurements[0].id,
					seller_country: orgs[1].country,
					seller_id: orgs[1].id,
					nr: "29112019",
					title: "Töövõtuleping",
					cost: 89945,
					cost_currency: "EUR",
					created_at: new Date(2015, 7, 15)
				})])
			})

			it("must ignore if no contract awarded", function*() {
				yield parseAndImport(xml`<TED_ESENDERS xmlns="${NAMESPACE}">
					<SENDER><CONTACT><COUNTRY VALUE="EE" /></CONTACT></SENDER>

					<FORM_SECTION>
						<NOTICE_UUID>${UUID}</NOTICE_UUID>
						<F03_2014 FORM="F03">
							<OBJECT_CONTRACT>
								<REFERENCE_NUMBER>213798</REFERENCE_NUMBER>
								<TITLE><P>${CONTRACT_TITLE}</P></TITLE>
								<CPV_MAIN><CPV_CODE CODE="71240000" /></CPV_MAIN>
							</OBJECT_CONTRACT>

							<CONTRACTING_BODY>
								<ADDRESS_CONTRACTING_BODY>
									<OFFICIALNAME>${BUYER_NAME}</OFFICIALNAME>
									<NATIONALID>${BUYER_ID}</NATIONALID>
									<COUNTRY VALUE="EE" />
								</ADDRESS_CONTRACTING_BODY>
							</CONTRACTING_BODY>

							<PROCEDURE>
                <PT_OPEN />
							</PROCEDURE>

							<COMPLEMENTARY_INFO>
								<DATE_DISPATCH_NOTICE>2015-06-18</DATE_DISPATCH_NOTICE>
							</COMPLEMENTARY_INFO>

							<AWARD_CONTRACT ITEM="1">
                <LOT_NO>7</LOT_NO>
                <NO_AWARDED_CONTRACT>
									<PROCUREMENT_DISCONTINUED>
										<ORIGINAL_TED_ESENDER PUBLICATION="NO" />
										
										<NO_DOC_EXT PUBLICATION="NO">2018-049770</NO_DOC_EXT>

										<DATE_DISPATCH_ORIGINAL PUBLICATION="NO">
											2018-10-26
										</DATE_DISPATCH_ORIGINAL>
									</PROCUREMENT_DISCONTINUED>
                </NO_AWARDED_CONTRACT>
							</AWARD_CONTRACT>
						</F03_2014>
					</FORM_SECTION>
				</TED_ESENDERS>`)

				var orgs = yield organizationsDb.search(sql`
					SELECT * FROM organizations
				`)

				orgs.must.eql([new ValidOrganization({
					country: "EE",
					id: BUYER_ID,
					name: BUYER_NAME
				})])

				var procurements = yield procurementsDb.search(sql`
					SELECT * FROM procurements
				`)

				procurements.must.eql([new ValidProcurement({
					country: "EE",
					id: "213798",
					origin: "ted",
					buyer_country: orgs[0].country,
					buyer_id: orgs[0].id,
					title: CONTRACT_TITLE,
					published_at: new Date(2015, 5, 18),
					deadline_at: null,
					procedure_type: "open",
					cpv_code: "71240000"
				})])

				yield contractsDb.search(sql`
					SELECT * FROM procurement_contracts
				`).must.then.be.empty()
			})
		})

		describe("given contract for utilities award notice (F06)", function() {
			it("must create procurement and contract without seller", function*() {
				// Example from HLST_2019_1.xml.
				// https://riigihanked.riik.ee/rhr-web/#/open-data
				yield parseAndImport(xml`<TED_ESENDERS xmlns="${NAMESPACE}">
					<SENDER><CONTACT><COUNTRY VALUE="EE" /></CONTACT></SENDER>

					<FORM_SECTION>
						<NOTICE_UUID>${UUID}</NOTICE_UUID>
						<F06_2014 FORM="F06">
							<OBJECT_CONTRACT>
								<REFERENCE_NUMBER>204622</REFERENCE_NUMBER>
								<TITLE><P>Iru elektrijaama komplektalajaam</P></TITLE>
								<CPV_MAIN><CPV_CODE CODE="31213400" /></CPV_MAIN>
							</OBJECT_CONTRACT>

							<CONTRACTING_BODY>
								<ADDRESS_CONTRACTING_BODY>
									<OFFICIALNAME>Enefit Green AS</OFFICIALNAME>
									<NATIONALID>11184032</NATIONALID>
									<COUNTRY VALUE="EE" />
								</ADDRESS_CONTRACTING_BODY>
							</CONTRACTING_BODY>

							<PROCEDURE />

							<COMPLEMENTARY_INFO>
								<DATE_DISPATCH_NOTICE>2015-06-18</DATE_DISPATCH_NOTICE>
							</COMPLEMENTARY_INFO>

							<AWARD_CONTRACT ITEM="1">
								<CONTRACT_NO>TO-TKO-5/519</CONTRACT_NO>
								<TITLE><P>Leping_203313_Belsneks Elekter OÜ</P></TITLE>

								<AWARDED_CONTRACT>
									<DATE_CONCLUSION_CONTRACT>
										2015-08-15
									</DATE_CONCLUSION_CONTRACT>

									<CONTRACTORS PUBLICATION="NO">
										<NO_AWARDED_TO_GROUP/>
									</CONTRACTORS>
									
									<NB_CONTRACT_AWARDED PUBLICATION="NO">1</NB_CONTRACT_AWARDED>

									<COUNTRY_ORIGIN PUBLICATION="NO">
										<COMMUNITY_ORIGIN/>
									</COUNTRY_ORIGIN>
								</AWARDED_CONTRACT>
							</AWARD_CONTRACT>
						</F06_2014>
					</FORM_SECTION>
				</TED_ESENDERS>`)

				var orgs = yield organizationsDb.search(sql`
					SELECT * FROM organizations
				`)

				orgs.must.eql([new ValidOrganization({
					country: "EE",
					id: "11184032",
					name: "Enefit Green AS"
				})])

				var procurements = yield procurementsDb.search(sql`
					SELECT * FROM procurements
				`)

				procurements.must.eql([new ValidProcurement({
					country: "EE",
					id: "204622",
					origin: "ted",
					buyer_country: orgs[0].country,
					buyer_id: orgs[0].id,
					title: "Iru elektrijaama komplektalajaam",
					published_at: new Date(2015, 5, 18),
					deadline_at: null,
					procedure_type: "open",
					cpv_code: "31213400"
				})])

				var contracts = yield contractsDb.search(sql`
					SELECT * FROM procurement_contracts
				`)

				contracts.must.eql([new ValidContract({
					id: 1,
					procurement_country: procurements[0].country,
					procurement_id: procurements[0].id,
					nr: "TO-TKO-5/519",
					title: "Leping_203313_Belsneks Elekter OÜ",
					created_at: new Date(2015, 7, 15)
				})])
			})
		})

		describe("given transparency notice (F15)", function() {
			it("must create procurement and contract", function*() {
				// Example from HLST_2019_2.xml.
				// https://riigihanked.riik.ee/rhr-web/#/open-data
				yield parseAndImport(xml`<TED_ESENDERS xmlns="${NAMESPACE}">
					<SENDER><CONTACT><COUNTRY VALUE="EE" /></CONTACT></SENDER>

					<FORM_SECTION>
						<NOTICE_UUID>${UUID}</NOTICE_UUID>
						<F15_2014 FORM="F15">
							<OBJECT_CONTRACT>
								<REFERENCE_NUMBER>204622</REFERENCE_NUMBER>
								<TITLE><P>Piimatoodete ostmine</P></TITLE>
								<CPV_MAIN><CPV_CODE CODE="15500000" /></CPV_MAIN>
							</OBJECT_CONTRACT>

							<CONTRACTING_BODY>
								<ADDRESS_CONTRACTING_BODY>
									<OFFICIALNAME>Sihtasutus Tallinna Lastehaigla</OFFICIALNAME>
									<NATIONALID>90006590</NATIONALID>
									<COUNTRY VALUE="EE" />
								</ADDRESS_CONTRACTING_BODY>
							</CONTRACTING_BODY>

							<PROCEDURE>
								<DIRECTIVE_2014_24_EU>
									<PT_NEGOTIATED_WITHOUT_PUBLICATION>
										<D_ACCORDANCE_ARTICLE><D_PROC_OPEN/></D_ACCORDANCE_ARTICLE>
										<D_JUSTIFICATION><P>
											Avatud hankemenetlus ebaõnnestus ja kasutame
											RH seaduse §50 p9.
										</P></D_JUSTIFICATION>
									</PT_NEGOTIATED_WITHOUT_PUBLICATION>
								</DIRECTIVE_2014_24_EU>
							</PROCEDURE>

							<COMPLEMENTARY_INFO>
								<DATE_DISPATCH_NOTICE>2015-06-18</DATE_DISPATCH_NOTICE>
							</COMPLEMENTARY_INFO>

							<AWARD_CONTRACT ITEM="1">
								<CONTRACT_NO>31.01.2019-1</CONTRACT_NO>
								<TITLE><P>RAAMLEPING nr.31.01.2019-1</P></TITLE>

								<AWARDED_CONTRACT>
									<DATE_CONCLUSION_CONTRACT>
										2015-08-15
									</DATE_CONCLUSION_CONTRACT>

									<VALUES>
										<VAL_TOTAL CURRENCY="EUR">65000</VAL_TOTAL>
									</VALUES>

									<CONTRACTORS>
										<CONTRACTOR>
											<ADDRESS_CONTRACTOR>
												<OFFICIALNAME>TERE aktsiaselts</OFFICIALNAME>
												<NATIONALID>11411278</NATIONALID>
												<COUNTRY VALUE="EE"/>
											</ADDRESS_CONTRACTOR>
											<SME/>
										</CONTRACTOR>
									</CONTRACTORS>
								</AWARDED_CONTRACT>
							</AWARD_CONTRACT>
						</F15_2014>
					</FORM_SECTION>
				</TED_ESENDERS>`)

				var orgs = yield organizationsDb.search(sql`
					SELECT * FROM organizations
				`)

				orgs.must.eql([new ValidOrganization({
					country: "EE",
					id: "90006590",
					name: "Sihtasutus Tallinna Lastehaigla"
				}), new ValidOrganization({
					country: "EE",
					id: "11411278",
					name: "TERE aktsiaselts"
				})])

				var procurements = yield procurementsDb.search(sql`
					SELECT * FROM procurements
				`)

				procurements.must.eql([new ValidProcurement({
					country: "EE",
					id: "204622",
					origin: "ted",
					buyer_country: orgs[0].country,
					buyer_id: orgs[0].id,
					title: "Piimatoodete ostmine",
					published_at: new Date(2015, 5, 18),
					deadline_at: null,
					procedure_type: "2014-24-eu/negotiated-without-publication",
					cpv_code: "15500000"
				})])

				var contracts = yield contractsDb.search(sql`
					SELECT * FROM procurement_contracts
				`)

				contracts.must.eql([new ValidContract({
					id: 1,
					procurement_country: procurements[0].country,
					procurement_id: procurements[0].id,
					seller_country: orgs[1].country,
					seller_id: orgs[1].id,
					nr: "31.01.2019-1",
					title: "RAAMLEPING nr.31.01.2019-1",
					cost: 65000,
					cost_currency: "EUR",
					created_at: new Date(2015, 7, 15)
				})])
			})
		})
	})
})

function parseAndImport(xml) { return Ted.import(Ted.parse(xml)[0]) }
