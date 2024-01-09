// validation.js

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
        D: inboundData.D || '',  // 'D' can be empty
        creationDate: new Date().toISOString(), // ISO string for the Firestore timestamp
        invoiceDetails: {}
    };

    // Validate and populate invoiceDetails
    const keyPattern = /^\d+[A-Z]$/;
    for (let key in inboundData) {
        if (!['A', 'B', 'C', 'D', 'creationDate'].includes(key)) {
            if (!keyPattern.test(key)) {
                throw new Error(`Invalid key format: '${key}'. Expected format: digit(s) followed by a capital letter.`);
            }
            outboundData.invoiceDetails[key] = inboundData[key];
        }
    }

    return outboundData;
}

// Info object to provide more context in error messages
const info = {
    'A': 'Invoice #',
    'B': 'Date',
    'C': 'Name',
    'D': 'Address'
};

module.exports = { validateAndTransform };

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

