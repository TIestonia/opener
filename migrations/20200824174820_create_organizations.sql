CREATE TABLE organizations (
	country TEXT NOT NULL,
	id TEXT NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,

	PRIMARY KEY (country, id),

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT name_length CHECK (length(name) > 0)
);
