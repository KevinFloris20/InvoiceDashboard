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

const { interactWithFirestore } = require('./models/firestoreApp.js');

const { validateAndTransform } = require('./models/validation.js');

const { newInvoicePDF } = require('./models/PDFDataApp.js');

router.post('/submit-form', async (req, res) => {
    try {
        const submitData = req.body;
        var result;
        const validatedData = validateAndTransform(submitData);

        if (!validatedData.invoiceid) {
            result = await interactWithFirestore('writeData', validatedData);
        } else {
            result = await interactWithFirestore('updateData', {
                documentId: validatedData.invoiceid,
                updateFields: validatedData
            });
        }

        res.json({ message: 'Invoice submitted successfully', result: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/download-invoice', async (req, res) => {
    try {
        const data = req.body; 
        var pdfPath;
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
        const firestoreData = await interactWithFirestore('readData', 100);

        if (firestoreData && firestoreData.data && firestoreData.data.documents) {
            const documents = firestoreData.data.documents.map(doc => ({
                id: doc.name.split('/').pop(),
                fields: doc.fields,
                createTime: doc.createTime,
                updateTime: doc.updateTime
            }));
            console.log(documents);
            res.json(documents);
        } else {
            res.status(404).json({ message: 'No invoices found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error fetching invoices', error: error.message });
    }
});

router.get('/getAdvancedInvoice', async (req, res) => {
    try {
        const data = req.query;
        console.log('Received query:', data);
        const result = await interactWithFirestore('readAdvancedData', data);
        console.log('Result:', result);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error fetching invoices', error: error.message });
    }
});

router.post('/deleteInvoice', async (req, res) => {
    try {
        const data = req.body.id;
        if (!data) {
            return res.status(400).json({ message: 'Invoice id not provided' });
        }
        const firestoreData = await interactWithFirestore('deleteData', {documentId: data});
        res.json({ message: 'Invoice deleted successfully', result: firestoreData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting invoice', error: error.message });
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
//     E: "any string value",
//     invoicemap: {
//       "key1": "value1",
//       "key2": "value2",
//       "key3": "value3",
//       "key4": "value4",
//       "key5": "value5",
//     }
//   }
// };