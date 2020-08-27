CREATE TABLE organizations (
	country TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,

	PRIMARY KEY (country, id),

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT name_length CHECK (length(name) > 0)
);
CREATE TABLE procurements (
	country TEXT NOT NULL,
	id TEXT NOT NULL,
	buyer_country TEXT NOT NULL,
	buyer_id TEXT NOT NULL,
	status TEXT NOT NULL,
	process_type TEXT NOT NULL,
	product_type TEXT NOT NULL,
	title TEXT NOT NULL,
	published_at TEXT NOT NULL,
	deadline_at TEXT,
	revealed_at TEXT,
	estimated_cost REAL,
	estimated_cost_currency TEXT,
	cost REAL,
	cost_currency TEXT,
	responsible_person_name TEXT NOT NULL,
	responsible_person_email TEXT NOT NULL,
	bidder_count INTEGER NOT NULL DEFAULT 0,
	bid_count INTEGER NOT NULL DEFAULT 0,
	dispute_count INTEGER NOT NULL DEFAULT 0,

	PRIMARY KEY (country, id),
	FOREIGN KEY (buyer_country, buyer_id) REFERENCES organizations (country, id),

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT title_length CHECK (length(title) > 0)

	CONSTRAINT estimated_cost_currency_present
	CHECK ((estimated_cost IS NULL) = (estimated_cost_currency IS NULL)),

	CONSTRAINT estimated_cost_currency_format
	CHECK (estimated_cost_currency GLOB '[A-Z][A-Z][A-Z]'),

	CONSTRAINT cost_currency_present
	CHECK ((cost IS NULL) = (cost_currency IS NULL)),

	CONSTRAINT cost_currency_format
	CHECK (cost_currency GLOB '[A-Z][A-Z][A-Z]'),

	CONSTRAINT responsible_person_name_length
	CHECK (length(responsible_person_name) > 0),

	CONSTRAINT responsible_person_email_format
	CHECK (responsible_person_email GLOB '*?@?*')
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

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE migrations (version TEXT PRIMARY KEY NOT NULL);
INSERT INTO migrations VALUES('20200824174820');
INSERT INTO migrations VALUES('20200824174830');
INSERT INTO migrations VALUES('20200824174840');
COMMIT;
