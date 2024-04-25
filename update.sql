DELIMITER $$
USE workItemDB$$
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


DELIMITER ;
