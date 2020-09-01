CREATE TABLE organizations (
	country TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,
	url TEXT,

	PRIMARY KEY (country, id),

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT name_length CHECK (length(name) > 0),
	CONSTRAINT url_length CHECK (length(url) > 0)
);
