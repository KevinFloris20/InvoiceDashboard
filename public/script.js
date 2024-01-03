document.addEventListener('DOMContentLoaded', function() {
    let formData;  // Store the fetched form data
    let fieldValues = {};  // Store current field values


    // Function to display messages
    function displayMessage(message, type) {
        const errorListUl = document.getElementById('errorListUl');
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.classList.add(type === 'error' ? 'error-message' : 'success-message');
        errorListUl.appendChild(messageElement);
    }

    // Function to submit form data
    async function submitFormData() {
        // Collect all input values from the form
        const inputs = document.querySelectorAll('#invoice-form .dynamic-input');
        const submitData = Array.from(inputs).reduce((data, input) => {
            data[input.name] = input.value;
            return data;
        }, {});

        // Post the data to the server
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

            console.log('Form submitted:', data);
            displayMessage(`Success: ${data.message} ${data.result}`, 'success');
            return data;
        } catch (error) {
            console.error('Error submitting form:', error);
            displayMessage(`Error: ${error.message}`, 'error');
        }
    }


    // Function to download the invoice
    async function downloadInvoice(invoiceData, resID) {
        var invoiceName = 'invoice.pdf'; // Default invoice name
        if (resID && resID.result) {
            var idMatch = resID.result.match(/\d+/); // Get the first sequence of digits
            if (idMatch) {
                var id = idMatch[0];
                invoiceName = 'invoice' + id + '.pdf';
            }
        }

        try {
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

    // Add click event listener for Save button
    document.getElementById('saveButton').addEventListener('click', function() {
        submitFormData();
    });

    // Function to collect form data
    function collectFormData() {
        const inputs = document.querySelectorAll('#invoice-form .dynamic-input');
        return Array.from(inputs).reduce((data, input) => {
            data[input.name] = input.value;
            return data;
        }, {});
    }

    // Add click event listener for Save&Download button
    document.getElementById('saveDownloadButton').addEventListener('click', async function() {
        const invoiceData = collectFormData();
        const resID = await submitFormData();
        
        // Check if resID is valid before calling downloadInvoice
        if (resID && resID.result) {
            await downloadInvoice(invoiceData, resID);
        } else {
            console.error('Error: Invalid response from submitFormData');
            displayMessage('Error: Invalid response from submitFormData', 'error');
        }
    });

    // Add click event listener for Save&Print button
    // document.getElementById('savePrintButton').addEventListener('click', function() {
    //     submitFormData().then(() => window.print());
    // });
    
    function clearFormFields() {
        const existingFields = document.querySelectorAll('#invoice-form .dynamic-input');
        existingFields.forEach(field => {
            // Save current field value before removing
            fieldValues[field.name] = field.value;
            field.remove();
        });
    }
    
    // Function to create and position form fields
    function createFormFields(fields, scaleFactor) {
        const form = document.getElementById('invoice-form');
        clearFormFields();
        const adjustmentFactor = 0.003; // Adjustment
    
        fields.forEach(field => {
            // Scaling positions and dimensions
            const scaledX = field.x * scaleFactor;
            const scaledY = field.y * scaleFactor - form.offsetHeight * adjustmentFactor;
            const scaledWidth = field.w * scaleFactor;
            const scaledHeight = field.h * scaleFactor;
    
            // Create a div to hold the input field
            const fieldDiv = document.createElement('div');
            fieldDiv.style.position = 'absolute';
            fieldDiv.style.left = `${scaledX}px`;
            fieldDiv.style.top = `${scaledY}px`;
            fieldDiv.style.width = `${scaledWidth}px`;
            fieldDiv.style.height = `${scaledHeight}px`;
    
            // Create the input field
            const input = document.createElement('input');
            input.classList.add('dynamic-input');
            input.type = 'text';
            input.name = field.id; // Use the field name from the PDF
            input.style.width = '100%';
            input.style.height = '100%';
            input.style.border = 'none'; // Optional: remove border
            input.style.padding = '0'; // Optional: remove padding
            input.style.margin = '0'; // Optional: remove margin
    
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
                // input.setAttribute('placeholder', 'MM/DD/YYYY');
                input.addEventListener('input', function(e) {
                    var value = e.target.value;
                    var cleanValue = value.replace(/[^\d]/g, ''); // Remove non-digits
                    var yearPart = '';
    
                    if (cleanValue.length > 4) {
                        yearPart = cleanValue.slice(4, 8);
                        cleanValue = cleanValue.slice(0, 4); // Ensure MMDD format
                    }
    
                    // Auto-insert slashes
                    if (cleanValue.length >= 2) {
                        cleanValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
                    }
    
                    if (yearPart) {
                        cleanValue += '/' + yearPart;
                    }
    
                    e.target.value = cleanValue;
                });
            }
    
            // Set font size based on the height of the field
            const fontSize = scaledHeight * 0.9; // Adjust the factor as needed
            input.style.fontSize = `${fontSize}px`;
    
            // Repopulate field values after creating new fields
            if (fieldValues[field.id] !== undefined) {
                input.value = fieldValues[field.id];
            }
    
            // Append the input to the div
            fieldDiv.appendChild(input);
    
            // Append the div to the form
            form.appendChild(fieldDiv);
        });
    }
    
    // Function to handle window resize
    function onResize() {
        const form = document.getElementById('invoice-form');
        const pngWidth = form.offsetWidth;
        const scaleFactor = pngWidth / formData.pdfWidth;
        createFormFields(formData.fields, scaleFactor);
    }
    
    // Fetch form data and create fields
    fetch('/formdata')
        .then(response => response.json())
        .then(data => {
            formData = data; // Store the data for use in resize event
            onResize(); // Create fields initially
        })
        .catch(error => console.error('Error fetching data:', error));
    
    // Add resize event listener
    window.addEventListener('resize', onResize);
    


    // this is the stuff for the menu
    document.getElementById('menuNewInv').addEventListener('click', function() {
        document.getElementById('newInv').style.display = '';
        document.getElementById('searchSection').style.display = 'none';
    });
    document.getElementById('menuSearch').addEventListener('click', function() {
        document.getElementById('newInv').style.display = 'none';
        document.getElementById('searchSection').style.display = '';
    });
    

    async function fetchAndDisplayInvoices() {
        try {
            const response = await fetch('/getInvoices');
            if (!response.ok) throw new Error('Failed to fetch invoices');
    
            const invoices = await response.json();
            console.log(invoices);  // Log to verify data structure
            renderInvoicesTable(invoices);
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    function renderInvoicesTable(invoices) {
        const tbody = document.getElementById('invoiceTable').querySelector('tbody');
        tbody.innerHTML = ''; // Clear existing rows
    
        // Sort the invoices by ID in descending order
        const sortedInvoices = Object.entries(invoices).sort((a, b) => {
            const idA = parseInt(a[0].replace('Invoice_ID_', ''));
            const idB = parseInt(b[0].replace('Invoice_ID_', ''));
            return idB - idA;
        });
    
        sortedInvoices.forEach(([key, value]) => {
            if (value.mapValue) {
                const rowData = value.mapValue.fields;
                const row = document.createElement('tr');
    
                // Extracting Invoice ID from the key
                const invoiceId = key.replace('Invoice_ID_', '');
                row.appendChild(createCell(invoiceId)); // Invoice ID
    
                // Invoice #
                const invoiceNumber = rowData['A'] ? rowData['A'].stringValue : 'null';
                row.appendChild(createCell(invoiceNumber)); // Invoice #
    
                // Invoice Date
                const invoiceDate = rowData['B'] ? rowData['B'].stringValue : 'null';
                row.appendChild(createCell(invoiceDate)); // Invoice Date
    
                // Client Name
                const clientName = rowData['C'] ? rowData['C'].stringValue : 'null';
                row.appendChild(createCell(clientName)); // Client Name
    
                // Client Address
                const clientAddress = rowData['D'] ? rowData['D'].stringValue : 'null';
                row.appendChild(createCell(clientAddress)); // Client Address
    
                // Total Charges
                let totalCharges = 0;
                if (rowData.invoicemap && rowData.invoicemap.mapValue.fields) {
                    totalCharges = Object.entries(rowData.invoicemap.mapValue.fields)
                        .filter(([mapKey, _]) => mapKey.endsWith('C'))
                        .reduce((total, [_, mapValue]) => total + parseFloat(mapValue.stringValue || 0), 0);
                }
                row.appendChild(createCell(totalCharges.toFixed(2) === '0.00' ? 'null' : totalCharges.toFixed(2))); // Total Charges
    
                // Created Invoice Date obcreationdate
                const creationDate = rowData['creationDate'] ? rowData['creationDate'].stringValue : 'null';
                row.appendChild(createCell(creationDate)); // Created Invoice Date

                // Create options cell
                const optionsCell = document.createElement('td');
                optionsCell.innerHTML = `
                    <div class="ui floating dropdown icon button">
                        <i class="options icon"></i>
                        <div class="menu">
                            <div class="item" onclick="viewInvoice('${key}')">View Invoice</div>
                            <div class="item" onclick="downloadInvoice('${key}')">Download Invoice</div>
                            <div class="item" onclick="printInvoice('${key}')">Print Invoice</div>
                            <div class="item" onclick="deleteInvoice('${key}')">Delete Invoice</div>
                        </div>
                    </div>
                `;

                // Append the options cell to the row
                row.appendChild(optionsCell);

                tbody.appendChild(row);
            }
        });
        initializeDropdowns()
    }
    function initializeDropdowns() {
        const dropdowns = document.querySelectorAll('.ui.dropdown');
    
        console.log("Initializing dropdowns", dropdowns.length); // Debugging
    
        dropdowns.forEach(dropdown => {
            console.log("Setting up a dropdown"); // Debugging
    
            dropdown.addEventListener('click', function(event) {
                event.stopPropagation();
                console.log("Dropdown clicked"); // Debugging
                this.classList.toggle('active');
                let menu = this.querySelector('.menu');
                if (menu) {
                    menu.classList.toggle('visible');
                }
            });
        });
    
        document.addEventListener('click', (event) => {
            console.log("Document clicked"); // Debugging
            dropdowns.forEach(dropdown => {
                if (!dropdown.contains(event.target)) {
                    console.log("Closing dropdown"); // Debugging
                    dropdown.classList.remove('active');
                    let menu = dropdown.querySelector('.menu');
                    if (menu) {
                        menu.classList.remove('visible');
                    }
                }
            });
        });
    }
    
    
    function createCell(text) {
        const cell = document.createElement('td');
        cell.textContent = text;
        return cell;
    }
    
    // Define the functions that will be called on click
    function viewInvoice(key) {
        console.log('Viewing invoice', key);
        // Implement the logic to view the invoice
    }

    function downloadInvoice(key) {
        console.log('Downloading invoice', key);
        // Implement the logic to download the invoice
    }

    function printInvoice(key) {
        console.log('Printing invoice', key);
        // Implement the logic to print the invoice
    }

    function deleteInvoice(key) {
        console.log('Deleting invoice', key);
        // Implement the logic to delete the invoice
    }
        
    
    
    
    
    
    
    // Call this function when the 'Search Invoices' tab is clicked
    document.getElementById('menuSearch').addEventListener('click', fetchAndDisplayInvoices);
    
    



    
});

