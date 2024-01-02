const fs = require('fs');
const PDFParser = require('pdf2json');
const { PDFDocument } = require('pdf-lib');

function extractFormFields(pdfPath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataError', err => reject(err.parserError));
        pdfParser.on('pdfParser_dataReady', pdfData => {
            const fields = [];
            pdfWidth = pdfData.Pages[0].Width;
            pdfData.Pages.forEach(page => {
                if (page.Fields && page.Fields.length > 0) {
                    page.Fields.forEach(field => {
                        fields.push({
                            x: field.x,
                            y: field.y,
                            w: field.w,
                            h: field.h,
                            T: field.T ? field.T.Name : "",  
                            id: field.id ? field.id.Id : ""
                        });
                    });
                }
            });
            resolve({fields, pdfWidth});
        });

        pdfParser.loadPDF(pdfPath);
    });
}

async function newInvoicePDF(data, pdfPath) {
    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const form = pdfDoc.getForm();

    // Fill each field with data
    for (let key in data) {
        const formField = form.getField(key);
        if (formField) {
            formField.setText(data[key]);
        }
    }

    form.flatten(); // This makes the form fields no longer editable

    const pdfBytes = await pdfDoc.save();
    return pdfBytes; // Returns a buffer
}

module.exports = { extractFormFields, newInvoicePDF};


