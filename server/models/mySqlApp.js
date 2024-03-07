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

async function getClients() {
    try {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM clients', (err, rows, fields) => {
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

async function getAllWorkItems() {
    const sql = `SELECT * FROM workItems`;
    return new Promise((resolve, reject) => {
        db.query(sql, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

module.exports = {
    getClients,
    addClients,
    addWorkItem,
    updateWorkItem,
    deleteWorkItem,
    getAllWorkItems
};