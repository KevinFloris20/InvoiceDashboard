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
            console.log('Error connecting to DB:', err);
            return;
        }
        console.log('Connected to DB');
    });
} catch (error) {
    console.log('Error connecting to DB:', error);
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

module.exports = {
    getClients,
    addClients
};