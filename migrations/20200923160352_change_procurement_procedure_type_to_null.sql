PRAGMA writable_schema = 1;

UPDATE sqlite_master
SET sql = replace(
	sql,
	'procedure_type TEXT NOT NULL',
	'procedure_type TEXT'
)
WHERE name = 'procurements';

PRAGMA writable_schema = 0;
