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
