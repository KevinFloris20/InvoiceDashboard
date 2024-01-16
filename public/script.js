//for the onclick options menu on all of the rows (Search Invoices)
async function viewInvoice(invoiceData) {
    const blob = await fetchBlob(invoiceData);

    const blobUrl = URL.createObjectURL(blob);

    const pdfWindow = window.open(blobUrl);

    pdfWindow.onload = function() {
        try {
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Error viewing the PDF:', error);
        }
    };

}
async function printInvoice(invoiceData) {
    try {
        const blob = await fetchBlob(invoiceData);

        const blobUrl = URL.createObjectURL(blob);

        const pdfWindow = window.open(blobUrl);

        pdfWindow.onload = function() {
            try {
                pdfWindow.print();
                URL.revokeObjectURL(blobUrl);
            } catch (error) {
                console.error('Error printing the PDF:', error);
            }
        };
    } catch (error) {
        console.error('Error fetching or printing the invoice:', error);
    }
}

async function deleteInvoice(documentId) {
    const userConfirmed = confirm(`Are you sure you want to delete this invoice? ${documentId}`);
    if (!userConfirmed) {
        return; 
    }

    try {
        const response = await fetch('/deleteInvoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: documentId }) 
        });

        const data = await response.json(); 

        if (response.ok) {
            console.log('Invoice deleted successfully:', data);
            displayMessage(`Invoice deleted successfully`, 'success');
            document.querySelector(`#invoice-row-${documentId}`).remove();
        } else {
            throw new Error(data.message || 'Unknown error occurred while deleting invoice');
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        displayMessage(`Error deleting invoice: ${error.message}`, 'error');
    }
}

async function fetchBlob(invoiceData){
    const response = await fetch('/download-invoice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
    });

    if (!response.ok) {
        throw new Error(`Error downloading invoice: ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log(`Blob Type: ${blob.type}, Blob Size: ${blob.size}`);
    if (blob.type !== 'application/pdf' || blob.size === 0) {
        throw new Error('Received invalid PDF data');
    }
    return blob;
}

async function downloadInvoice(invoiceData, resID, invoiceNum) {
    var invoiceName = 'invoice.pdf'; 
    if (resID) {
        invoiceName = 'invoice' + invoiceNum + '.pdf';
    }

    try {
        const blob = await fetchBlob(invoiceData);

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = invoiceName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading invoice:', error);
        displayMessage(`Error: ${error.message}`, 'error');
    }
}



//other helper logic

function createCell(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
}
function collectFormData() {
    const inputs = document.querySelectorAll('#invoice-form .dynamic-input');
    return Array.from(inputs).reduce((data, input) => {
        data[input.name] = input.value;
        return data;
    }, {});
}
function displayMessage(message, type) {
    const errorListUl = document.getElementById('errorListUl');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.classList.add(type === 'error' ? 'error-message' : 'success-message');
    errorListUl.appendChild(messageElement);
}
function flattenServerRes(serverResponse) {
    let flattenedResponse = {};
    for (const [key, valueObj] of Object.entries(serverResponse.fields)) {
        flattenedResponse[key] = valueObj.stringValue;
    }
    for (const [key, valueObj] of Object.entries(serverResponse.fields.invoiceDetails.mapValue.fields)) {
        flattenedResponse[key] = valueObj.stringValue;
    }
    return flattenedResponse;
}
function calculateTotalPrice(invoiceDetails) {
    let total = 0;
    let excludeKeys = new Set(); 

    Object.entries(invoiceDetails.fields).forEach(([key, value]) => {
        if (key.endsWith('B') && value.stringValue.toLowerCase().includes('total')) {
            const num = key.match(/(\d+)B$/)[1]; 
            excludeKeys.add(num + 'C'); 
        }
    });

    Object.entries(invoiceDetails.fields).forEach(([key, value]) => {
        if (key.endsWith('C') && !excludeKeys.has(key) && key !== 'C') {
            total += parseFloat(value.stringValue) || 0;
        }
    });

    return total;
}
function emptyFormFields() {
    const inputs = document.querySelectorAll('#invoice-form .dynamic-input');
    inputs.forEach(input => input.value = '');
}



document.addEventListener('DOMContentLoaded', function() {
    //this is the stuff for the header menu
    document.getElementById('menuNewInv').addEventListener('click', function() {
        document.getElementById('newInv').style.display = '';
        document.getElementById('searchSection').style.display = 'none';
    });
    document.getElementById('menuSearch').addEventListener('click', function() {
        document.getElementById('newInv').style.display = 'none';
        document.getElementById('searchSection').style.display = '';
    });



    //save button (Make New Invoice)
    async function submitFormData() {
        const submitData = collectFormData()
        try {
            const response = await fetch('/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submitData)
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Unknown error');
            }

            console.log('Form submitted:', data, submitData);
            displayMessage(`Success: ${data.message}. New ID:${data.result}`, 'success');

            return [data,submitData.A];
        } catch (error) {
            console.error('Error submitting form:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    }
    document.getElementById('saveButton').addEventListener('click', async function() {
        const res = submitFormData()
        if (res && res.result) {
            emptyFormFields();
        }
    });

    //save and download button (Make New Invoice)
    document.getElementById('saveDownloadButton').addEventListener('click', async function() {
        const invoiceData = collectFormData();
        const [res, invName] = await submitFormData();
        if (res && res.result) {
            await downloadInvoice(invoiceData, res, invName).then(emptyFormFields());
        } else {
            console.error('Error: Invalid response from submitFormData');
            displayMessage('Error: Invalid response from submitFormData', 'error');
        }
    });
    
    //add the text boxes overlaying the client png (Make New Invoice)
    let formData;
    let fieldValues = {}; 
    function clearFormFields() {
        const existingFields = document.querySelectorAll('#invoice-form .dynamic-input');
        existingFields.forEach(field => {
            fieldValues[field.name] = field.value;
            field.remove();
        });
    }
    function createFormFields(fields, scaleFactor) {
        const form = document.getElementById('invoice-form');
        clearFormFields();
        const adjustmentFactor = 0.003; 
    
        fields.forEach(field => {
            const scaledX = field.x * scaleFactor;
            const scaledY = field.y * scaleFactor - form.offsetHeight * adjustmentFactor;
            const scaledWidth = field.w * scaleFactor;
            const scaledHeight = field.h * scaleFactor;
    
            const fieldDiv = document.createElement('div');
            fieldDiv.style.position = 'absolute';
            fieldDiv.style.left = `${scaledX}px`;
            fieldDiv.style.top = `${scaledY}px`;
            fieldDiv.style.width = `${scaledWidth}px`;
            fieldDiv.style.height = `${scaledHeight}px`;
    
            const input = document.createElement('input');
            input.classList.add('dynamic-input');
            input.type = 'text';
            input.name = field.id; 
            input.style.width = '100%';
            input.style.height = '100%';
            input.style.border = 'none'; 
            input.style.padding = '0'; 
            input.style.margin = '0'; 
    
            if((String(field.id) != 'A') && (String(field.id).includes('A'))){
                input.style.textAlign = 'center';
            }
            if((String(field.id) != 'C') && (String(field.id).includes('C'))){
                input.style.textAlign = 'right';
            }
            if(String(field.id) == 'C'){
                input.style.textAlign = 'center';
            }
            if(String(field.id) == 'D'){
                input.style.textAlign = 'center';
            }

            if (field.id === 'B') { 
                input.addEventListener('input', function(e) {
                    var value = e.target.value;
                    var cleanValue = value.replace(/[^\d]/g, '');
                    var yearPart = '';
    
                    if (cleanValue.length > 4) {
                        yearPart = cleanValue.slice(4, 8);
                        cleanValue = cleanValue.slice(0, 4); 
                    }
    
                    if (cleanValue.length >= 2) {
                        cleanValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
                    }
    
                    if (yearPart) {
                        cleanValue += '/' + yearPart;
                    }
    
                    e.target.value = cleanValue;
                });
            }
    
            const fontSize = scaledHeight * 0.9; 
            input.style.fontSize = `${fontSize}px`;
    
            if (fieldValues[field.id] !== undefined) {
                input.value = fieldValues[field.id];
            }
    
            fieldDiv.appendChild(input);
    
            form.appendChild(fieldDiv);
        });
    }
    function reloadFields() {
        const form = document.getElementById('invoice-form');
        const pngWidth = form.offsetWidth;
        const scaleFactor = pngWidth / formData.pdfWidth;
        createFormFields(formData.fields, scaleFactor);
    }
    fetch('/formdata')
        .then(response => response.json())
        .then(data => {
            formData = data; 
            reloadFields();
        })
        .catch(error => console.error('Error fetching data:', error));
    
    window.addEventListener('resize', reloadFields);

    //auto fill textbox (Make New Invoice)


    




    //show initial interactive table of invoices (Search Invoices)
    async function fetchAndDisplayInvoices() {
        try {
            const response = await fetch('/getInvoices');
            if (!response.ok) throw new Error('Failed to fetch invoices');
            const invoices = await response.json();
            renderInvoicesTable(invoices);
        } catch (error) {
            console.error('Error:', error);
        }
    }
    document.getElementById('menuSearch').addEventListener('click', fetchAndDisplayInvoices);
    function renderInvoicesTable(invoices) {
        const tbody = document.getElementById('invoiceTable').querySelector('tbody');
        tbody.innerHTML = ''; 
        invoices.forEach(invoice => {
            const downloadPDFdata = JSON.stringify(flattenServerRes(invoice));

            const row = document.createElement('tr');
            row.id = `invoice-row-${invoice.id}`;
    
            const invoiceId = invoice.id;
            row.appendChild(createCell(invoiceId)); 
            
            const invoiceNumber = invoice.fields['A'] ? invoice.fields['A'].stringValue : 'null';
            row.appendChild(createCell(invoiceNumber)); // Invoice #
            
            const invoiceDate = invoice.fields['B'] ? invoice.fields['B'].stringValue : 'null';
            row.appendChild(createCell(invoiceDate)); // Invoice Date
            
            const clientName = invoice.fields['C'] ? invoice.fields['C'].stringValue : 'null';
            row.appendChild(createCell(clientName)); // Client Name
            
            const clientAddress = invoice.fields['D'] ? invoice.fields['D'].stringValue : 'null';
            row.appendChild(createCell(clientAddress)); // Client Address
            
            const totalCharges = calculateTotalPrice(invoice.fields.invoiceDetails.mapValue);
            row.appendChild(createCell(totalCharges.toFixed(2))); // Total Charges
            
            const creationDate = invoice.fields.creationDate ? new Date(invoice.fields.creationDate.timestampValue).toLocaleString() : 'null';
            row.appendChild(createCell(creationDate)); // Created Invoice Date
    
            const optionsCell = document.createElement('td');
            optionsCell.innerHTML = `
                <div class="ui floating dropdown icon button">
                    <i class="dropdown icon"></i>
                    <div class="menu" pdfData='${downloadPDFdata}'>
                        <div class="item itemOptions" id="${invoiceId}" attr="viewInvoice">View Invoice</div>
                        <div class="item itemOptions" id="${invoiceId}" invnum='${invoice.fields.A.stringValue}' attr="downloadInvoice">Download Invoice</div>
                        <div class="item itemOptions" id="${invoiceId}" attr="printInvoice">Print Invoice</div>
                        <div class="item itemOptions" id="${invoiceId}" attr="delInvoice">Delete Invoice</div>
                    </div>
                </div>
            `;
            row.appendChild(optionsCell); 
            tbody.appendChild(row); 
        });
    
        initializeDropdowns();
    }
    function initializeDropdowns() {
        const dropdowns = document.querySelectorAll('.ui.dropdown');
    
        dropdowns.forEach(dropdown => {
            const menu = dropdown.querySelector('.menu');
            dropdown.addEventListener('click', function(event) {
                event.stopPropagation();
                dropdown.classList.toggle('active');
                if (menu) {
                    menu.classList.toggle('visible');
                }
            });
        });
    
        document.addEventListener('click', (event) => {
            dropdowns.forEach(dropdown => {
                if (!dropdown.contains(event.target)) {
                    const menu = dropdown.querySelector('.menu');
                    dropdown.classList.remove('active');
                    if (menu) {
                        menu.classList.remove('visible');
                    }
                }
            });
        });

        const optionsMenu = document.querySelectorAll('.itemOptions');
        optionsMenu.forEach(opp => {
            opp.addEventListener('click', (event) => {
                const data = JSON.parse(opp.parentElement.getAttribute('pdfData'));
                if (opp.getAttribute('attr') === 'viewInvoice') {
                    viewInvoice(data);
                } else if (opp.getAttribute('attr') === 'downloadInvoice') {
                    const name = opp.getAttribute("invnum").toString();
                    downloadInvoice(data, opp.id, name);
                } else if (opp.getAttribute('attr') === 'printInvoice') {
                    printInvoice(data, opp.id);
                } else if (opp.getAttribute('attr') === 'delInvoice') {
                    deleteInvoice(opp.id);
                }
            }
        )});

    }

    //submit num of most recent amt of invoices (Search Invoices)

    //dropdown filters for the columns (Search Invoices)

    //search bar (Search Invoices)
        
    
    
    
    
});

