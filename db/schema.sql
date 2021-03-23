CREATE TABLE organizations (
	country TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,
	url TEXT, business_register_data TEXT, business_register_synced_at TEXT,

	PRIMARY KEY (country, id),

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT name_length CHECK (length(name) > 0),
	CONSTRAINT url_length CHECK (length(url) > 0)
);
CREATE TABLE procurements (
	country TEXT NOT NULL,
	id TEXT NOT NULL,
	buyer_country TEXT NOT NULL,
	buyer_id TEXT NOT NULL,
	procedure_type TEXT,
	cpv_code TEXT,
	title TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	published_at TEXT NOT NULL,
	deadline_at TEXT,
	revealed_at TEXT,
	estimated_cost REAL,
	estimated_cost_currency TEXT,
	cost REAL,
	cost_currency TEXT,
	bidder_count INTEGER NOT NULL DEFAULT 0,
	bid_count INTEGER NOT NULL DEFAULT 0,
	dispute_count INTEGER NOT NULL DEFAULT 0,

	PRIMARY KEY (country, id),
	FOREIGN KEY (buyer_country, buyer_id) REFERENCES organizations (country, id),

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT title_length CHECK (length(title) > 0),
	CONSTRAINT cpv_code_length CHECK (length(cpv_code) > 0),

	CONSTRAINT estimated_cost_currency_present
	CHECK ((estimated_cost IS NULL) = (estimated_cost_currency IS NULL)),

	CONSTRAINT estimated_cost_currency_format
	CHECK (estimated_cost_currency GLOB '[A-Z][A-Z][A-Z]'),

	CONSTRAINT cost_currency_present
	CHECK ((cost IS NULL) = (cost_currency IS NULL)),

	CONSTRAINT cost_currency_format
	CHECK (cost_currency GLOB '[A-Z][A-Z][A-Z]')
);
CREATE TABLE procurement_contracts (
	id INTEGER PRIMARY KEY NOT NULL,
	procurement_country TEXT NOT NULL,
	procurement_id TEXT NOT NULL,
	nr TEXT NOT NULL,
	title TEXT NOT NULL,
	seller_country INTEGER,
	seller_id TEXT,
	created_at TEXT,
	ends_at TEXT,
	deadline_at TEXT,
	estimated_cost REAL,
	estimated_cost_currency TEXT,
	cost REAL,
	cost_currency TEXT,

	FOREIGN KEY (procurement_country, procurement_id)
	REFERENCES procurements (country, id) ON DELETE CASCADE,

	FOREIGN KEY (seller_country, seller_id)
	REFERENCES organizations (country, id),

	CONSTRAINT title_length CHECK (length(title) > 0)

	CONSTRAINT estimated_cost_currency_present
	CHECK ((estimated_cost IS NULL) = (estimated_cost_currency IS NULL)),

	CONSTRAINT estimated_cost_currency_format
	CHECK (estimated_cost_currency GLOB '[A-Z][A-Z][A-Z]'),

	CONSTRAINT cost_currency_present
	CHECK ((cost IS NULL) = (cost_currency IS NULL)),

	CONSTRAINT cost_currency_format
	CHECK (cost_currency GLOB '[A-Z][A-Z][A-Z]')
);
CREATE TABLE political_parties (
	id INTEGER PRIMARY KEY NOT NULL,
	country TEXT NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT name_length CHECK (length(name) > 0)
);
CREATE TABLE political_party_donations (
	date TEXT NOT NULL,
	party_id INTEGER NOT NULL,
	donator_name TEXT COLLATE NOCASE NOT NULL,
	donator_normalized_name TEXT NOT NULL,
	donator_birthdate TEXT NOT NULL,
	amount INTEGER NOT NULL,
	currency TEXT NOT NULL,

	FOREIGN KEY (party_id) REFERENCES political_parties (id),

	CONSTRAINT donator_name_length CHECK (length(donator_name) > 0),

	CONSTRAINT donator_normalized_name_length
	CHECK (length(donator_normalized_name) > 0),

	CONSTRAINT currency_format CHECK (currency GLOB '[A-Z][A-Z][A-Z]')

	CONSTRAINT date_format
	CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

	CONSTRAINT donator_birthdate_format
	CHECK (donator_birthdate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE TABLE political_party_members (
	party_id INTEGER NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,
	normalized_name TEXT NOT NULL,
	birthdate TEXT NOT NULL,
	joined_on TEXT NOT NULL,

	FOREIGN KEY (party_id) REFERENCES political_parties (id),

	CONSTRAINT name_length CHECK (length(name) > 0),

	CONSTRAINT normalized_name_length
	CHECK (length(normalized_name) > 0),

	CONSTRAINT birthdate_format
	CHECK (birthdate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

	CONSTRAINT joined_on_format
	CHECK (joined_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX index_procurements_on_buyer
ON procurements (buyer_country, buyer_id);
CREATE INDEX index_procurement_contracts_on_procurement
ON procurement_contracts (procurement_country, procurement_id);
CREATE INDEX index_procurement_contracts_on_seller
ON procurement_contracts (seller_country, seller_id);
CREATE INDEX index_political_party_donations_on_donator
ON political_party_donations (donator_normalized_name, donator_birthdate);
CREATE INDEX index_political_party_members_on_normalized_name_and_birthdate
ON political_party_members (normalized_name, birthdate);
CREATE TABLE IF NOT EXISTS "people" (
	id INTEGER PRIMARY KEY NOT NULL,
	country TEXT NOT NULL,
	personal_id TEXT,
	name TEXT NOT NULL,
	normalized_name TEXT NOT NULL,
	birthdate TEXT,

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT personal_id_length CHECK (length(personal_id) > 0)
	CONSTRAINT name_length CHECK (length(name) > 0)
	CONSTRAINT normalized_name_length CHECK (length(normalized_name) > 0),

	CONSTRAINT birthdate_format
	CHECK (birthdate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

	CONSTRAINT personal_id_or_birthdate
	CHECK (personal_id IS NOT NULL OR birthdate IS NOT NULL)
);
CREATE UNIQUE INDEX index_people_on_country_and_personal_id
ON people (country, personal_id);
CREATE INDEX index_people_on_country_and_name_and_birthdate
ON people (country, normalized_name, birthdate);
CREATE TABLE IF NOT EXISTS "organization_people" (
	organization_country TEXT NOT NULL,
	organization_id TEXT NOT NULL,
	person_id INTEGER NOT NULL,
	person_country TEXT NOT NULL,
	person_personal_id TEXT,
	person_birthdate TEXT,
	role TEXT NOT NULL,
	started_at TEXT NOT NULL,
	ended_at TEXT,

	FOREIGN KEY (organization_country, organization_id)
	REFERENCES organizations (country, id),

	FOREIGN KEY (person_id) REFERENCES people (id),

	FOREIGN KEY (person_country, person_personal_id)
	REFERENCES people (country, personal_id),

	CONSTRAINT person_birthdate_format
	CHECK (person_birthdate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

	CONSTRAINT person_personal_id_or_birthdate
	CHECK (person_personal_id IS NOT NULL OR person_birthdate IS NOT NULL)
);
CREATE INDEX index_organization_people_on_organization
ON organization_people (organization_country, organization_id);
CREATE INDEX index_organization_people_on_person_id
ON organization_people (person_id);
CREATE VIRTUAL TABLE procurements_fts USING fts5 (
	title,
	description,
	contract_titles,

	tokenize = "trigram case_sensitive 0"
)
/* procurements_fts(title,description,contract_titles) */;
CREATE TABLE IF NOT EXISTS 'procurements_fts_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'procurements_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'procurements_fts_content'(id INTEGER PRIMARY KEY, c0, c1, c2);
CREATE TABLE IF NOT EXISTS 'procurements_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'procurements_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID;

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE migrations (version TEXT PRIMARY KEY NOT NULL);
INSERT INTO migrations VALUES('20200824174820');
INSERT INTO migrations VALUES('20200824174830');
INSERT INTO migrations VALUES('20200824174840');
INSERT INTO migrations VALUES('20200827130022');
INSERT INTO migrations VALUES('20200827130628');
INSERT INTO migrations VALUES('20200827130844');
INSERT INTO migrations VALUES('20200828085756');
INSERT INTO migrations VALUES('20200828091757');
INSERT INTO migrations VALUES('20200914222117');
INSERT INTO migrations VALUES('20200923160352');
INSERT INTO migrations VALUES('20200924211656');
INSERT INTO migrations VALUES('20200925162535');
INSERT INTO migrations VALUES('20200925213326');
INSERT INTO migrations VALUES('20200928115120');
INSERT INTO migrations VALUES('20200929163606');
INSERT INTO migrations VALUES('20210320181634');
COMMIT;
