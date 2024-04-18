// validation.js
const { getClients } = require('./mySqlApp.js');

function validateAndTransform(inboundData) {
    // Validate presence and non-empty values for 'A', 'B', 'C'
    const requiredNonEmptyKeys = ['A', 'B', 'C'];
    for (let key of requiredNonEmptyKeys) {
        if (!inboundData.hasOwnProperty(key) || inboundData[key].trim() === '') {
            throw new Error(`'${info[key]}' is missing or empty`);
        }
    }

    // Initialize outbound data structure
    const outboundData = {
        A: inboundData.A,
        B: inboundData.B,
        C: inboundData.C,
        D: inboundData.D || '',  
        E: inboundData.E || '', 
        creationDate: new Date().toISOString(),
        invoiceDetails: {}
    };

    // Validate and populate invoiceDetails
    const keyPattern = /^\d+[A-Z]$/;
    for (let key in inboundData) {
        if (!['A', 'B', 'C', 'D', 'E', 'creationDate'].includes(key)) {
            if (!keyPattern.test(key)) {
                throw new Error(`Invalid key format: '${key}'. Expected format: digit followed by a capital letter.`);
            }
            outboundData.invoiceDetails[key] = inboundData[key];
        }
    }

    return outboundData;
}

function validateWorkItem(data, allClients) {
    let errors = [];
    let hasValidRows = false;
    let unitNum = '';
    let workItemId = parseInt(data['dataFieldId']) ? parseInt(data['dataFieldId'].trim()) : null;


    let clientName = data['Client'] ? data['Client'].trim() : '';
    if (!clientName) {
        errors.push("Error: Client name is required");
    }
    let [clientId, clientsName] = clientName.split(" - ");
    clientId = clientId ? clientId : null;
    if (!clientId) {
        errors.push("Error: Client ID is required and must be a number");
    }
    clientId = parseInt(clientId);

    let clientMatchFound = false;
    for (const x of allClients) {
        if (clientId === x.client_id) {
            clientMatchFound = true;
            clientsName = x.client_name;
            if (clientsName.trim() !== x.client_name.trim()) {
                errors.push("Error: Client ID does not match name ");
            }
            break;
        }
    }
    if (!clientMatchFound) {
        errors.push("Error: No client found with ID: " + clientId);
    }



    let workDate = data['date'] ? data['date'].trim() : '';
    if (!workDate) {
        errors.push("Error: Work date is required");
    }

    let description = {};
    let columnAWithoutParenthesesCount = 0;
    let hasDescriptionInB = false;
    let hasPriceInC = false;

    Object.keys(data).forEach(key => {
        if (typeof data[key] !== 'string') return;
        let value = data[key].trim();
        if (key === 'Client' || key === 'date') return;

        let match = key.match(/^(\d+)([ABC])$/);
        if (match) {
            let rowNumber = match[1];
            let column = match[2];
            if (!description[rowNumber]) {
                description[rowNumber] = { A: "", B: "", C: "" };
            }
            description[rowNumber][column] = value;

            if (column === 'A' && value && !value.startsWith('(') && !value.endsWith(')') && !unitNum) {
                unitNum = value;
            }

            if (value) {
                hasValidRows = true;
                if (column === 'A') {
                    if (!value.startsWith('(') && !value.endsWith(')')) {
                        columnAWithoutParenthesesCount++;
                    }
                } else if (column === 'B' && value.startsWith('-')) {
                    hasDescriptionInB = true;
                } else if (column === 'C' && /^\d+\.\d{2}$/.test(value)) {
                    hasPriceInC = true;
                }
            }
        }
    });

    if (columnAWithoutParenthesesCount === 0) {
        errors.push("Error: Missing Equipment ID");
    }
    if (columnAWithoutParenthesesCount > 1) {
        errors.push("Error: Only one Equipment ID is allowed per work item, please use parentheses: \"( )\"");
    }
    if (!hasDescriptionInB) {
        errors.push("Error: Missing Description, or invalid format (- XYZ");
    }
    if (!hasPriceInC) {
        errors.push("Error: Missing Price, or invalid format (123.45)");
    }

    let filteredDescription = Object.entries(description).reduce((acc, [key, row]) => {
        if (row.A || row.B || row.C) {
            acc[key] = row;
        }
        return acc;
    }, {});

    if (!hasValidRows) {
        errors.push("Error: At least one row must have values");
    }

    let isValid = errors.length === 0;
    let transformedData = null;
    if (isValid) {
        transformedData = {
            clientId,
            clientsName,
            workItemId,
            unitNum,
            workDate,
            description: JSON.stringify(filteredDescription)
        };
    }

    return { isValid, errors, data: transformedData };
}

async function validateWITI(data) {
    let errors = [];
    let isValid = true;
    const { workItemIds, workItemClientIds, invoiceDate, invoiceNumber } = data;

    //validate workItemIds
    if (!workItemIds) {
        errors.push("Error: work items field is missing");
        isValid = false;
    } else if (!Array.isArray(workItemIds) || !workItemIds.length) {
        errors.push("Error: work items need to be an array of at least one item");
        isValid = false;
    } else if (workItemIds.some(id => typeof id !== 'string')) {
        errors.push("Error: work items needs to be a string");
        isValid = false;
    } else if (workItemIds.some(id => !/^\d+$/.test(id))) {
        errors.push("Error: work items need to be a number");
        isValid = false;
    }

    //validate workItemClientIds and check if all the client ids match
    if (!workItemClientIds) {
        errors.push("Error: work items client id field is missing");
        isValid = false;
    } else if (!Array.isArray(workItemClientIds) || !workItemClientIds.length) {
        errors.push("Error: work items client ids need to be an array of at least one item");
        isValid = false;
    } else if (workItemClientIds.some(id => typeof id !== 'string')) {
        errors.push("Error: work items client ids needs to be a string");
        isValid = false;
    } else if (workItemClientIds.some(id => !/^\d+$/.test(id))) {
        errors.push("Error: work items client ids need to be a number");
        isValid = false;
    } else if (new Set(workItemClientIds).size !== 1) {
        errors.push("Error: Multiple clients detected, only one client is allowed per invoice");
        isValid = false;
    }

    //MM/DD/YYYY format only
    if (!invoiceDate) {
        errors.push("Error: invoice date field is missing");
        isValid = false;
    } else {
        const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(20\d\d)$/;
        if (typeof invoiceDate !== 'string' || !dateRegex.test(invoiceDate)) {
            errors.push("Error: Invalid invoice date format, required MM/DD/YYYY");
            isValid = false;
        } else {
            const dateObject = new Date(invoiceDate);
            if (dateObject.toString() === 'Invalid Date' || dateObject.getFullYear() < 1420 || dateObject.getFullYear() > 4069) {
                errors.push("Error: Invoice date is outside of allowed year range: (1420-4069)");
                isValid = false;
            }
        }
    }

    //check for string
    if (!invoiceNumber) {
        errors.push("Error: Invoice # field is missing");
        isValid = false;
    } else if (typeof invoiceNumber !== 'string') {
        errors.push("Error: Invoice # must be a string");
        isValid = false;
    } else if (!invoiceNumber.trim()) {
        errors.push("Error: Invoice # cannot be empty");
        isValid = false;
    }

    let newData = {
        work_item_IDs: null,
        work_item_client_ID: null,
        invoice_date: null,
        invoice_number: null
    };

    if (isValid) {
        newData.work_item_IDs = workItemIds.map(id => parseInt(id.trim()));
        newData.work_item_client_ID = parseInt(workItemClientIds[0]);
        newData.invoice_date = invoiceDate;
        newData.invoice_number = invoiceNumber;
    }

    return { isValid, errors, cleanedworkItemToInvoiceConverterData: newData };
}

// Info object to provide more context in error messages
const info = {
    'A': 'Invoice #',
    'B': 'Date',
    'C': 'Name',
    'D': 'Address',
    'E': 'Email'
};

module.exports = { validateAndTransform, validateWorkItem, validateWITI };

// // Example usage
// try {
//     const inboundDataExample = {
//         A: '-',
//         B: 'Value B',
//         C: 'Value C',
//         D: '',  // D can be empty
//         'lol': 'Value 1A',
//         '1B': 'Value 1B'
//         // ... other key-value pairs
//     };

//     const transformedData = validateAndTransform(inboundDataExample);
//     console.log(transformedData);
// } catch (error) {
//     console.error(error.message);
// }































// inbound data format:
// {
//     A: '',
//     B: '',
//     C: '',
//     D: '',
//     '1A': '',
//     '1B': '',
//     '1C': '',
//     '2A': '',
//     '2B': '',
//     '2C': '',
//     '3A': '',
//     '3B': '',
//     '3C': '',
//     '4A': '',
//     '4B': '',
//     '4C': '',
//     '5A': '',
//     '5B': '',
//     '5C': '',
//     '6A': '',
//     '6B': '',
//     '6C': '',
//     '7A': '',
//     '7B': '',
//     '7C': '',
//     '8A': '',
//     '8B': '',
//     '8C': '',
//     '9A': '',
//     '9B': '',
//     '9C': '',
//     '10A': '',
//     '10B': '',
//     '10C': '',
//     '11A': '',
//     '11B': '',
//     '11C': '',
//     '12A': '',
//     '12B': '',
//     '12C': '',
//     '13A': '',
//     '13B': '',
//     '13C': '',
//     '14A': '',
//     '14B': '',
//     '14C': '',
//     '15A': '',
//     '15B': '',
//     '15C': '',
//     '16A': '',
//     '16B': '',
//     '16C': '',
//     '17A': '',
//     '17B': '',
//     '17C': '',
//     '18A': '',
//     '18B': '',
//     '18C': '',
//     '19A': '',
//     '19B': '',
//     '19C': '',
//     '20A': '',
//     '20B': '',
//     '20C': '',
//     '21A': '',
//     '21B': '',
//     '21C': '',
//     '22A': '',
//     '22B': '',
//     '22C': '',
//     '23A': '',
//     '23B': '',
//     '23C': '',
//     '24A': '',
//     '24B': '',
//     '24C': '',
//     '25A': '',
//     '25B': '',
//     '25C': '',
//     '26A': '',
//     '26B': '',
//     '26C': ''
//   }


// outbound data format:
//  {
//     invoiceid: null,
//     completedDate: "todays date",
//     fullInvoice: {
//       A: "any string value",
//       B: "any string value",
//       C: "any string value",
//       D: "any string value",
//       invoicemap: {
//         "key1": "value1",
//         "key2": "value2",
//       }
//     }
//   }

