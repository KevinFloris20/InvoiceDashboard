//routes
const express = require('express');
const router = express.Router();

//get the pdfdata
const { extractFormFields } = require('./extractPDFData');
router.get('/formdata', async (req, res) => {
    try {
        const pdfPath = 'FCRInvoiceTemplateNull.pdf';
        const fieldData = await extractFormFields(pdfPath);
        res.json(fieldData);
    } catch (error) {
        res.status(500).send('Error processing PDF');
    }
});

//export
module.exports = router;
