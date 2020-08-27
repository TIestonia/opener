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
