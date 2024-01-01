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


router.post('/submit-form', async (req, res) => {
    try {
        const submitData = req.body;
        // Save the data to the database
        // const saveResult = await interactWithFirestore(submitData);
        console.log(submitData);

        // Respond with success and any additional data if needed
        res.json({ message: 'Form submitted successfully' });
    } catch (error) {
        res.status(500).send('Error submitting form');
    }
});

router.get('/download-invoice', async (req, res) => {
    try {
        // Generate or locate the invoice PDF file
        // This is highly dependent on how you're generating or storing your PDFs

        // For demonstration, if you had a static file to send:
        console.log("downloaded");
        // Or if you're dynamically generating a PDF:
        // const pdfBuffer = await generateInvoicePDF();
        // res.setHeader('Content-Type', 'application/pdf');
        // res.send(pdfBuffer);
    } catch (error) {
        res.status(500).send('Error downloading invoice');
    }
});

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