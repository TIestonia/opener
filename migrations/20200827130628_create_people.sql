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
