ALTER TABLE procurements
ADD COLUMN origin TEXT;

UPDATE procurements
SET origin = CASE country
	WHEN 'EE' THEN 'csv'
	WHEN 'LV' THEN 'ocds'
END;

PRAGMA writable_schema = 1;

UPDATE sqlite_master
SET sql = replace(
	sql,
	'origin TEXT',
	'origin TEXT NOT NULL'
)
WHERE name = 'procurements';

PRAGMA writable_schema = 0;
