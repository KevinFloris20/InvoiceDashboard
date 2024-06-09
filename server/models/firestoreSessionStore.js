const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const session = require('express-session');

const collectionId = 'sessions';
const projectId = process.env.PROJECTID;
const dbName = process.env.DB2NAME;
const key = process.env.KEYFILE;

async function getAccessToken() {
    const auth = new GoogleAuth({
        keyFilename: key,
        scopes: 'https://www.googleapis.com/auth/datastore'
    });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;
    return token;
}

// this for some reason is working im not sure why
class FirestoreSeshStore extends session.Store {
    constructor() {
        super();
    }

    async get(seshId, callback) {
        try {
            const accessToken = await getAccessToken();
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbName}/documents/${collectionId}/${seshId}`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (response.data.fields) {
                const sessionData = {
                    cookie: this.parseFirestoreFields(response.data.fields.cookie.mapValue.fields),
                    passport: this.parseFirestoreFields(response.data.fields.passport.mapValue.fields)
                };
                callback(null, sessionData);
            } else {
                callback(null, null);
            }
        } catch (error) {
            console.error('Error getting session:', error.response ? error.response.data : error.message);
            callback(error);
        }
    }

    async set(seshId, session, callback) {
        try {
            const accessToken = await getAccessToken();
            const formattedSession = {
                cookie: this.formatFirestoreValue(session.cookie),
                passport: this.formatFirestoreValue(session.passport)
            };
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbName}/documents/${collectionId}/${seshId}`;
            const response = await axios.patch(url, {
                fields: formattedSession
            }, {
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
            });
            callback(null, response.data);
        } catch (error) {
            console.error('Error setting session:', error.response ? error.response.data : error.message);
            callback(error);
        }
    }

    async destroy(seshId, callback) {
        try {
            const accessToken = await getAccessToken();
            const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbName}/documents/${collectionId}/${seshId}`;
            await axios.delete(url, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            callback(null);
        } catch (error) {
            console.error('Error destroying session:', error.response ? error.response.data : error.message);
            callback(error);
        }
    }

    formatFirestoreValue(value) {
        if (value instanceof Date) {
            return { timestampValue: value.toISOString() };
        } else if (typeof value === 'string') {
            return { stringValue: value };
        } else if (typeof value === 'boolean') {
            return { booleanValue: value };
        } else if (typeof value === 'number') {
            return { integerValue: value.toString() };
        } else if (Array.isArray(value)) {
            return { arrayValue: { values: value.map(this.formatFirestoreValue) } };
        } else if (typeof value === 'object' && value !== null) {
            const fields = {};
            for (const [key, val] of Object.entries(value)) {
                fields[key] = this.formatFirestoreValue(val);
            }
            return { mapValue: { fields } };
        } else {
            console.error("Unsupported data type for Firestore:", typeof value);
        }
    }

    parseFirestoreFields(fields) {
        const parsed = {};
        for (const [key, val] of Object.entries(fields)) {
            if (val.stringValue !== undefined) {
                parsed[key] = val.stringValue;
            } else if (val.booleanValue !== undefined) {
                parsed[key] = val.booleanValue;
            } else if (val.integerValue !== undefined) {
                parsed[key] = parseInt(val.integerValue, 10);
            } else if (val.timestampValue !== undefined) {
                parsed[key] = new Date(val.timestampValue);
            } else if (val.mapValue !== undefined) {
                parsed[key] = this.parseFirestoreFields(val.mapValue.fields);
            } else if (val.arrayValue !== undefined) {
                parsed[key] = val.arrayValue.values.map(this.parseFirestoreFields.bind(this));
            }
        }
        return parsed;
    }
}

module.exports = FirestoreSeshStore;
