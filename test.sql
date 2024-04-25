DROP PROCEDURE IF EXISTS InsertWorkItemWithEquipId;
DROP PROCEDURE IF EXISTS InsertWorkItemWithChassis;
ALTER TABLE invoices MODIFY COLUMN regular_string TEXT NOT NULL;
DROP PROCEDURE IF EXISTS InsertInvoiceAndUpdateWorkItems;