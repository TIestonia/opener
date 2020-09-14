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
