PRAGMA writable_schema = 1;

UPDATE sqlite_master
SET sql = replace(
	sql,
	'birthdate TEXT NOT NULL',
	'birthdate TEXT'
)
WHERE name = 'people';

PRAGMA writable_schema = 0;
