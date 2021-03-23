CREATE VIRTUAL TABLE organizations_fts USING fts5 (
	country UNINDEXED,
	id,
	name,

	tokenize = "trigram case_sensitive 0"
);

INSERT INTO organizations_fts (rowid, country, id, name)
SELECT rowid, country, id, name
FROM organizations;
