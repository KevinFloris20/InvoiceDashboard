const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
require('dotenv').config({ path: 'cred.env' });

const collection_Id = process.env.COLLECTIONID.toString();
const db_name = process.env.DBNAME.toString();
const keyFilename = process.env.KEYFILE.toString();
const project_Id = process.env.PROJECTID.toString();
const logFile = 'log.txt';

function logToFile(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

function handleError(error, customMessage){
    const errorMsg = customMessage + '\n' + (error.response ? error.response.data : error);
    logToFile(errorMsg);
    console.error(errorMsg);
    return errorMsg;
}

async function initializeFirestore() {
    try {
        const auth = new GoogleAuth({
            keyFilename: keyFilename,
            scopes: 'https://www.googleapis.com/auth/datastore'
        });

        const client = await auth.getClient();
        const projectId = project_Id;

        return { client, projectId };
    } catch (error) {
        throw handleError(error, 'Error in initializeFirestore');
    }
}

async function getAccessToken(client) {
    try {
        const res = await client.getAccessToken();
        return res.token;
    } catch (error) {
        throw handleError(error, 'Error getting access token');
    }
}

async function getLastDocument(client, projectId, dbname, collectionId) {
    try {
        const accessToken = await getAccessToken(client);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}?pageSize=1`;
        const headers = {
            Authorization: `Bearer ${accessToken}`,
            'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
        };

        const response = await axios.get(url, { headers });
        if (response.data.documents && response.data.documents.length > 0) {
            return response.data.documents[0];
        } else {
            console.log('No documents found in the collection.');
            return null;
        }
    } catch (error) {
        throw handleError(error, 'Error in getLastDocument');
    }
}

async function createNewDocument(client, projectId, dbname, collectionId, data) {
    try {
        const accessToken = await getAccessToken(client);
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}`;
        const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
        };

        const response = await axios.post(url, { fields: data }, { headers });
        console.log('New document created:', response.data);
        return response.data;
    } catch (error) {
        throw handleError(error, 'Error creating new document');
    }
}

async function getLastObjectId(document) {
    let maxId = 0;
    if (document && document.fields) {
        for (let key in document.fields) {
            if (key.startsWith('Invoice_ID_')) {
                const currentId = parseInt(key.replace('Invoice_ID_', ''));
                if (!isNaN(currentId) && currentId > maxId) {
                    maxId = currentId;
                }
            }
        }
    }
    return maxId;
}

function formatFirestoreValue(value) {
    if (typeof value === 'string') {
        return { stringValue: value };
    } else if (typeof value === 'boolean') {
        return { booleanValue: value };
    } else if (typeof value === 'number') {
        return { integerValue: value.toString() };
    } else if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(formatFirestoreValue) } };
    } else if (typeof value === 'object') {
        const fields = {};
        Object.keys(value).forEach(key => {
            fields[key] = formatFirestoreValue(value[key]);
        });
        return { mapValue: { fields } };
    } else {
        console.error("Unsupported data type for Firestore:", typeof value);
        return null;
    }
}

async function formatDataForFirestore(data) {
    let formattedData = {};
    for (let [key, value] of Object.entries(data.wholeInvoice)) {
        if (key === 'invoicemap') {
            let mapFields = {};
            for (let [mapKey, mapValue] of Object.entries(value)) {
                mapFields[mapKey] = formatFirestoreValue(mapValue);
            }
            formattedData[key] = { mapValue: { fields: mapFields } };
        } else {
            formattedData[key] = formatFirestoreValue(value);
        }
    }
    if (data.invoiceid !== null) {
        formattedData['Invoice_ID'] = { integerValue: data.invoiceid.toString() };
    }
    return formattedData;
}

function estimateDocumentSize(document) {
    let size = 0;
    for (let key in document.fields) {
        size += key.length + estimateValueSize(document.fields[key]);
    }
    return size;
}

function estimateValueSize(value) {
    if (value === null) {
        return 0;
    }
    if (value.stringValue) {
        return value.stringValue.length;
    }
    return 0;
}

function isDocumentWithinSizeLimit(document, newData) {
    const currentSize = estimateDocumentSize(document);
    const newSize = estimateDocumentSize({ fields: newData });
    const totalSize = currentSize + newSize;
    return totalSize <= 1000000;
}

async function writeData(client, projectId, dbname, collectionId, documentId, newData) {
    const accessToken = await getAccessToken(client);
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-goog-request-params': `database=${encodeURIComponent(`projects/${projectId}/databases/${dbname}`)}`
    };
    var lastDocument;
    var lastId;
    var newId;
    var newFieldKey = newData.invoiceid;
    
    // Check for non null integer invoice ID and decide to make new or not
    if(newFieldKey === null) {
        // Prepare the new field data with the incremented ID as the key
        lastDocument = await getLastDocument(client, projectId, dbname, collectionId);
        lastId = await getLastObjectId(lastDocument);
        newId = lastId + 1; // Increment ID for the new object field
        newFieldKey = `Invoice_ID_${newId}`;
    }else{
        newFieldKey = `Invoice_ID_${newFieldKey}`
    }

    // Format the data for Firestore
    newData = await formatDataForFirestore(newData);

    // Update data with the new field
    const updateData = {
        [newFieldKey]: { 
            mapValue: {
                fields: newData
            }
        }
    };

    // Append additional provided data and prepare updateMask
    let updateMaskFields = [];

    // Add the new field key to the updateMask
    updateMaskFields.push(`updateMask.fieldPaths=${encodeURIComponent(newFieldKey)}`);

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}/${documentId}?${updateMaskFields.join('&')}`;

    try {
        // Send the PATCH request to update the document with the new fields
        const response = await axios.patch(url, { fields: updateData }, { headers });
        console.log('Document updated with new fields:', response.data);
    } catch (error) {
        console.error('Error updating document:', error.response ? error.response.data : error.message);
    }
}

async function deleteData(client, projectId, dbname, collectionId, documentId, targetObjectId) {
    const accessToken = await getAccessToken(client);
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-goog-request-params': `database=${encodeURIComponent(`projects/${projectId}/databases/${dbname}`)}`
    };

    const deleteFieldKey = `Invoice_ID_${targetObjectId}`;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}/${documentId}?updateMask.fieldPaths=${encodeURIComponent(deleteFieldKey)}`;

    try {
        let done = await axios.patch(url, { fields: { [deleteFieldKey]: { nullValue: null } } }, { headers });
        console.log(`Field ${deleteFieldKey} deleted successfully: Res: ${done}`);
        return `Invoice ${deleteFieldKey} deleted successfully`;
    } catch (error) {
        console.error('Error deleting field:', error.response ? error.response.data : error.message);
    }
}


async function readData(client, projectId, dbname, collectionId, documentId) {
    const accessToken = await getAccessToken(client);
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
    };

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}/${documentId}`;

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error('Error reading document:', error.response ? error.response.data : error);
        return null;
    }
}


async function interactWithFirestore(whatAreWeDoing, data) {
    try {
        const { client, projectId } = await initializeFirestore();
        let documentId;
        let output;
        let lastDocument = await getLastDocument(client, projectId, db_name, collection_Id);
        documentId = lastDocument ? lastDocument.name.split('/').pop() : null;

        switch (whatAreWeDoing) {
            case 'writeData':
                if (!(lastDocument && isDocumentWithinSizeLimit(lastDocument, data))) {
                    const newDocument = await createNewDocument(client, projectId, db_name, collection_Id, data);
                    if (newDocument) {
                        documentId = newDocument.name.split('/').pop();
                    } else {
                        throw new Error('Failed to create a new document');
                    }
                }
                //WEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
            case 'updateData':
                output = await writeData(client, projectId, db_name, collection_Id, documentId, data);
                console.log('Data added to document ID:', documentId);
                break;

            case 'deleteData':
                output = await deleteData(client, projectId, db_name, collection_Id, documentId, data.invoiceid);
                break;

            case 'readData':
                output = await readData(client, projectId, db_name, collection_Id, documentId);
                break;

            default:
                throw new Error('Unsupported operation: ' + whatAreWeDoing);
        }
        return output;
    } catch (error) {
        throw handleError(error, 'Error in the main function');
    }
}

module.exports = { interactWithFirestore };
// interactWithFirestore('writeData', {
//     invoiceid: null,
//     wholeInvoice: {
//       A: "any string value",
//       B: "any string value",
//       C: "any string value",
//       D: "any string value",
//       invoicemap: {
//         "key1": "value1",
//         "key2": "value2",
//       }
//     }
//   });
// const lastDocument = await getLastDocument(client, projectId, db_name, collection_Id);
// let documentId;

// if (lastDocument && isDocumentWithinSizeLimit(lastDocument, data)) {
//     documentId = lastDocument.name.split('/').pop();
//     await writeData(client, projectId, db_name, collection_Id, documentId, data);
// } else {
//     const newDocument = await createNewDocument(client, projectId, db_name, collection_Id, data);
//     if (newDocument) {
//         documentId = newDocument.name.split('/').pop();
//     } else {
//         console.log('Failed to create a new document');
//         return;
//     }
// }
// console.log('Data written to document ID:', documentId);
// return;
  


