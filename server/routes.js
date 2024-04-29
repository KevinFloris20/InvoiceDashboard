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
router.use(isAuthenticated, express.static(path.join(__dirname, '..', 'public/other')));

router.get('/style.css', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/style.css'));
});

router.get('/script.js', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/script.js'));
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

const { validateAndTransform, validateWorkItem, validateWITI, valSearchQuery, validateInvoiceSearchQuery, validateAWIquery, valAndTransformInvoiceQuery } = require('./models/validation.js');

const { newInvoicePDF } = require('./models/PDFDataApp.js');

const { getClients, addClients, addWorkItem, getTables, getTableData, getAllWorkItems, displayWorkItems, deleteWorkItem, updateWorkItem, displayAdvancedWorkItems } = require('./models/mySqlApp.js');

const { workItemToInvoiceConverter } = require('./models/workItemInvoiceConverter.js');

router.get('/newClient', isAuthenticatedAjax, async (req, res) => {
    try {
        const { clientName, clientAddress, clientEmail } = req.query;
        if (!clientName) {
            return res.status(400).json({ error: 'Missing required client name' });
        }
        const result = await addClients(clientName, clientAddress, clientEmail );
        res.json({ message: 'New client added successfully', client_id: result.insertId });
    } catch (error) {
        console.error('Error creating new client:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/getClients', isAuthenticatedAjax, async (req, res) => {
    try {
        const clients = await getClients();
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/getInvoice', isAuthenticatedAjax, async (req, res) => {
    try {
        const data = req.query;
        const { isValid, errors, cleanedSearchQuery } = valAndTransformInvoiceQuery(data);
        if (!isValid) {
            return res.status(400).json({ error: errors });
        }
        const firestoreData = await interactWithFirestore('getInvoice', cleanedSearchQuery);
        res.json(firestoreData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching invoice', error: error.message });
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
        const { isValid, errors, cleanedSearchQuery } = validateInvoiceSearchQuery(data);
        if (!isValid) {
            return res.status(400).json({ error: errors });
        }
        console.log(cleanedSearchQuery);
        const firestoreData = await interactWithFirestore('readAdvancedData',cleanedSearchQuery);
        res.json(firestoreData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching invoices', error: error.message });
    }
});

router.get('/getWorkItem', isAuthenticatedAjax, async (req, res) => {
    try{
        const data = req.query;
        const { isValid, errors, cleanedSearchQuery } = validateAWIquery(data);
        if (!isValid) {
            return res.status(400).json({ error: errors });
        }
        console.log("Received query: ",cleanedSearchQuery);
        const result = await displayAdvancedWorkItems(cleanedSearchQuery);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching work items', error: error.message });
    }
});

router.get('/displayWorkItems', isAuthenticatedAjax, async (req, res) => {
    try {
        const result = await displayWorkItems(100);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error fetching work items', error: error.message });
    }
});

router.get('/getAdvancedWorkItems', isAuthenticatedAjax, async (req, res) => {
    try {
        const data = req.query;
        const { isValid, errors, cleanedSearchQuery } = valSearchQuery(data);
        if (!isValid) {
            return res.status(400).json({ error: errors });
        }
        console.log('Received query:',cleanedSearchQuery);
        const result = await displayAdvancedWorkItems(cleanedSearchQuery);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching work items', error: error.message });
    }
});

//this is for the image gallery of when a unit id is typed
// router.get('/getPictureIds', isAuthenticatedAjax, async (req, res) => {
//     try {
//         const data = req.query;
//         const result = {
//             ernbdsimakow: {
//                 folderName: 'unitId1',
//                 pictureIds: ['1eee23', '4511s6', 'ee37891a']
//             },
//             z0e112rnbdqqscakow: {
//                 folderName: 'unitId2',
//                 pictureIds: ['q1e23', 'v14511s6', 'ee37o91a']
//             },
//             njmkifrhycbdu: {
//                 folderName: 'unitId3',
//                 pictureIds: ['1iiiii23', '101s6', 'ee343a']
//             },
//         }
//         res.json(result);
//     } catch (error) {
//         console.error(error);
//         res.status(400).json({ message: 'Error fetching picture ids', error: error.message });
//     }
// });

router.post('/submit-form', isAuthenticatedAjax, async (req, res) => {
    try {
        const submitData = req.body;
        console.log(submitData);
        const validation = validateAndTransform(submitData);

        if (!validation.isValid) {
            return res.status(400).json({ errors: validation.errors });
        }

        const result = await interactWithFirestore('writeData', validation.data);
        res.json({ message: 'Invoice submitted successfully', result: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
            return res.status(400).json({ error: "Document ID is required for updating data." });
        }

        const validation = validateAndTransform(updatedData);
        if (!validation.isValid) {
            return res.status(400).json({ errors: validation.errors });
        }

        const result = await interactWithFirestore('updateData', {
            documentId: documentId,
            updateFields: validation.data
        });

        res.json({ message: 'Invoice updated successfully', result: result });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

router.post('/addWorkItem', isAuthenticatedAjax, async (req, res) => {
    try {
        const allClients = await getClients()
        const { isValid, errors, data } = validateWorkItem(req.body, allClients);
        if (!isValid) {
            return res.status(400).json({ error: errors });
        }
        try {
            console.log(data)
            await addWorkItem(data.clientsName, data.unitNum, data.description, data.workDate);
            res.json({ message: 'Work item added successfully' });
        } catch (error) {
            console.error('Error adding work item:', error);
            res.status(500).json({ error: error.message });
        }
    } catch (error) {
        console.error('Error in adding work item:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/deleteWorkItem', isAuthenticatedAjax, async (req, res) => {
    try {
        const data = req.body.id;
        if (!data) {
            return res.status(400).json({ message: 'Work item id not provided' });
        }
        const result = await deleteWorkItem(data);
        res.json({ message: 'Work item deleted successfully', result: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting work item', error: error.message });
    }
});

router.post('/updateWorkItem', isAuthenticatedAjax, async (req, res) => {
    try {
        const allClients = await getClients();
        console.log(req.body)
        const { isValid, errors, data } = validateWorkItem(req.body, allClients);
        if (!isValid) {
            return res.status(400).json({ error: errors });
        }
        try {
            await updateWorkItem(data.workItemId, data.description, data.workDate);
            res.json({ message: 'Work item updated successfully' });
        } catch (error) {
            console.error('Error updating work item:', error);
            res.status(500).json({ error: error.message });
        }
    } catch (error){
        console.error(error);
        res.status(500).json({ message: 'Error updating work item', error: error.message });
    }
});

router.post('/submitInvoiceWorkItems', isAuthenticatedAjax, async (req, res) => {
    try{
        console.log(req.body);

        // Validate what the client sent us
        const { isValid, errors, cleanedworkItemToInvoiceConverterData } = await validateWITI(req.body);
        if (!isValid) {
            return res.status(400).json({ message: errors });
        }

        console.log(cleanedworkItemToInvoiceConverterData);

        //Then submit this into the work item converter
        const {errorMessages, invoiceId} = await workItemToInvoiceConverter(cleanedworkItemToInvoiceConverterData);
        if (errorMessages.length) {
            return res.status(400).json({ message: errorMessages });
        }

        res.json({ message: 'Work items submitted successfully', invoiceId: invoiceId});
    }catch(error){
        console.error(error.message);
        res.status(400).json({ message: 'Error submitting invoice ', error: error.message });
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