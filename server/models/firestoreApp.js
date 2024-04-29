const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
require('dotenv').config({ path: 'cred.env' });
const moment = require('moment-timezone');

//import firebase
const collection_Id = process.env.COLLECTIONID.toString();
const db_name = process.env.DB2NAME.toString();
const keyFilename = process.env.KEYFILE.toString();
const project_Id = process.env.PROJECTID.toString();
const logFile = 'log.txt';

// Helper function for logging
function logToFile(message, data) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n\n`);
}

// Helper function for error handling
function handleError(error, customMessage, data) {
    let detailedError = `${customMessage}\nError Details: ${error.message}`;
    if (error.response) {
        detailedError += `\nResponse Data: ${safeStringify(error.response.data)}`;
    }
    detailedError += `\nStack Trace: ${error.stack}`;
    logToFile(detailedError, data);
    console.error(detailedError);
    return detailedError;
}

// Function to safely stringify error objects
function safeStringify(obj) {
    // let cache = [];
    // const retVal = JSON.stringify(obj, (key, value) =>
    //     typeof value === 'object' && value !== null
    //         ? cache.includes(value)
    //             ? undefined
    //             : cache.push(value) && value
    //         : value,
    //     indent
    // );
    // cache = null;
    // return retVal;
    return obj
}

// Convert MM/DD/YYYY to ISO format
function convertToISO(dateStr) {
    if (!dateStr) return null;
    const isoDate = moment.tz(dateStr, "MM/DD/YYYY", "UTC").toISOString();
    return isoDate;
}


// Convert ISO format to MM/DD/YYYY
function convertToMMDDYYYY(dateStr) {
    if (!dateStr) return '';
    const dateInUTC = moment.tz(dateStr, "UTC");
    const formattedDate = dateInUTC.format("MM/DD/YYYY");
    return formattedDate;
}

// Function to format data for Firestore
function formatFirestoreValue(value) {
    if (value instanceof Date) {
        return { timestampValue: value.toISOString() };
    }
    else if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return { timestampValue: convertToISO(value) };
    } 
    else if (typeof value === 'string') {
        return { stringValue: value };
    } 
    else if (typeof value === 'boolean') {
        return { booleanValue: value };
    } 
    else if (typeof value === 'number') {
        return { integerValue: value.toString() };
    } 
    else if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(formatFirestoreValue) } };
    } 
    else if (typeof value === 'object' && value !== null) {
        const fields = {};
        for (const [key, val] of Object.entries(value)) {
            fields[key] = formatFirestoreValue(val);
        }
        return { mapValue: { fields } };
    } 
    else {
        console.error("Unsupported data type for Firestore:", typeof value);
    }
}

// Main function to interact with Firestore
async function interactWithFirestore(whatAreWeDoing, data) {
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
                        E: formatFirestoreValue(data.E),
                        creationDate: formatFirestoreValue(new Date()),
                        invoiceDetails: formatFirestoreValue(data.invoiceDetails),
                    };
                    console.log("Submitting this object: ", formattedData)
                    const createResponse = await axios.post(createUrl, { fields: formattedData }, { headers });
                    console.log('New invoice document created:', createResponse.data);

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
                    const documentId = data.documentId;
                    if (!documentId) {
                        throw new Error("Document ID is required for updating data.");
                    }
                    const formattedData = {};
                    for (const [key, value] of Object.entries(data.updateFields)) {
                        formattedData[key] = formatFirestoreValue(value);
                    }
                    delete formattedData.creationDate;
                    const fieldPaths = Object.keys(formattedData).join('&updateMask.fieldPaths=');
                    const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents/${collection_Id}/${documentId}?updateMask.fieldPaths=${fieldPaths}`;
                    const updatePayload = {
                        fields: formattedData
                    };
                    const updateResponse = await axios.patch(updateUrl, updatePayload, { headers });
                    console.log('Invoice document updated:', updateResponse.data);
                    return updateResponse.data;
                } catch (error) {
                    return handleError(error, 'Error in updateData', safeStringify(data));
                }
                break;
            case 'deleteData':
                try {
                    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents/${collection_Id}/${data.documentId}`;
                    const deleteResponse = await axios.delete(deleteUrl, { headers });
                    console.log('Invoice document deleted:', data.documentId , deleteResponse.data);
                    return deleteResponse.data;
                } catch (error) {
                   return handleError(error, 'Error in deleteData', safeStringify(data));
                }
                break;
            case 'readData':
                try {
                    const pageSize = (Number.isFinite(data) && data > 0) ? data : 5; 
                    const orderBy = encodeURIComponent('creationDate desc'); 
                    const readUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents/${collection_Id}?pageSize=${pageSize}&orderBy=${orderBy}`;
                    const readResponse = await axios.get(readUrl, { headers });

                    if (readResponse.data && readResponse.data.documents) {
                        readResponse.data.documents.forEach(doc => {
                            if (doc.fields.B && doc.fields.B.timestampValue) {
                                doc.fields.B = {stringValue: convertToMMDDYYYY(doc.fields.B.timestampValue)};
                            }
                        });
                    }

                    return readResponse;
                } catch (error) {
                    return handleError(error, 'Error in readData', safeStringify(data));
                }
                break;
            case 'readAdvancedData':
                try {
                    await data; // just in case ;D
                
                    // THese are the query parameters
                    let queryPayload = {
                        structuredQuery: {
                            from: [{ collectionId: collection_Id }],
                            orderBy: [{
                                field: { fieldPath: data.invoiceStartDate && data.invoiceEndDate ? 'B' : 'creationDate'},
                                direction: data.invoiceStartDate && data.invoiceEndDate ? 'ASCENDING' : 'DESCENDING'
                            }],
                            where: {
                                compositeFilter: {
                                    op: 'AND',
                                    filters: []
                                }
                            }
                        }
                    };
                    if (data.clientAccountName && data.clientAccountName !== 'ALL') {
                        queryPayload.structuredQuery.where.compositeFilter.filters.push({
                            fieldFilter: {
                                field: { fieldPath: 'C' }, 
                                op: 'EQUAL',
                                value: { stringValue: data.clientAccountName }
                            }
                        });
                    }
                    if (data.invoiceStartDate) {
                        queryPayload.structuredQuery.where.compositeFilter.filters.push({
                            fieldFilter: {
                                field: { fieldPath: 'B' },
                                op: 'GREATER_THAN_OR_EQUAL',
                                value: { timestampValue: new Date(data.invoiceStartDate + 'T00:00:00Z').toISOString() }
                            }
                        });
                    }
                    if (data.invoiceEndDate) {
                        queryPayload.structuredQuery.where.compositeFilter.filters.push({
                            fieldFilter: {
                                field: { fieldPath: 'B' },
                                op: 'LESS_THAN',
                                value: { timestampValue: new Date(data.invoiceEndDate + 'T00:00:00Z').toISOString() }
                            }
                        });
                    }
                
                    if (data.numberOfQueryRes !== 'ALL' && !isNaN(parseInt(data.numberOfQueryRes))) {
                        queryPayload.structuredQuery.limit = parseInt(data.numberOfQueryRes);
                    }
                
                    // These will be the api call to firestore
                    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents:runQuery`;
                    const queryResponse = await axios.post(queryUrl, queryPayload, { headers });
                
                    //DONNNE
                    const processedData = queryResponse.data.map(item => {
                        if (item.document) {
                            const document = item.document;
                            const doc = item.document.fields;
                            if (doc.B && doc.B.timestampValue) {
                                document.fields.B = { stringValue: convertToMMDDYYYY(doc.B.timestampValue) };
                            }
                            document.id = document.name.split('/').pop();
                            return document;
                        }
                        return null;
                    }).filter(item => item !== null);
                    return processedData;
                } catch (error) {
                    console.error('Error in readAdvancedData:| Status:', error.response?.status, "| Message: ", error.message, "| Data: ", error.response?.data);
                }
                break;
                    try {
                        let queryPayload = {
                            structuredQuery: {
                                from: [{ collectionId: collection_Id }],
                                orderBy: [{
                                    field: { fieldPath: 'creationDate' },
                                    direction: 'DESCENDING'
                                }]
                            }
                        };
                
                        if (data.invoice_Id && data.invoice_Num) {
                            // Ensure both fields are not empty
                            queryPayload.structuredQuery.where = {
                                compositeFilter: {
                                    op: 'AND',
                                    filters: [
                                        {
                                            fieldFilter: {
                                                field: { fieldPath: '__name__' },
                                                op: 'EQUAL',
                                                value: { stringValue: data.invoice_Id }
                                            }
                                        },
                                        {
                                            fieldFilter: {
                                                field: { fieldPath: 'A' },
                                                op: 'EQUAL',
                                                value: { stringValue: data.invoice_Num }
                                            }
                                        }
                                    ]
                                }
                            };
                        } else if (data.invoice_Id) {
                            // Ensure invoice_Id is not empty
                            if (data.invoice_Id.trim() !== '') {
                                queryPayload.structuredQuery.where = {
                                    fieldFilter: {
                                        field: { fieldPath: '__name__' },
                                        op: 'EQUAL',
                                        value: { stringValue: data.invoice_Id }
                                    }
                                };
                            } else {
                                throw new Error("Invoice ID is required but was empty.");
                            }
                        } else if (data.invoice_Num) {
                            // Ensure invoice_Num is not empty
                            if (data.invoice_Num.trim() !== '') {
                                queryPayload.structuredQuery.where = {
                                    fieldFilter: {
                                        field: { fieldPath: 'A' },
                                        op: 'EQUAL',
                                        value: { stringValue: data.invoice_Num }
                                    }
                                };
                            } else {
                                throw new Error("Invoice Number is required but was empty.");
                            }
                        } else {
                            // If both are empty, throw an error or handle appropriately
                            throw new Error("At least one identifier (Invoice ID or Invoice Number) is required.");
                        }
                
                        const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents:runQuery`;
                        const queryResponse = await axios.post(queryUrl, queryPayload, { headers });
                
                        if (queryResponse.status !== 200) {
                            throw new Error(`Error in getInvoice: Status ${queryResponse.status}`);
                        }
                
                        const processedData = queryResponse.data.map(item => {
                            if (item.document) {
                                const document = item.document;
                                document.fields = Object.keys(document.fields).reduce((acc, key) => {
                                    acc[key] = document.fields[key].stringValue || document.fields[key].timestampValue || document.fields[key];
                                    return acc;
                                }, {});
                                document.id = document.name.split('/').pop();
                                return document;
                            }
                            return null;
                        }).filter(item => item !== null);
                
                        console.log('Invoice data retrieved:', JSON.stringify(processedData, null, 2));
                        return processedData;
                    } catch (error) {
                        return handleError(error, 'Error in getInvoice', JSON.stringify(data, null, 2));
                    }
                    break;
                
                console.log('Getting invoice data:', data);
                try {
                    let queryPayload = {
                        structuredQuery: {
                            from: [{ collectionId: collection_Id }],
                            orderBy: [{
                                field: { fieldPath: 'creationDate' },
                                direction: 'DESCENDING'
                            }]
                        }
                    };
            
                    const filters = [];
                    if (data.invoice_Id) {
                        queryPayload.structuredQuery.where = {
                            fieldFilter: {
                                field: { fieldPath: '__name__' },
                                op: 'EQUAL',
                                value: { stringValue: data.invoice_Id }
                            }
                        };
                    } else if (data.invoice_Num) {
                        queryPayload.structuredQuery.where = {
                            fieldFilter: {
                                field: { fieldPath: 'A' },
                                op: 'EQUAL',
                                value: { stringValue: data.invoice_Num }
                            }
                        };
                    }
            
                    if (data.invoice_Id && data.invoice_Num) {
                        queryPayload.structuredQuery.where = {
                            compositeFilter: {
                                op: 'AND',
                                filters: [
                                    {
                                        fieldFilter: {
                                            field: { fieldPath: '__name__' },
                                            op: 'EQUAL',
                                            value: { stringValue: data.invoice_Id }
                                        }
                                    },
                                    {
                                        fieldFilter: {
                                            field: { fieldPath: 'A' },
                                            op: 'EQUAL',
                                            value: { stringValue: data.invoice_Num }
                                        }
                                    }
                                ]
                            }
                        };
                    }
            
                    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents:runQuery`;
                    const queryResponse = await axios.post(queryUrl, queryPayload, { headers });

                    //check if res is ok
                    if (queryResponse.status !== 200) {
                        throw new Error(`Error in getInvoice: Status ${queryResponse.status}`);
                    }
            
                    const processedData = queryResponse.data.map(item => {
                    if (item.document) {
                        const document = item.document;
                        const doc = item.document.fields;
                        if (doc.B && doc.B.timestampValue) {
                            document.fields.B = { stringValue: convertToMMDDYYYY(doc.B.timestampValue) };
                        }
                        document.id = document.name.split('/').pop();
                        return document;
                    }
                        return null;
                    }).filter(item => item !== null);
            
                    // console.log('Invoice data retrieved:', processedData);
                    return processedData;
                } catch (error) {
                    return handleError(error, 'Error in getInvoice', safeStringify(data));
                }
                break;
            case 'getInvoice':
                try {
                    let queryPayload = {
                        structuredQuery: {
                            from: [{ collectionId: collection_Id }],
                            orderBy: [{
                                field: { fieldPath: 'creationDate' },
                                direction: 'DESCENDING'
                            }]
                        }
                    };
            
                    let filters = [];
                    if (data.invoice_Id.trim() !== '') {
                        filters.push({
                            fieldFilter: {
                                field: { fieldPath: '__name__' },
                                op: 'EQUAL',
                                value: { referenceValue: `projects/${projectId}/databases/${db_name}/documents/${collection_Id}/${data.invoice_Id}` }
                            }
                        });
                    }
                    if (data.invoice_Num.trim() !== '') {
                        filters.push({
                            fieldFilter: {
                                field: { fieldPath: 'A' },
                                op: 'EQUAL',
                                value: { stringValue: data.invoice_Num }
                            }
                        });
                    }
            
                    if (filters.length === 1) {
                        queryPayload.structuredQuery.where = filters[0];
                    } else if (filters.length > 1) {
                        queryPayload.structuredQuery.where = {
                            compositeFilter: {
                                op: 'AND',
                                filters: filters
                            }
                        };
                    }
            
                    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db_name}/documents:runQuery`;
                    const queryResponse = await axios.post(queryUrl, queryPayload, { headers });
            
                    if (queryResponse.status !== 200) {
                        throw new Error(`Error in getInvoice: Status ${queryResponse.status}`);
                    }
            
                    //DONNNE
                    const processedData = queryResponse.data.map(item => {
                        if (item.document) {
                            const document = item.document;
                            const doc = item.document.fields;
                            if (doc.B && doc.B.timestampValue) {
                                document.fields.B = { stringValue: convertToMMDDYYYY(doc.B.timestampValue) };
                            }
                            document.id = document.name.split('/').pop();
                            return document;
                        }
                        return null;
                    }).filter(item => item !== null);
                    return processedData;
                } catch (error) {
                    console.error('Error Details:', error.message);
                    if (error.response) {
                        console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
                    }
                    return handleError(error, 'Error in getInvoice', JSON.stringify(data, null, 2));
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

