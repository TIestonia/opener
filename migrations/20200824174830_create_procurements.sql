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
