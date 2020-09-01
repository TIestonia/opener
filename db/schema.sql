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
	procedure_type TEXT NOT NULL,
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
	REFERENCES procurements (country, id),

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
CREATE TABLE people (
	country TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,
	normalized_name TEXT NOT NULL,
	birthdate TEXT NOT NULL,

	PRIMARY KEY (country, id),

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT name_length CHECK (length(name) > 0)
	CONSTRAINT normalized_name_length CHECK (length(normalized_name) > 0),

	CONSTRAINT birthdate_format
	CHECK (birthdate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE TABLE organization_people (
	organization_country TEXT NOT NULL,
	organization_id TEXT NOT NULL,
	person_country TEXT NOT NULL,
	person_id TEXT NOT NULL,
	role TEXT NOT NULL,
	started_at TEXT NOT NULL,
	ended_at TEXT,

	FOREIGN KEY (organization_country, organization_id)
	REFERENCES organizations (country, id),

	FOREIGN KEY (person_country, person_id)
	REFERENCES people (country, id)
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
COMMIT;
