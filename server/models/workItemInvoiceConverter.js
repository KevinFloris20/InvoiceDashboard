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
const { interactWithFirestore } = require('./firestoreApp');
const { getClients, getWorkItemById } = require('./mySqlApp');
const { extractFormFields, validateAndTransform } = require('./PDFDataApp');
async function workItemToInvoiceConverter(data) {
    try{
        let finalInvoice = {};
        const clientId = data.work_item_client_ID;

        //get all the things needed to create the invoice
        const info = await extractFormFields('FCRInvoiceTemplateNull.pdf');
        const clientDetailsRes = await getClients(clientId);
        const clientDetails = clientDetailsRes[0];
        let workItems = [];
        for (const id of data.work_item_IDs) {
            const workItem = await getWorkItemById(id);
            workItems.push(workItem[0]);
        }

        //light validation
        if (!workItems.length) throw new Error("Error: Work items do not exist.");
        if (!clientDetails) throw new Error("Error: Client does not exist.");
        for (const item of workItems) {
            if (parseInt(item.client_id) !== parseInt(clientId)) throw new Error("Error: Work item client id's do not match the client ID submitted.");
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

        //add the work items to the invoice object
        let totalPrice = 0;
        workItems.forEach((item, index) => {
            const descriptionPrice = JSON.parse(item.description_price);
            Object.entries(descriptionPrice).forEach(([key, descPrice]) => {
                finalInvoice[`${index + 2}A`] = descPrice.A;
                finalInvoice[`${index + 2}B`] = descPrice.B;
                finalInvoice[`${index + 2}C`] = parseFloat(descPrice.C).toFixed(2);
                totalPrice += parseFloat(descPrice.C);
            });
        });

        // Add the total price to the invoice object
        const lineCount = workItems.length + 1;
        finalInvoice[`${lineCount}C`] = "---------------------";
        finalInvoice[`${lineCount + 1}B`] = '                                                                                                Total $ ';
        finalInvoice[`${lineCount + 1}C`] = totalPrice;

        console.log(finalInvoice);

        //submit the invoice object to firestore validation
        // const transInvoice = validateAndTransform(finalInvoice)

        //submit the invoice object to firestoreApp.js to be stored in the firestore database
        // const invoiceId = await interactWithFirestore('writeData', transInvoice);

        // return :3
        return 0;

    }catch(error){
        console.log('Error converting work items to invoice:', error);
        throw error;
    }
}


module.exports = { workItemToInvoiceConverter };
