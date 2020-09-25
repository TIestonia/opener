PRAGMA writable_schema = 1;

UPDATE sqlite_master
SET sql = replace(
	sql,
	'REFERENCES procurements (country, id)',
	'REFERENCES procurements (country, id) ON DELETE CASCADE'
)
WHERE name = 'procurement_contracts';

PRAGMA writable_schema = 0;
