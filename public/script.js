document.addEventListener('DOMContentLoaded', function() {
    let formData;  // Store the fetched form data
    let fieldValues = {};  // Store current field values


        //this is for the buttons

    // Function to submit form data
    async function submitFormData() {
        // Collect all input values from the form
        const inputs = document.querySelectorAll('#invoice-form .dynamic-input');
        const submitData = Array.from(inputs).reduce((data, input) => {
            data[input.name] = input.value;
            return data;
        }, {});

        // Post the data to the server
        return fetch('/submit-form', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submitData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Form submitted:', data);
            return data;
        })
        .catch(error => console.error('Error submitting form:', error));
    }

    // Function to download the invoice
    async function downloadInvoice() {
        // Assuming the server responds with the URL of the PDF to download
        fetch('/download-invoice')
        .then(response => response.blob())
        .then(blob => {
            // Create a link element, set the href to the blob, and trigger the download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'invoice.pdf'; // Set the file name for download
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Error downloading invoice:', error));
    }

    // Add click event listener for Save button
    document.getElementById('saveButton').addEventListener('click', function() {
        submitFormData();
    });

    // Add click event listener for Save&Download button
    document.getElementById('saveDownloadButton').addEventListener('click', function() {
        submitFormData().then(() => downloadInvoice());
    });

    // Add click event listener for Save&Print button
    document.getElementById('savePrintButton').addEventListener('click', function() {
        submitFormData().then(() => window.print());
    });
    
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
        showSection('inv');
    });
    document.getElementById('menuSearch').addEventListener('click', function() {
        showSection('searchSection');
    });
    function showSection(sectionId) {
        var sections = document.getElementsByClassName('ui segment');
        for (var i = 0; i < sections.length; i++) {
            sections[i].style.display = 'none';
        }
            document.getElementById(sectionId).style.display = '';
    }





    
});

