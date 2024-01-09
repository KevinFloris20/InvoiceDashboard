const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '..', '..', 'cred.env') });

// const collection_Id = process.env.COLLECTIONID;
// const db_name = process.env.DB2NAME;
// const keyFilename = path.join(__dirname, '..', '..', process.env.KEYFILE); // Assuming KEYFILE is a path to a file
// const project_Id = process.env.PROJECTID;
// const logFile = path.join(__dirname, '..', '..', 'log.txt'); 

//just in case ;)
// require('dotenv').config({ path: 'cred.env' });


// // Set the paths conditionally based on the current directory
// const isTestDir = __dirname.includes('tests');
// console.log("__dirname: ", __dirname);
// console.log("isTestDir: ", isTestDir);
// const collection_Id = isTestDir ? path.join(__dirname, '..',process.env.COLLECTIONID.toString()) : process.env.COLLECTIONID.toString();
// const db_name = isTestDir ? path.join(__dirname, '..',process.env.DB2NAME.toString()) : process.env.DB2NAME.toString();
// const keyFilename = isTestDir ? path.join(__dirname, '..',process.env.KEYFILE.toString()) : process.env.KEYFILE.toString();
// const project_Id = isTestDir ? path.join(__dirname, '..',process.env.PROJECTID.toString()) : process.env.PROJECTID.toString();
// const logFile = 'log.txt';

//original
require('dotenv').config({ path: 'cred.env' });

const collection_Id = process.env.COLLECTIONID.toString();
const db_name = process.env.DB2NAME.toString();
const keyFilename = process.env.KEYFILE.toString();
const project_Id = process.env.PROJECTID.toString();
const logFile = 'log.txt'


// Helper function for logging
function logToFile(message, data) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n\n`);
}

// Helper function for error handling
function handleError(error, customMessage, data) {
    let detailedError = `${customMessage}\nError Details: ${error.message}`;

    // Include server response if available
    if (error.response) {
        detailedError += `\nResponse Data: ${safeStringify(error.response.data)}`;
    }

    detailedError += `\nStack Trace: ${error.stack}`;
    logToFile(detailedError, data);
    console.error(detailedError);
    return detailedError;
}

// Function to safely stringify error objects
function safeStringify(obj, indent = 2) {
    let cache = [];
    const retVal = JSON.stringify(obj, (key, value) =>
        typeof value === 'object' && value !== null
            ? cache.includes(value)
                ? undefined // Duplicate reference found, discard key
                : cache.push(value) && value // Store value in our collection
            : value,
        indent
    );
    cache = null; // Enable garbage collection
    return retVal;
}

// Function to format data for Firestore
function formatFirestoreValue(value) {
    if (value instanceof Date) {
        return { timestampValue: value.toISOString() };
    } else if (typeof value === 'string') {
        return { stringValue: value };
    } else if (typeof value === 'boolean') {
        return { booleanValue: value };
    } else if (typeof value === 'number') {
        return { integerValue: value.toString() };
    } else if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(formatFirestoreValue) } };
    } else if (typeof value === 'object' && value !== null) {
        const fields = {};
        for (const [key, val] of Object.entries(value)) {
            fields[key] = formatFirestoreValue(val);
        }
        return { mapValue: { fields } };
    } else {
        console.error("Unsupported data type for Firestore:", typeof value);
        // No default return for unsupported types
    }
}

// Main function to interact with Firestore
async function interactWithFirestore(whatAreWeDoing, data) {
    if (!data) {
        throw new Error('No data provided to interactWithFirestore function');
    }

    try {
        const auth = new GoogleAuth({
            keyFilename: keyFilename,
            scopes: 'https://www.googleapis.com/auth/datastore'
        });

        const client = await auth.getClient();
        const projectId = project_Id;
        const accessToken = (await client.getAccessToken()).token;

        let headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-goog-request-params': `project_id=${projectId}&database_id=${db_name}`
        };

        switch (whatAreWeDoing) {
            case 'writeData':
                try {
                    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents/${collection_Id}`;
                    let formattedData = {
                        A: formatFirestoreValue(data.A),
                        B: formatFirestoreValue(data.B),
                        C: formatFirestoreValue(data.C),
                        D: formatFirestoreValue(data.D),
                        creationDate: formatFirestoreValue(new Date()), // Current date
                        invoiceDetails: formatFirestoreValue(data.invoiceDetails) // Nested map of invoice values
                    };
                    const createResponse = await axios.post(createUrl, { fields: formattedData }, { headers });
                    console.log('New invoice document created:', createResponse.data);

                    // Extracting document ID from the response
                    const createdDocumentPath = createResponse.data.name;
                    const documentId = createdDocumentPath.split('/').pop();

                    console.log('New invoice document created with ID:', documentId);
                    return documentId;
                    
                } catch (error) {
                    return handleError(error, 'Error in writeInvoice', safeStringify(data));
                }
                break;
            case 'updateData':
                try {
                    const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents/${collection_Id}/${data.documentId}?updateMask.fieldPaths=${Object.keys(data.updateFields).join('&updateMask.fieldPaths=')}`;
                    
                    // Remove creationDate if it exists in updateFields
                    if (data.updateFields.creationDate) {
                        console.warn("Warning: 'creationDate' field is being excluded from the update.");
                        delete data.updateFields.creationDate;
                    }

                    // Prepare the update payload
                    const updatePayload = {
                        fields: Object.fromEntries(Object.entries(data.updateFields).map(([k, v]) => [k, formatFirestoreValue(v)]))
                    };

                    // Perform the update
                    const updateResponse = await axios.patch(updateUrl, updatePayload, { headers });
                    console.log('Invoice document updated:', updateResponse.data);
                    return updateResponse;
                } catch (error) {
                    return handleError(error, 'Error in updateData', safeStringify(data));
                }
                break;
            case 'deleteData':
                try {
                    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents/${collection_Id}/${data.documentId}`;
                    const deleteResponse = await axios.delete(deleteUrl, { headers });
                    console.log('Invoice document deleted:', deleteResponse.data);
                    return deleteResponse;
                } catch (error) {
                   return handleError(error, 'Error in deleteData', safeStringify(data));
                }
                break;
            case 'readData':
                try {
                    const readUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents/${collection_Id}/${data.documentId}`;
                    const readResponse = await axios.get(readUrl, { headers });
                    console.log('Invoice document data:', readResponse.data);
                    return readResponse;
                } catch (error) {
                    return handleError(error, 'Error in readData', safeStringify(data));
                }
                break;
            default:
                throw new Error('Unsupported operation: ' + whatAreWeDoing);
        }
    } catch (error) {
        handleError(error, 'Error in interactWithFirestore', data);
    }
}

module.exports = { interactWithFirestore };


// interactWithFirestore('writeData', {
//       A: "any strineeeg value",
//       B: "any string value",
//       C: "any string value",
//       D: "any string value",
//       invoiceDetails: {
//         "key1": "value1",
//         "key2": "value2",
//         "key3": "value3",
//         "key4": "value4",
//         "key5": "value5",
//         "key6": "value6"
//       }
//   });

// interactWithFirestore('updateData', {
//     documentId: "NwB0ukqCXKrlRwyAv6QV",
//     updateFields: {
//               A: "any thingGGGG",
//               B: "any string value",
//               C: "any string value",
//               D: "any string value",
//               invoiceDetails: {
//                 "key1": "value1",
//                 "key2": "value2",
//                 "key3": "value3",
//                 "key4": "value4",
//                 "key5": "value5",
//                 "key6": "value6"
//               }
//     }
// });

// interactWithFirestore('deleteData', {
//     documentId: "1"
// });

// interactWithFirestore('readData', {
//     documentId: "1"
// });























//old version, updated 1/8/24



// const axios = require('axios');
// const { GoogleAuth } = require('google-auth-library');
// const fs = require('fs');
// require('dotenv').config({ path: 'cred.env' });

// const collection_Id = process.env.COLLECTIONID.toString();
// const db_name = process.env.DBNAME.toString();
// const keyFilename = process.env.KEYFILE.toString();
// const project_Id = process.env.PROJECTID.toString();
// const logFile = 'log.txt';

// function logToFile(message, data) {
//     const timestamp = new Date().toISOString();
//     fs.appendFileSync(logFile, `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n\n`);
// }

// function handleError(error, customMessage, data) {
//     const errorMsg = customMessage + '\n' + (error.response ? error.response.data : error);
//     logToFile(errorMsg, data);
//     console.error(errorMsg);
//     return errorMsg;
// }

// async function initializeFirestore() {
//     try {
//         const auth = new GoogleAuth({
//             keyFilename: keyFilename,
//             scopes: 'https://www.googleapis.com/auth/datastore'
//         });

//         const client = await auth.getClient();
//         const projectId = project_Id;

//         return { client, projectId };
//     } catch (error) {
//         throw handleError(error, 'Error in initializeFirestore', null);
//     }
// }

// async function getAccessToken(client) {
//     try {
//         const res = await client.getAccessToken();
//         return res.token;
//     } catch (error) {
//         throw handleError(error, 'Error getting access token', null);
//     }
// }

// async function getLastDocument(client, projectId, dbname, collectionId) {
//     try {
//         const accessToken = await getAccessToken(client);
//         const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}?pageSize=1`;
//         const headers = {
//             Authorization: `Bearer ${accessToken}`,
//             'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
//         };

//         const response = await axios.get(url, { headers });
//         if (response.data.documents && response.data.documents.length > 0) {
//             return response.data.documents[0];
//         } else {
//             console.log('No documents found in the collection.');
//             return null;
//         }
//     } catch (error) {
//         throw handleError(error, 'Error in getLastDocument', null);
//     }
// }

// async function createNewDocument(client, projectId, dbname, collectionId, data) {
//     try {
//         const accessToken = await getAccessToken(client);
//         const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}`;
//         const headers = {
//             Authorization: `Bearer ${accessToken}`,
//             'Content-Type': 'application/json',
//             'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
//         };

//         const response = await axios.post(url, { fields: data }, { headers });
//         console.log('New document created:', response.data);
//         return response.data;
//     } catch (error) {
//         throw handleError(error, 'Error creating new document', data);
//     }
// }

// async function getLastObjectId(document) {
//     let maxId = 0;
//     if (document && document.fields) {
//         for (let key in document.fields) {
//             if (key.startsWith('Invoice_ID_')) {
//                 const currentId = parseInt(key.replace('Invoice_ID_', ''));
//                 if (!isNaN(currentId) && currentId > maxId) {
//                     maxId = currentId;
//                 }
//             }
//         }
//     }
//     return maxId;
// }

// function formatFirestoreValue(value) {
//     // Check for Date type to format as Firestore timestamp
//     if (value instanceof Date) {
//         return { timestampValue: value.toISOString() };
//     }
//     if (typeof value === 'string') {
//         return { stringValue: value };
//     } else if (typeof value === 'boolean') {
//         return { booleanValue: value };
//     } else if (typeof value === 'number') {
//         return { integerValue: value.toString() };
//     } else if (Array.isArray(value)) {
//         return { arrayValue: { values: value.map(formatFirestoreValue) } };
//     } else if (typeof value === 'object') {
//         const fields = {};
//         Object.keys(value).forEach(key => {
//             fields[key] = formatFirestoreValue(value[key]);
//         });
//         return { mapValue: { fields } };
//     } else {
//         console.error("Unsupported data type for Firestore:", typeof value);
//         return null;
//     }
// }

// async function formatDataForFirestore(data) {
//     if (!data.fullInvoice || typeof data.fullInvoice !== 'object') {
//         throw new Error('Invalid or missing fullInvoice in data');
//     }

//     let formattedData = {};
//     for (let [key, value] of Object.entries(data.fullInvoice)) {
//         // Special handling for the 'completedDate' field
//         if (key === 'completedDate') {
//             formattedData[key] = formatFirestoreValue(new Date(value));
//         } else if (key === 'invoicemap') {
//             let mapFields = {};
//             for (let [mapKey, mapValue] of Object.entries(value)) {
//                 mapFields[mapKey] = formatFirestoreValue(mapValue);
//             }
//             formattedData[key] = { mapValue: { fields: mapFields } };
//         } else {
//             formattedData[key] = formatFirestoreValue(value);
//         }
//     }
//     if (data.invoiceid !== null) {
//         formattedData['Invoice_ID'] = { integerValue: data.invoiceid.toString() };
//     }
//     return formattedData;
// }

// function estimateDocumentSize(document) {
//     let size = 0;
//     for (let key in document.fields) {
//         size += key.length + estimateValueSize(document.fields[key]);
//     }
//     return size;
// }

// function estimateValueSize(value) {
//     if (value === null) {
//         return 0;
//     }
//     if (value.stringValue) {
//         return value.stringValue.length;
//     }
//     return 0;
// }

// function isDocumentWithinSizeLimit(document, newData) {
//     const currentSize = estimateDocumentSize(document);
//     const newSize = estimateDocumentSize({ fields: newData });
//     const totalSize = currentSize + newSize;
//     return totalSize <= 1000000;
// }

// async function writeData(client, projectId, dbname, collectionId, documentId, newData) {
//     const accessToken = await getAccessToken(client);
//     const headers = {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//         'x-goog-request-params': `database=${encodeURIComponent(`projects/${projectId}/databases/${dbname}`)}`
//     };
//     var lastDocument;
//     var lastId;
//     var newId;
//     var newFieldKey = newData.invoiceid;
    
//     if(newFieldKey === null) {
//         // Prepare the new field data with the incremented ID as the key
//         lastDocument = await getLastDocument(client, projectId, dbname, collectionId);
//         lastId = await getLastObjectId(lastDocument);
//         newId = lastId + 1; // Increment ID for the new object field
//         newFieldKey = `Invoice_ID_${newId}`;
//     } else {
//         newFieldKey = `Invoice_ID_${newFieldKey}`;
//     }

//     // Format the data for Firestore
//     newData = await formatDataForFirestore(newData);

//     // Update data with the new field
//     const updateData = {
//         [newFieldKey]: { 
//             mapValue: {
//                 fields: newData
//             }
//         }
//     };

//     // Append additional provided data and prepare updateMask
//     let updateMaskFields = [];

//     // Add the new field key to the updateMask
//     updateMaskFields.push(`updateMask.fieldPaths=${encodeURIComponent(newFieldKey)}`);

//     const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}/${documentId}?${updateMaskFields.join('&')}`;

//     try {
//         // Send the PATCH request to update the document with the new fields
//         const response = await axios.patch(url, { fields: updateData }, { headers });
//         console.log('Document updated with new fields:', response.data.fields);
//         var id = Math.max(...Object.keys(response.data.fields).map(key => parseInt(key.match(/(\d+)$/)?.[1] || 0)))
//         console.log('New ID:', id );
//         return "New Invoice ID: "+id;
//     } catch (error) {
//         console.error('Error updating document:', error.response ? error.response.data : error.message);
//     }
// }

// async function deleteData(client, projectId, dbname, collectionId, documentId, targetObjectId) {
//     const accessToken = await getAccessToken(client);
//     const headers = {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//         'x-goog-request-params': `database=${encodeURIComponent(`projects/${projectId}/databases/${dbname}`)}`
//     };

//     const deleteFieldKey = `Invoice_ID_${targetObjectId}`;
//     const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}/${documentId}?updateMask.fieldPaths=${encodeURIComponent(deleteFieldKey)}`;

//     try {
//         let done = await axios.patch(url, { fields: { [deleteFieldKey]: { nullValue: null } } }, { headers });
//         console.log(`Field ${deleteFieldKey} deleted successfully: Res: ${done}`);
//         return `Invoice ${deleteFieldKey} deleted successfully`;
//     } catch (error) {
//         console.error('Error deleting field:', error.response ? error.response.data : error.message);
//     }
// }

// async function readData(client, projectId, dbname, collectionId, documentId) {
//     const accessToken = await getAccessToken(client);
//     const headers = {
//         Authorization: `Bearer ${accessToken}`,
//         'x-goog-request-params': `project_id=${projectId}&database_id=${dbname}`
//     };

//     const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbname}/documents/${collectionId}/${documentId}`;

//     try {
//         const response = await axios.get(url, { headers });
//         return response.data;
//     } catch (error) {
//         console.error('Error reading document:', error.response ? error.response.data : error);
//         return null;
//     }
// }

// async function interactWithFirestore(whatAreWeDoing, data) {
//     if (!data) {
//         throw new Error('No data provided to interactWithFirestore function');
//     }

//     try {
//         const { client, projectId } = await initializeFirestore();
//         let documentId;
//         let output;
//         let lastDocument = await getLastDocument(client, projectId, db_name, collection_Id);
//         documentId = lastDocument ? lastDocument.name.split('/').pop() : null;

//         switch (whatAreWeDoing) {
//             case 'writeData':
//                 if (!(lastDocument && isDocumentWithinSizeLimit(lastDocument, data))) {
//                     const newDocument = await createNewDocument(client, projectId, db_name, collection_Id, data);
//                     if (newDocument) {
//                         documentId = newDocument.name.split('/').pop();
//                     } else {
//                         throw new Error('Failed to create a new document');
//                     }
//                 }
//                 //WEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
//             case 'updateData':
//                 output = await writeData(client, projectId, db_name, collection_Id, documentId, data);
//                 console.log('Data added to document ID:', documentId);
//                 break;

//             case 'deleteData':
//                 output = await deleteData(client, projectId, db_name, collection_Id, documentId, data.invoiceid);
//                 break;

//             case 'readData':
//                 output = await readData(client, projectId, db_name, collection_Id, documentId);
//                 break;

//             default:
//                 throw new Error('Unsupported operation: ' + whatAreWeDoing);
//         }
//         return output;
//     } catch (error) {
//         throw handleError(error, 'Error in the main function', data);
//     }
// }

// module.exports = { interactWithFirestore };
// // interactWithFirestore('writeData', {
// //     invoiceid: null,
// //     completedDate: 'todays date',
// //     fullInvoice: {
// //       A: "any string value",
// //       B: "any string value",
// //       C: "any string value",
// //       D: "any string value",
// //       invoicemap: {
// //         "key1": "value1",
// //         "key2": "value2",
// //       }
// //     }
// //   });

