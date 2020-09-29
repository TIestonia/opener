CREATE TABLE people_new (
	id INTEGER PRIMARY KEY NOT NULL,
	country TEXT NOT NULL,
	personal_id TEXT,
	name TEXT NOT NULL,
	normalized_name TEXT NOT NULL,
	birthdate TEXT,

	CONSTRAINT country_format CHECK (country GLOB '[A-Z][A-Z]'),
	CONSTRAINT personal_id_length CHECK (length(personal_id) > 0)
	CONSTRAINT name_length CHECK (length(name) > 0)
	CONSTRAINT normalized_name_length CHECK (length(normalized_name) > 0),

	CONSTRAINT birthdate_format
	CHECK (birthdate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

	CONSTRAINT personal_id_or_birthdate
	CHECK (personal_id IS NOT NULL OR birthdate IS NOT NULL)
);

INSERT INTO people_new (
	id,
	country,
	personal_id,
	name,
	normalized_name,
	birthdate
) SELECT
	rowid,
	country,
	id,
	name,
	normalized_name,
	birthdate
FROM people;

DROP TABLE people;

ALTER TABLE people_new RENAME TO people;

CREATE UNIQUE INDEX index_people_on_country_and_personal_id
ON people (country, personal_id);

CREATE INDEX index_people_on_country_and_name_and_birthdate
ON people (country, normalized_name, birthdate);

CREATE TABLE organization_people_new (
	organization_country TEXT NOT NULL,
	organization_id TEXT NOT NULL,
	person_id INTEGER NOT NULL,
	person_country TEXT NOT NULL,
	person_personal_id TEXT,
	person_birthdate TEXT,
	role TEXT NOT NULL,
	started_at TEXT NOT NULL,
	ended_at TEXT,

	FOREIGN KEY (organization_country, organization_id)
	REFERENCES organizations (country, id),

	FOREIGN KEY (person_id) REFERENCES people (id),

	FOREIGN KEY (person_country, person_personal_id)
	REFERENCES people (country, personal_id),

	CONSTRAINT person_birthdate_format
	CHECK (person_birthdate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),

	CONSTRAINT person_personal_id_or_birthdate
	CHECK (person_personal_id IS NOT NULL OR person_birthdate IS NOT NULL)
);

INSERT INTO organization_people_new (
	organization_country,
	organization_id,
	person_id,
	person_country,
	person_personal_id,
	person_birthdate,
	role,
	started_at,
	ended_at
) SELECT
	organization_country,
	organization_id,
	person.id,
	person.country,
	person.personal_id,
	person.birthdate,
	role,
	started_at,
	ended_at
FROM organization_people AS role
JOIN people AS person
ON person.country = role.person_country
AND person.personal_id = role.person_id;

DROP TABLE organization_people;

ALTER TABLE organization_people_new RENAME TO organization_people;

CREATE INDEX index_organization_people_on_organization
ON organization_people (organization_country, organization_id);

CREATE INDEX index_organization_people_on_person_id
ON organization_people (person_id);
