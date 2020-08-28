CREATE TABLE organization_people (
	organization_country TEXT NOT NULL,
	organization_id TEXT NOT NULL,
	person_country TEXT NOT NULL,
	person_id TEXT NOT NULL,
	role TEXT NOT NULL,
	started_at TEXT NOT NULL,
	ended_at TEXT,

	FOREIGN KEY (organization_country, organization_id)
	REFERENCES organizations (country, id),

	FOREIGN KEY (person_country, person_id)
	REFERENCES people (country, id)
);
