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
    function calculateTotalPrice(invoiceDetails) {
        let total = 0;
        let excludeKeys = new Set(); // To store keys that should be excluded from the total
    
        // First pass to find any 'total' in 'B' keys
        Object.entries(invoiceDetails.fields).forEach(([key, value]) => {
            if (key.endsWith('B') && value.stringValue.toLowerCase().includes('total')) {
                const num = key.match(/(\d+)B$/)[1]; // Extract the number before 'B'
                excludeKeys.add(num + 'C'); // Add the corresponding 'C' key to the exclude list
            }
        });
    
        // Second pass to calculate the total of 'C' values
        Object.entries(invoiceDetails.fields).forEach(([key, value]) => {
            if (key.endsWith('C') && !excludeKeys.has(key) && key !== 'C') {
                total += parseFloat(value.stringValue) || 0;
            }
        });
    
        return total;
    }
    
    function renderInvoicesTable(invoices) {
        const tbody = document.getElementById('invoiceTable').querySelector('tbody');
        tbody.innerHTML = ''; // Clear existing rows
    
        invoices.forEach(invoice => {
            const row = document.createElement('tr');
    
            // Extracting Invoice ID from the invoice object
            const invoiceId = invoice.id;
            row.appendChild(createCell(invoiceId)); // Invoice ID
            
            // Invoice fields
            const invoiceNumber = invoice.fields['A'] ? invoice.fields['A'].stringValue : 'null';
            row.appendChild(createCell(invoiceNumber)); // Invoice #
            
            const invoiceDate = invoice.fields['B'] ? invoice.fields['B'].stringValue : 'null';
            row.appendChild(createCell(invoiceDate)); // Invoice Date
            
            const clientName = invoice.fields['C'] ? invoice.fields['C'].stringValue : 'null';
            row.appendChild(createCell(clientName)); // Client Name
            
            const clientAddress = invoice.fields['D'] ? invoice.fields['D'].stringValue : 'null';
            row.appendChild(createCell(clientAddress)); // Client Address
            
            // Calculate total charges
            const totalCharges = calculateTotalPrice(invoice.fields.invoiceDetails.mapValue);
            row.appendChild(createCell(totalCharges.toFixed(2))); // Total Charges
            
            // Created Invoice Date
            const creationDate = invoice.fields.creationDate ? new Date(invoice.fields.creationDate.timestampValue).toLocaleString() : 'null';
            row.appendChild(createCell(creationDate)); // Created Invoice Date
    
            // Create options cell with dropdown menu
            const optionsCell = document.createElement('td');
            optionsCell.innerHTML = `
                <div class="ui floating dropdown icon button">
                    <i class="dropdown icon"></i>
                    <div class="menu">
                        <div class="item" onclick="viewInvoice('${invoiceId}')">View Invoice</div>
                        <div class="item" onclick="downloadInvoice('${invoiceId}')">Download Invoice</div>
                        <div class="item" onclick="printInvoice('${invoiceId}')">Print Invoice</div>
                        <div class="item" onclick="deleteInvoice('${invoiceId}')">Delete Invoice</div>
                    </div>
                </div>
            `;
            row.appendChild(optionsCell); // Append the options cell to the row
    
            tbody.appendChild(row); // Append the row to the table body
        });
    
        // After adding all rows, initialize the dropdowns
        initializeDropdowns();
    }
    
    function createCell(text) {
        const cell = document.createElement('td');
        cell.textContent = text;
        return cell;
    }
    
    function calculateTotalPrice(invoiceDetails) {
        let total = 0;
        let excludeKeys = new Set();
    
        // First pass to find 'total' indicators and mark corresponding 'C' keys for exclusion
        Object.entries(invoiceDetails.fields).forEach(([key, value]) => {
            if (key.endsWith('B') && value.stringValue.toLowerCase().includes('total')) {
                const num = key.match(/(\d+)B$/)[1];
                excludeKeys.add(num + 'C');
            }
        });
    
        // Second pass to sum up the 'C' values, excluding any marked keys
        Object.entries(invoiceDetails.fields).forEach(([key, value]) => {
            if (key.endsWith('C') && !excludeKeys.has(key) && key !== 'C') {
                total += parseFloat(value.stringValue) || 0;
            }
        });
    
        return total;
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
    
        // Close dropdowns when clicking outside
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
    }
    
    // Define the functions that will be called on click
    function viewInvoice(key) {
        console.log('Viewing invoice', key);
        // Implement the logic to view the invoice
    }

    // function downloadInvoice(key) {
    //     console.log('Downloading invoice', key);
    //     // Implement the logic to download the invoice
    // }

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

