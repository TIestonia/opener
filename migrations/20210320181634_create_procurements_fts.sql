CREATE VIRTUAL TABLE procurements_fts USING fts5 (
	title,
	description,
	contract_titles,

	tokenize = "trigram case_sensitive 0"
);

INSERT INTO procurements_fts (
	rowid,
	title,
	description,
	contract_titles
)
SELECT
	procurement.rowid,
	procurement.title,
	procurement.description,
	group_concat(contract.title || ' ' || contract.id, char(10))

FROM procurements AS procurement

LEFT JOIN procurement_contracts AS contract
ON contract.procurement_country = procurement.country
AND contract.procurement_id = procurement.id

GROUP BY procurement.country, procurement.id;
