CREATE INDEX index_procurements_on_country
ON procurements (country);

CREATE INDEX index_procurements_on_buyer
ON procurements (buyer_country, buyer_id);

CREATE INDEX index_procurement_contracts_on_procurement
ON procurement_contracts (procurement_country, procurement_id);

CREATE INDEX index_procurement_contracts_on_seller
ON procurement_contracts (seller_country, seller_id);

CREATE INDEX index_organization_people_on_organization
ON organization_people (organization_country, organization_id);

CREATE INDEX index_organization_people_on_person
ON organization_people (person_country, person_id);

CREATE INDEX index_political_party_donations_on_donator
ON political_party_donations (donator_normalized_name, donator_birthdate);

CREATE INDEX index_political_party_members_on_normalized_name_and_birthdate
ON political_party_members (normalized_name, birthdate);
