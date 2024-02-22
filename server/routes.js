//routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');


//server the public dir files
///////////////////////////////////////
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() || true) {
        return next();
    }
    res.redirect('/login');
};
function isAuthenticatedAjax(req, res, next) {
    if (req.isAuthenticated() || true) {
        return next();
    }
    res.status(401).json({ error: 'User not authenticated' });
}

// Serve the login page. It should be accessible without authentication.
router.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '..', 'public/login.html'));
});

// Serve the main page after authentication
router.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/index.html'));
});

// Serve static files after authentication
router.get('/style.css', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/style.css'));
});

router.get('/script.js', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/script.js'));
});

router.get('/backgroundImg.png', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/backgroundImg.png'));
});

router.get('/FCRInvoiceTemplate.png', isAuthenticated, (req, res) => {
    const imagePath = path.join(__dirname, '../FCRInvoiceTemplate.png');
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).send('Image not found');
    }
});
///////////////////////////////////////




//get the pdfdata
const { extractFormFields } = require('./models/PDFDataApp.js');
router.get('/formdata', isAuthenticatedAjax, async (req, res) => {
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

router.post('/submit-form', isAuthenticatedAjax, async (req, res) => {
    try {
        const submitData = req.body;
        console.log(submitData)
        const validatedData = validateAndTransform(submitData);
        const result = await interactWithFirestore('writeData', validatedData);
        res.json({ message: 'Invoice submitted successfully', result: result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/download-invoice', isAuthenticatedAjax, async (req, res) => {
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

router.get('/getInvoices', isAuthenticatedAjax, async (req, res) => {
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
            res.json(documents);
        } else {
            res.status(404).json({ message: 'No invoices found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error fetching invoices', error: error.message });
    }
});

router.get('/getAdvancedInvoice', isAuthenticatedAjax, async (req, res) => {
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

router.post('/deleteInvoice', isAuthenticatedAjax, async (req, res) => {
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

router.post('/updateInvoice', isAuthenticatedAjax, async (req, res) => {
    try {
        const updatedData = req.body;
        const documentId = updatedData.docID;
        delete updatedData.docID;
        if (!documentId) {
            throw new Error("Document ID is required for updating data.");
        }
        const validatedData = validateAndTransform(updatedData);
        const result = await interactWithFirestore('updateData', {
            documentId: documentId,
            updateFields: validatedData
        });
        res.json({ message: 'Invoice updated successfully', result: result });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(400).json({ error: error.message });
    }
});

router.get('/newClient', isAuthenticatedAjax, async (req, res) => {
    try {
        // const result = await interactWithFirestore('newClient', {});
        console.log('New client:', req);
        res.json({ message: 'New client created successfully'});
    } catch (error) {
        console.error('Error creating new client:', error);
        res.status(400).json({ error: error.message });
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