DELIMITER $$
USE workItemDB$$
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
