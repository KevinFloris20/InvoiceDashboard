DELIMITER $$

CREATE DATABASE IF NOT EXISTS workItemDB$$
USE workItemDB$$

-- make the tables
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
    regular_string TEXT NOT NULL,
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
)

-- make the stored procedures

-- InsertWorkItemWithEquipId
CREATE PROCEDURE InsertWorkItemWithEquipId(
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

-- InsertWorkItemWithChassis
CREATE PROCEDURE InsertInvoiceAndUpdateWorkItems(
    IN p_externalUniqueId VARCHAR(255),
    IN p_regularString TEXT,
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
    DECLARE v_count INT;
    DECLARE v_error_detected BOOL DEFAULT FALSE;
    SET @jsonWorkItemIds = CONCAT('[', p_workItemIds, ']');

    START TRANSACTION;

    SELECT client_id INTO v_clientId FROM clients WHERE client_name = p_clientName LIMIT 1;
    IF v_clientId IS NULL THEN
        SET v_error_detected = TRUE;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Client not found.';
    END IF;
    IF NOT v_error_detected THEN
        INSERT INTO invoices (external_id, regular_string, invoice_date, date_created, total, client_id)
        VALUES (p_externalUniqueId, p_regularString, p_invoiceDate, p_creationDate, p_total, v_clientId);

        SET v_newInvoiceId = LAST_INSERT_ID();
    END IF;
    WHILE i < JSON_LENGTH(@jsonWorkItemIds) AND NOT v_error_detected DO
        SET v_workItemId = CAST(JSON_EXTRACT(@jsonWorkItemIds, CONCAT('$[', i, ']')) AS UNSIGNED);
        SELECT COUNT(*) INTO v_count FROM workItems WHERE workItem_id = v_workItemId AND invoice_id IS NOT NULL;
        IF v_count > 0 THEN
            SET v_error_detected = TRUE;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Work item already has an invoice assigned.';
        ELSE
            UPDATE workItems
            SET invoice_id = v_newInvoiceId
            WHERE workItem_id = v_workItemId;
        END IF;
        SET i = i + 1;
    END WHILE;

    IF v_error_detected THEN
        ROLLBACK;
    ELSE
        COMMIT;
    END IF;
END$$
DELIMITER ;
