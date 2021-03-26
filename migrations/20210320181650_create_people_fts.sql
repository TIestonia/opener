CREATE VIRTUAL TABLE people_fts USING fts5 (
	country UNINDEXED,
	personal_id,
	name,

	tokenize = "trigram case_sensitive 0"
);

INSERT INTO people_fts (rowid, country, personal_id, name)
SELECT rowid, country, personal_id, name
FROM people;
