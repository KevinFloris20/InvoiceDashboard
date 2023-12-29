const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
require('dotenv').config({path: 'cred.env'});

const collection_Id = process.env.COLLECTIONID.toString();
const db_name = process.env.DBNAME.toString();
const keyFilename = process.env.KEYFILE.toString();
const project_Id = process.env.PROJECTID.toString();



async function initializeFirestore() {
    const auth = new GoogleAuth({
        keyFilename: keyFilename,
        scopes: 'https://www.googleapis.com/auth/datastore'
    });

    const client = await auth.getClient();
    const projectId = project_Id;

    return { client, projectId };
}

async function getAccessToken(client) {
    const res = await client.getAccessToken();
    return res.token;
}

async function getLastDocument(client, projectId, dbname, collectionId) {
    const accessToken = await getAccessToken(client);
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}?pageSize=1`;
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
    };

    try {
        const response = await axios.get(url, { headers });
        if (response.data.documents && response.data.documents.length > 0) {
            return response.data.documents[0];
        } else {
            console.log('No documents found in the collection.');
            return null;
        }
    } catch (error) {
        console.error('Error in getLastDocument:', error.response ? error.response.data : error);
        return null;
    }
}

async function createNewDocument(client, projectId, dbname, collectionId, data) {
    const accessToken = await getAccessToken(client);
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}`;
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
    };

    try {
        const response = await axios.post(url, { fields: data }, { headers });
        console.log('New document created:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating new document:', error.response ? error.response.data : error);
        return null;
    }
}

async function getLastObjectId(document) {
    let maxId = 0;
    if (document && document.fields) {
        for (let key in document.fields) {
            if (key.startsWith('Invoice_ID_')) {
                // Extract the numeric part from the key
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
        // Firestore treats dates and addresses as strings, so no special handling is required
        return { stringValue: value };
    } else if (typeof value === 'boolean') {
        return { booleanValue: value };
    } else if (typeof value === 'number') {
        return { integerValue: value.toString() }; // Firestore wants numbers as strings
    } else if (Array.isArray(value)) {
        // Arrays need to be transformed to the Firestore array format
        return {
            arrayValue: {
                values: value.map(formatFirestoreValue)
            }
        };
    } else if (typeof value === 'object') {
        // Objects are treated as map values
        const fields = {};
        Object.keys(value).forEach(key => {
            fields[key] = formatFirestoreValue(value[key]);
        });
        return { mapValue: { fields } };
    } else {
        // If the value is of an unsupported type, log an error
        console.error("Unsupported data type for Firestore:", typeof value);
        return null;
    }
}

async function formatDataForFirestore(data) {
    // Initialize the formatted object
    let formattedData = {};

    // Loop through each key in the `wholeInvoice` object
    for (let [key, value] of Object.entries(data.wholeInvoice)) {
        // Check if the key is 'invoicemap', which needs to be handled as a map value
        if (key === 'invoicemap') {
            let mapFields = {};
            for (let [mapKey, mapValue] of Object.entries(value)) {
                mapFields[mapKey] = formatFirestoreValue(mapValue);
            }
            formattedData[key] = { mapValue: { fields: mapFields } };
        } else {
            // Convert the regular key-value pairs to their Firestore format
            formattedData[key] = formatFirestoreValue(value);
        }
    }

    // If `invoiceid` is not null, it means we are updating an existing invoice
    if (data.invoiceid !== null) {
        // Set the invoice ID in the Firestore format
        formattedData['Invoice_ID'] = { integerValue: data.invoiceid.toString() };
    }

    return formattedData;
}



async function writeData(client, projectId, dbname, collectionId, documentId, newData) {
    const accessToken = await getAccessToken(client);
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-goog-request-params': `database=${encodeURIComponent(`projects/${projectId}/databases/${dbname}`)}`
    };

    // Prepare the new field data with the incremented ID as the key
    const lastDocument = await getLastDocument(client, projectId, dbname, collectionId);
    const lastId = await getLastObjectId(lastDocument);
    const newId = lastId + 1; // Increment ID for the new object field
    const newFieldKey = `Invoice_ID_${newId}`;

    console.log('newData: ', newData);

    newData = await formatDataForFirestore(newData);

    console.log('newerData: ', newData);

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

function estimateDocumentSize(document) {
    let size = 0;
    for (let key in document.fields) {
        size += key.length + estimateValueSize(document.fields[key]);
    }
    return size;
}

function estimateValueSize(value) {
    // Check if the value is null before attempting to access its properties
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

async function interactWithFirestore(whatAreWeDoing, data) {

    //init
    const { client, projectId } = await initializeFirestore();

    //check what we are doing
    if (whatAreWeDoing === 'writeData') {
        const lastDocument = await getLastDocument(client, projectId, db_name, collection_Id);
        let documentId;
    
        if (lastDocument && isDocumentWithinSizeLimit(lastDocument, data)) {
            documentId = lastDocument.name.split('/').pop();
            await writeData(client, projectId, db_name, collection_Id, documentId, data);
        } else {
            const newDocument = await createNewDocument(client, projectId, db_name, collection_Id, data);
            if (newDocument) {
                documentId = newDocument.name.split('/').pop();
            } else {
                console.log('Failed to create a new document');
                return;
            }
        }
        console.log('Data written to document ID:', documentId);
        return;
    }
    else if (whatAreWeDoing === 'deleteData') {

    }
    else if (whatAreWeDoing === 'readData') {

    }
    else if (whatAreWeDoing === 'updateData') {
    
    }
    else {
        console.log('Error: Wrong DB Interaction Option Selected: ', whatAreWeDoing);
        return;
    }
    





}

module.exports = {interactWithFirestore};
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
  


