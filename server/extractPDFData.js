const fs = require('fs');
const PDFParser = require('pdf2json');

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

module.exports = { extractFormFields };


