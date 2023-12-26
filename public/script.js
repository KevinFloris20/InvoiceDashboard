document.addEventListener('DOMContentLoaded', function() {
    let formData;  // Store the fetched form data

    function clearFormFields() {
        const existingFields = document.querySelectorAll('#invoice-form .dynamic-input');
        existingFields.forEach(field => field.remove());
    }

    // Function to create and position form fields
    function createFormFields(fields, scaleFactor) {
        const form = document.getElementById('invoice-form');
        clearFormFields();
        const adjustmentFactor = 0.003; //adjustment

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
                input.style.textAlign = 'center'
            }
            if(String(field.id) == 'D'){
                input.style.textAlign = 'center'
            }
            // Set font size based on the height of the field
            const fontSize = scaledHeight * 0.9; // Adjust the factor as needed
            input.style.fontSize = `${fontSize}px`;

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
});

