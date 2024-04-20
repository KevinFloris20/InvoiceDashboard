/*
This file will be used to turn all of the work items into invoices.

User will submit a list of work Items, a date, and an invoice #

We will validate the work items by:
checking if the work item clients are all the same
checking if the clients exist
checking if the work items exist
checking for all the required fields, array of 'workItemIds' and 'invoiceDate' and 'invoiceNumber'
checking if everything is a string and date in proper format and converting to a proper format such as int and iso date
checking if the work items dont exceed the pdf line limit

We will then convert the work items into an invoice by:
getting all the work items and their details from mySqlApp.js
then client details via their id from mySqlApp.js
then we will create a invoice object with the invoice number, date, client details, and work items
each work item must be seperated by a line break, the first row and last two rows will be the header and footer of the invoice
after the last work item is inserted into the object, calculate the total price of all the work items
and on the next free line (regardless of footer) add "---------------------" in column C (price column)
then on the following free line add '                                                                                                Total $' (with this spacing)
Then take this invoice object and submit it to firestore validation and then firestoreApp.js to be stored in the firestore database

work item to invoice data format:
let newData = {
    work_item_IDs: null,
    work_item_client_ID: null,
    invoice_date: null,
    invoice_number: null
};

extractFormFields data format:
{
    fields: [
        {
            x: 0,
            y: 0,
            w: 0,
            h: 0,
            T: 'string',
            id: 'string' // use this to make the invoice obj keys
        }
    ],
}

acceptable invoice object format for input into validation:
{
    'A': 'Invoice #',
    'B': 'invoice date (mm/dd/yy)',
    'C': 'Client Name',
    'D': 'Client Address',
    'E': 'Client Email',
    '1A': 'Equipment ID',
    '1B': 'Description',
    '1C': 'Price'
    '2A': ' ',
    '2B': ' ',
    '2C': ' ',
    '3A': 'equipment id',
    '3B': 'description',
    '3C': 'price'//... and so on untill the last key option
}
*/
const e = require('express');
const { interactWithFirestore } = require('./firestoreApp');
const { getClients, getWorkItemById, addInvoiceAndUpdateWorkItems } = require('./mySqlApp');
const { extractFormFields } = require('./PDFDataApp');
const { validateAndTransform } = require('./validation');
async function workItemToInvoiceConverter(data) {
    try{
        let finalInvoice = {};
        const seperator = "---------------------"
        const totalText = '                                                                                                Total $ ';
        const clientId = data.work_item_client_ID;

        //get all the things needed to create the invoice
        const formFields = await extractFormFields('FCRInvoiceTemplateNull.pdf');
        console.log(formFields)
        const clientDetailsRes = await getClients(clientId);
        const clientDetails = clientDetailsRes[0];
        let workItems = [];
        for (const id of data.work_item_IDs) {
            const workItem = await getWorkItemById(id);
            workItems.push(workItem[0]);
        }
        const rowIds = formFields.fields.filter(field => /^[0-9]+[ABC]$/.test(field.id)).map(field => parseInt(field.id.match(/^[0-9]+/)[0]));
        const maxRows = Math.max(...rowIds);

        //light validation
        let errorMessages = [];
        if (!workItems.length) errorMessages.push("Error: Work items do not exist.");
        if (!clientDetails) errorMessages.push("Error: Client does not exist.");
        for (const item of workItems) {
            if (parseInt(item.client_id) !== parseInt(clientId)) errorMessages.push("Error: Work item client id's do not match the client ID submitted.");
        }
        
        //create the invoice object
        finalInvoice = {
            'A': data.invoice_number,
            'B': data.invoice_date,
            'C': clientDetails.client_name,
            'D': clientDetails.client_address,
            'E': clientDetails.email,
            '1A': '',
            '1B': '',
            '1C': ''
        };

        let totalPrice = 0;
        let currentRowIndex = 1;
        workItems.forEach(item => {
            currentRowIndex++;
            const descriptionPrice = JSON.parse(item.description_price);
            Object.entries(descriptionPrice).forEach(([rowNum, descPrice]) => {
                finalInvoice[`${currentRowIndex}A`] = descPrice.A;
                finalInvoice[`${currentRowIndex}B`] = descPrice.B;
                let priceValue = parseFloat(descPrice.C);
                if (!isNaN(priceValue)) {
                    finalInvoice[`${currentRowIndex}C`] = priceValue.toFixed(2);
                    totalPrice += priceValue; 
                } else {
                    finalInvoice[`${currentRowIndex}C`] = '';
                }
                currentRowIndex++;
            });
        });

        //add the total price to the invoice object
        finalInvoice[`${currentRowIndex}C`] = seperator;
        finalInvoice[`${currentRowIndex + 1}B`] = totalText;
        finalInvoice[`${currentRowIndex + 1}C`] = totalPrice.toFixed(2);

        //get the largest row number in finalInvoice
        const finalRowIds = Object.keys(finalInvoice).filter(key => /^[0-9]+[ABC]$/.test(key)).map(key => parseInt(key.match(/^[0-9]+/)[0]));
        const finalMaxRows = Math.max(...finalRowIds);

        //check if the work items exceed the invoice line limit
        if (finalMaxRows > maxRows) {
            errorMessages.push(`Error: The work items exceed the Invoice line limit. Total lines: ${maxRows}, Requested lines: ${finalMaxRows}`);
        }

        console.log(finalInvoice);

        let invoiceId = null;
        //check if there are any errors before going ahead with the rest of the invoice creation
        if (!errorMessages.length) {
            try{
                // submit the invoice object to firestore validation
                const transInvoice = validateAndTransform(finalInvoice)

                // submit the invoice object to firestoreApp.js to be stored in the firestore database
                invoiceId = await interactWithFirestore('writeData', transInvoice);

                //send the invoice id to mySqlApp.js to update the work items


            }catch(error){
                console.log(error);
                errorMessages.push(error.message);
            }
        }



        //send the invoice id to mySqlApp.js to update the work items
        // CREATE PROCEDURE InsertInvoiceAndUpdateWorkItems(
        //     IN p_externalUniqueId VARCHAR(255),
        //     IN p_regularString VARCHAR(255),
        //     IN p_invoiceDate DATE,
        //     IN p_creationDate DATETIME,
        //     IN p_total DECIMAL(10,2),
        //     IN p_clientName VARCHAR(255),
        //     IN p_workItemIds TEXT
        // )
        //turn finalInvoice into a string for sql.
        // await addInvoiceAndUpdateWorkItems(invoiceId, JSON.stringify(finalInvoice), transInvoice['B'].timestampValue, new Date(),totalPrice.toFixed(2), clientDetails.client_name, data.work_item_IDs);

        // return :3
        return {errorMessages, invoiceId};

    }catch(error){
        console.log('Error converting work items to invoice:', error);
        throw error;
    }
}


module.exports = { workItemToInvoiceConverter };
