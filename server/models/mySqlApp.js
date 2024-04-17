const mysql = require('mysql2');

//Connect to DB
require('dotenv').config({path: 'cred.env'});
const ghost = process.env.GDB_HOST;
const guser = process.env.GDB_USER;
const gpassword = process.env.GDB_PASS;
const gdatabase = process.env.GDB_NAME;
const gdbConfig = {
    host: ghost,
    user: guser,
    password: gpassword,
    database: gdatabase
};
const db = mysql.createConnection(gdbConfig);
try{
    db.connect((err) => {
        if (err) {
            console.log('Error connecting to SQL DB:', err);
            return;
        }
        console.log('Connected to SQL DB');
    });
} catch (error) {
    console.log('Error connecting to SQL DB:', error);
}

async function getTables() {
    try {
        return new Promise((resolve, reject) => {
            db.query('SHOW TABLES', (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    } catch (error) {
        console.log('Error getting tables:', error);
        return [];
    }
}

async function getTableData(table) {
    try {
        return new Promise((resolve, reject) => {
            db.query(`SELECT * FROM ${table}`, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    } catch (error) {
        console.log('Error getting table data:', error);
        return [];
    }
}

async function getClients(clientID) {
    try {
        return new Promise((resolve, reject) => {
            const query = clientID ? 'SELECT * FROM clients WHERE client_id = ?' : 'SELECT * FROM clients';
            const params = clientID ? [clientID] : [];
            db.query(query, params, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    } catch (error) {
        console.log('Error getting clients:', error);
        return [];
    }
}

async function addClients(client_name, client_address, email) {
    try {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO clients (client_name, client_address, email) VALUES (?, ?, ?)';
            db.query(query, [client_name, client_address, email], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    } catch (error) {
        console.log('Error adding client:', error);
        throw error; 
    }
}

async function addWorkItem(clientName, unitName, descriptionPrice, workDate) {
    const sql = `CALL InsertWorkItemWithChassis(?,?,?,?)`;
    return new Promise((resolve, reject) => {
        db.query(sql, [clientName, unitName, descriptionPrice, workDate], (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

async function updateWorkItem(workItemId, newDescriptionPrice, newWorkDate) {
    const sql = `UPDATE workItems SET description_price = ?, work_date = ? WHERE workItem_id = ?`;
    return new Promise((resolve, reject) => {
        db.query(sql, [newDescriptionPrice, newWorkDate, workItemId], (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

async function deleteWorkItem(workItemId) {
    const sql = `DELETE FROM workItems WHERE workItem_id = ?`;
    return new Promise((resolve, reject) => {
        db.query(sql, [workItemId], (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

async function getAllWorkItems(numItems) {
    const sql = `SELECT * FROM workItems ORDER BY workItem_id DESC LIMIT ${numItems}`;
    return new Promise((resolve, reject) => {
        db.query(sql, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

async function getUnitNumbers(unitID){
    try {
        return new Promise((resolve, reject) => {
            const query = unitID ? 'SELECT * FROM unit_numbers WHERE unit_id = ?' : 'SELECT * FROM unit_numbers';
            const params = unitID ? [unitID] : [];
            db.query(query, params, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    } catch (error) {
        console.log('Error getting units:', error);
        return [];
    }
}

async function displayWorkItems(numItems) {
    try {
        const workitemsRes = await getAllWorkItems(numItems);
        const workItems = [];
        for (const item of workitemsRes) {
            const clientsRes = await getClients(item.client_id);
            const unitsRes = await getUnitNumbers(item.unit_id);

            const descriptionPriceObj = JSON.parse(item.description_price);
            let totalCharges = 0;
            let descriptionPriceObject = {};
            for (const key in descriptionPriceObj) {
                const entry = descriptionPriceObj[key];
                const price = parseFloat(entry.C);
            
                if (!isNaN(price)) {
                    totalCharges += price;
                }
                descriptionPriceObject[`${key}A`] = entry.A;
                descriptionPriceObject[`${key}B`] = entry.B;
                descriptionPriceObject[`${key}C`] = entry.C;
            }


            workItems.push({
                workItemID: item.workItem_id,
                clientID: item.client_id,
                clientName: clientsRes[0].client_name,
                unitID: item.unit_id,
                unitName: unitsRes[0].unit_name,
                descriptionPrice: descriptionPriceObject,
                totalCharges: totalCharges.toFixed(2), 
                workDate: item.work_date,
                invoiceID: item.invoice_id
            });
        }
        return workItems;
    } catch (error) {
        console.log('Error displaying work items:', error);
        throw error;
    }
}

async function getWorkItemsById(workItemID) {
    try {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM workItems WHERE workItem_id = ?';
            db.query(query, [workItemID], (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    } catch (error) {
        console.log('Error getting work items:', error);
        return [];
    }
}



module.exports = {
    getTables,
    getTableData,
    getClients,
    addClients,
    addWorkItem,
    updateWorkItem,
    deleteWorkItem,
    getAllWorkItems,
    displayWorkItems,
    getWorkItemsById
};