DELIMITER $$

CREATE DATABASE IF NOT EXISTS workItemDB$$
USE workItemDB$$

CREATE TABLE IF NOT EXISTS clients (
    client_id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    client_address VARCHAR(255),
    email VARCHAR(255)
)$$

CREATE TABLE IF NOT EXISTS unit_numbers (
    unit_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    unit_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
)$$

CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    regular_string VARCHAR(255) NOT NULL,
    invoice_date DATE NOT NULL,
    date_created DATETIME,
    total DECIMAL(10, 2),
    client_id INT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
)$$


CREATE TABLE IF NOT EXISTS workItems (
    workItem_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT,
    unit_id INT,
    description_price TEXT NOT NULL,
    work_date DATE NOT NULL,
    invoice_id INT,
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (unit_id) REFERENCES unit_numbers(unit_id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
)$$


-- Stored Procedure: InsertWorkItemWithChassis
CREATE PROCEDURE InsertWorkItemWithChassis(
    IN p_clientName VARCHAR(255),
    IN p_unitName VARCHAR(255),
    IN p_descriptionPrice TEXT,
    IN p_workDate DATE
)
BEGIN
    DECLARE v_clientId INT DEFAULT NULL;
    DECLARE v_unitId INT DEFAULT NULL;
    DECLARE v_existingUnitId INT DEFAULT NULL;

    START TRANSACTION;
    
    SELECT client_id INTO v_clientId FROM clients WHERE client_name = p_clientName LIMIT 1;
    
    IF v_clientId IS NOT NULL THEN
        SELECT unit_id INTO v_existingUnitId FROM unit_numbers WHERE unit_name = p_unitName AND client_id = v_clientId LIMIT 1;
        
        IF v_existingUnitId IS NULL THEN
            INSERT INTO unit_numbers (client_id, unit_name) VALUES (v_clientId, p_unitName);
            SET v_unitId = LAST_INSERT_ID();
        ELSE
            SET v_unitId = v_existingUnitId;
        END IF;
        
        INSERT INTO workItems (client_id, unit_id, description_price, work_date)
        VALUES (v_clientId, v_unitId, p_descriptionPrice, p_workDate);
        
        COMMIT;
    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Client not found, transaction rolled back.';
    END IF;
END$$

-- Stored Procedure: InsertInvoiceAndUpdateWorkItems
CREATE PROCEDURE InsertInvoiceAndUpdateWorkItems(
    IN p_externalUniqueId VARCHAR(255),
    IN p_regularString VARCHAR(255),
    IN p_invoiceDate DATE,
    IN p_creationDate DATETIME,
    IN p_total DECIMAL(10,2),
    IN p_clientName VARCHAR(255),
    IN p_workItemIds TEXT
)
BEGIN
    DECLARE v_clientId INT DEFAULT NULL;
    DECLARE v_newInvoiceId INT DEFAULT NULL;
    DECLARE v_workItemId INT;
    DECLARE i INT DEFAULT 0;

    SET @jsonWorkItemIds = CONCAT('[', p_workItemIds, ']');

    START TRANSACTION;

    SELECT client_id INTO v_clientId FROM clients WHERE client_name = p_clientName LIMIT 1;
    
    IF v_clientId IS NOT NULL THEN
        INSERT INTO invoices (external_id, regular_string, invoice_date, date_created, total, client_id)
        VALUES (p_externalUniqueId, p_regularString, p_invoiceDate, p_creationDate, p_total, v_clientId);

        SET v_newInvoiceId = LAST_INSERT_ID();

        WHILE i < JSON_LENGTH(@jsonWorkItemIds) DO
            SET v_workItemId = CAST(JSON_EXTRACT(@jsonWorkItemIds, CONCAT('$[', i, ']')) AS UNSIGNED);
            
            UPDATE workItems
            SET invoice_id = v_newInvoiceId
            WHERE workItem_id = v_workItemId;
            
            SET i = i + 1;
        END WHILE;
        
        COMMIT;
    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Client not found, transaction rolled back.';
    END IF;
END$$
DELIMITER ;
