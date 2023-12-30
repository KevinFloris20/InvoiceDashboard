//routes
const express = require('express');
const router = express.Router();

//get the pdfdata
const { extractFormFields } = require('./models/extractPDFData');
router.get('/formdata', async (req, res) => {
    try {
        const pdfPath = 'FCRInvoiceTemplateNull.pdf';
        const fieldData = await extractFormFields(pdfPath);
        res.json(fieldData);
    } catch (error) {
        res.status(500).send('Error processing PDF');
    }
});

//just run the sendObjToDB.js file
const { interactWithFirestore } = require('./models/firestoreApp.js');



//export
module.exports = router;

// var sampledata = {
//   invoiceid: '2',
//   wholeInvoice: {
//     A: "Test",
//     B: "Test",
//     C: "any string value",
//     D: "any string value",
//     invoicemap: {
//       "key1": "value1",
//       "key2": "value2",
//       "key3": "value3",
//       "key4": "value4",
//       "key5": "value5",
//     }
//   }
// };