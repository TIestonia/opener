CREATE TABLE political_parties (
	id INTEGER PRIMARY KEY NOT NULL,
	country TEXT NOT NULL,
	name TEXT COLLATE NOCASE NOT NULL,

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT name_length CHECK (length(name) > 0)
);
