//routes
const express = require('express');
const router = express.Router();
const fs = require('fs');


//get the pdfdata
const { extractFormFields } = require('./models/PDFDataApp.js');
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

const { validateAndTransform } = require('./models/validation.js');

const { newInvoicePDF } = require('./models/PDFDataApp.js');

router.post('/submit-form', async (req, res) => {
    try {
        const submitData = req.body;
        var result;

        // Validate and transform data
        const validatedData = validateAndTransform(submitData);

        console.log(validatedData);

        // Save the data to the database
        if (validatedData.invoiceid === null) {
            // New invoice
            result = await interactWithFirestore('writeData', validatedData);

        } else {
            // Existing invoice
            result = await interactWithFirestore('updateData', validatedData);
        }

        // Respond with success and any additional data if needed
        res.json({ message: 'Invoice submitted successfully', result: result });
    } catch (error) {
        // Send back the error message to the client
        res.status(500).json({ error: error.message });
    }
});

router.post('/download-invoice', async (req, res) => {
    try {
        const data = req.body; // Assuming the data is sent in the request body
        var pdfPath;
        //check if a file exists FCRInvoiceTemplate if not then use FCRInvoiceTemplateNull
        if (fs.existsSync('FCRInvoiceTemplate.pdf')) {
            pdfPath = 'FCRInvoiceTemplate.pdf';
        } else {
            pdfPath = 'FCRInvoiceTemplateNull.pdf';
        }
        const pdfBytes = await newInvoicePDF(data, pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
        res.setHeader('Content-Length', pdfBytes.length);
        
        res.end(pdfBytes);
    } catch (error) {
        console.error(error);
        console.log(error.message)
        res.status(500).json({message:'Error generating invoice', error:error.message});
    }
});

router.get('/getInvoices', async (req, res) => {
    try {
        const data = req.body;
        const firestoreData = await interactWithFirestore('readData', data);

        // Send back only the fields part
        if (firestoreData && firestoreData.fields) {
            res.json(firestoreData.fields);
        } else {
            res.status(404).json({ message: 'No invoices found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching invoices', error: error.message });
    }
});


//export
module.exports = router;

// var sampledata = {
//   invoiceid: '2',
//   wholeInvoice: {
//     
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