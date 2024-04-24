//async helper functions for the front end opperations
async function viewInvoice(invoiceData) {
    const blob = await fetchBlob(invoiceData);

    const blobUrl = URL.createObjectURL(blob);

    const pdfWindow = window.open(blobUrl);

    pdfWindow.onload = function() {
        try {
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Error viewing the PDF:', error);
            displayMessage(`Error Viewing Invoice: ${error.message}`,'error')
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
                throw error;
            }
        };
    } catch (error) {
        console.error('Error fetching or printing the invoice:', error);
        displayMessage(`Error Printing Invoice: ${error.message}`,'error')
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
    try{
        const response = await fetch('/download-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invoiceData)
        });

        if (!response.ok) {
            throw new Error(`Error getting pdf blob from server: ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log(`Blob Type: ${blob.type}, Blob Size: ${blob.size}`);
        if (blob.type !== 'application/pdf' || blob.size === 0) {
            throw new Error('Received invalid PDF data');
        }
        return blob;
    }catch(error){
        throw error;
    }
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
        displayMessage(`Error Downloading Invoice: ${error.message}`, 'error');
    }
}
async function editFormData(docId) {
    const submitData = collectFormData();
    submitData.docID = docId;
    try {
        const response = await fetch('/updateInvoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submitData)
        });
        const responseData = await response.json();

        if (!response.ok) {
            displayMessage(responseData.errors || 'Error updating invoice', 'error');
            return null; 
        }

        console.log('Form Updated:', responseData, submitData);
        displayMessage(`Success: ${responseData.message}`, 'success');
        const messageBox = document.getElementById('editModeMessageChild');
        if (messageBox) {
            messageBox.parentNode.removeChild(messageBox);
        }
        return [responseData, submitData.A];
    } catch (error) {
        console.error('Error updating form:', error);
        displayMessage(`Error updating form: ${error.message}`, 'error');
        throw error;
    }
}
async function fetchClientsAndPopulateDropdown() {
    try {
        const response = await fetch('/getClients');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const clients = await response.json();
        const $dropdown = $('#AWIClientDropdown');
        $dropdown.empty(); 
        $('<option>').val('').text('Select Client').appendTo($dropdown);
        clients.forEach(client => {
            $('<option>').val(client.client_id).text(`${client.client_id} - ${client.client_name}`).appendTo($dropdown);
        });
        $dropdown.dropdown();
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
    // $('.ui.selection.dropdown').dropdown({
    //     clearable: true,
    //     placeholder: 'Select Client',
    //     onClear: async function() {
    //         const clientId = $(this).data('value');
    //         const userConfirmed = confirm(`Are you sure you want to delete this client(${clientId})?`);
    //         if(userConfirmed){                
    //             try {
    //                 const response = await fetch('/deleteClient', {
    //                     method: 'POST',
    //                     headers: {
    //                         'Content-Type': 'application/json',
    //                     },
    //                     body: JSON.stringify({ id: clientId })
    //                 });
    //                 if (!response.ok) {
    //                     throw new Error('Server responded with an error.');
    //                 }
    //                 const data = await response.json();
    //                 alert('Client deleted successfully.');          
    //             } catch (error) {
    //                 console.error('Error deleting client:', error);
    //                 alert('An error occurred while deleting the client.');
    //             }
    //         }
    //     }
    // });
}
async function delWorkItem(workItemId, data) {
    const userConfirmed = confirm(`Are you sure you want to delete this work item? ${workItemId}`);
    if (!userConfirmed) {
        return;
    }

    try {
        const response = await fetch('/deleteWorkItem', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: workItemId }),
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Work Item deleted successfully:', data);
            displayMessage('Work Item deleted successfully', 'success');
            document.querySelector(`#work-item-row-${workItemId}`).remove();
        } else {
            throw new Error(data.message || `Unknown error occurred while deleting work item: ${data}`);
        }
    } catch (error) {
        console.error('Error deleting work item:', error);
        displayMessage(`Error deleting work item: ${error.message}`, 'error');
    }
    console.log("work item deleted", workItemId);
}
async function editWorkItem(workItemId, data) {
    console.log("work item edited", workItemId);
}
async function submitInvoiceWorkItems() {
    const checkedCheckboxes = document.querySelectorAll('input[type="checkbox"][WI-data-client-id]:checked');
    const workItemClientIds = Array.from(checkedCheckboxes).map(checkbox => checkbox.getAttribute('WI-data-client-id'));
    const workItemIds = Array.from(checkedCheckboxes).map(checkbox => checkbox.getAttribute('WI-data-work-item-id'));
    const inputs = document.querySelectorAll('#addWIinvoiceForm input[type="text"][name^="A"], #addWIinvoiceForm input[type="text"][name^="B"]');
    toggleButtonState('addWIinvoiceSave', true);

    const data = {
        workItemClientIds: workItemClientIds,
        workItemIds: workItemIds,
        invoiceDate: inputs[1].value,
        invoiceNumber: inputs[0].value,
    };
    console.log(data);

    try {
        const response = await fetch('/submitInvoiceWorkItems', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const responseData = await response.json(); 

        if (!response.ok) {
            toggleButtonState('addWIinvoiceSave', false);
            displayMessages('errorWIDisplay', responseData.message, true);
            console.error('Server responded with status:', response.status, responseData.message);
        } else {
            document.getElementById('addWIinvoiceForm').reset();
            displayMessages('errorWIDisplay', 'New Invoice ID: ' + responseData.message);
            setTimeout(() => {
                document.getElementById('addWIinvoiceCancel').click();
                document.getElementById('menuSearchWorkItem').click();
                toggleButtonState('addWIinvoiceSave', false);
            }, 3000);
        }
    } catch (error) {
        toggleButtonState('addWIinvoiceSave', false);
        displayMessages('errorWIDisplay', 'Failed to submit work items: ' + error.message, true);
        console.error('There was a problem with the fetch operation:', error);
    }
}
async function submitWorkItemForm(route, jsonFormData, saveBtn, saveNext, form, mode) {
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;

    try {
        const response = await fetch(`/${route}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonFormData)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error:', data.error);
            displayAWIMessage(`${Array.isArray(data.error) ? data.error.join('<br>') : data.error.toString()}`, 'red error');
        } else {
            console.log('Success:', data.message);
            displayAWIMessage(`Success: ${data.message}`, 'green success');
            if (saveNext) {
                document.getElementById('inputAWIFields').querySelectorAll('input[type="text"]').forEach(input => input.value = '');
                document.querySelector("[name='1A']").focus();
            } else {
                form.reset();
            }
            if (mode === 'edit') {
                cancelViewOrEditMode();
            }
        }
    } catch (error) {
        console.error('Fetch error:', error);
        displayAWIMessage(`Error: ${error.message}`, 'red error');
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
    }
}

//this is for the image gallery of when a unit id is typed
// async function fetchAndDisplayFolders() {
//     try {
//         const response = await fetch('/getPictureIds');
//         if (!response.ok) throw new Error('Network response was not ok');
//         const folders = await response.json();

//         Object.entries(folders).forEach(([key, { folderName, pictureIds }]) => {
//             const dropdown = createDropdown(folderName, pictureIds);
//             document.getElementById('addWorkItemSection').appendChild(dropdown);
//         });
//     } catch (error) {
//         console.error('Error fetching folder data:', error);
//     }
// }
// async function fetchAndDisplayImage(pictureId) {
//     try {
//         const response = await fetch(`/getPictures?pictureId=${pictureId}`);
//         if (!response.ok) throw new Error('Network response was not ok');
//         const imageUrl = await response.text();

//         const imageContainer = document.getElementById('addWorkItemSection');
//         const img = document.createElement('img');
//         img.src = imageUrl;
//         img.style.maxWidth = '100px'; 
//         img.onclick = () => displayPopupImage(imageUrl);
//         imageContainer.appendChild(img);
//     } catch (error) {
//         console.error('Error fetching image:', error);
//     }
// }




//other helper logic for the entire front end opperations
function imageLoaded() {
    var image = document.getElementById('invoice-image');
    image.style.display = 'block'; 
    image.previousElementSibling.remove();
}
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
    const formattedMessage = Array.isArray(message) ? message.join('<br>') : message;
    messageElement.innerHTML = formattedMessage;
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
    if (!invoiceDetails) {
        return 0.00;
    }

    let total = 0;
    let total2 = 0;
    let excludeKeys = new Set();

    if (!invoiceDetails.hasOwnProperty('fields')) {
        Object.entries(invoiceDetails).forEach(([key, value]) => {
            if (value.toLowerCase().includes('total') && key.endsWith('B')) {
                var adjacentKey = key.replace('B', 'C');
                let invoiceDetailsClone = JSON.parse(JSON.stringify(invoiceDetails));
                delete invoiceDetailsClone[adjacentKey];
                var fakeTotal = 0;
                for (const [key2, value2] of Object.entries(invoiceDetailsClone)) {
                    if (key2.endsWith('C') && !isNaN(value2) && value2.trim() !== '') {
                        fakeTotal += parseFloat(value2);
                    }
                }
                if (parseFloat(invoiceDetails[adjacentKey]) === fakeTotal) {
                    total2 = fakeTotal;
                }
            }
        });

        for (const [key, value] of Object.entries(invoiceDetails)) {
            if (key.endsWith('C') && !isNaN(value) && value.trim() !== '') {
                total += parseFloat(value);
            }
        }
        if (total2 != 0) {
            return total2.toFixed(2);
        }
        return total.toFixed(2);
    } else {
        for (const [key, value] of Object.entries(invoiceDetails.fields)) {
            if (key.endsWith('B') && typeof value.stringValue === 'string' && value.stringValue.toLowerCase().includes('total')) {
                const num = key.match(/(\d+)B$/)[1];
                excludeKeys.add(num + 'C');
            }
        }

        for (const [key, value] of Object.entries(invoiceDetails.fields)) {
            if (key.endsWith('C') && !excludeKeys.has(key) && key !== 'C' && typeof value.stringValue === 'string') {
                const numValue = parseFloat(value.stringValue);
                if (!isNaN(numValue)) {
                    total += numValue;
                }
            }
        }
    }

    return total;
}
function emptyFormFields() {
    const inputs = document.querySelectorAll('#invoice-form .dynamic-input');
    inputs.forEach(input => input.value = '');
    document.getElementById('totalMSG').innerText = 'Total: $0.00';
}
function validateDecimalInput(event) {
    const inputElement = event.target;
    let value = inputElement.value;
    if (!isNaN(value)) {
        const regex = /^\d*\.?\d{0,2}$/;
        if (!regex.test(value)) {
            value = value.slice(0, -1);
            inputElement.value = value;
        }
    }
}
function convertToMMDDYYYY(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const month = utcDate.getMonth() + 1; 
    const day = utcDate.getDate();
    const year = utcDate.getFullYear();
    return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
}
function toggleButtonState(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (isLoading) {
        button.classList.add("loading");
        button.disabled = true;
    } else {
        button.classList.remove("loading");
        button.disabled = false;
    }
}
function handleTotalChargesCalculation(event) {
    var x;
    try{
        x = event.target.name.includes('C') 
    }catch(err){
        x = false;
    }
    if(x && (event.target.name !== 'C')){
        validateDecimalInput(event);
        const formData = collectFormData();
        const total = calculateTotalPrice(formData);
        document.getElementById('totalMSG').innerText = 'Total: $' + total.toString();
    }else{
        const formData = collectFormData();
        const total = calculateTotalPrice(formData);
        document.getElementById('totalMSG').innerText = 'Total: $' + total.toString();
    }
}
function toggleLoadingAnimation(show, elementId) {
    const loadingSpinner = document.getElementById(elementId || 'loadingSpinner');
    if (show) {
        loadingSpinner.style.display = 'block';
    } else {
        loadingSpinner.style.display = 'none';
    }
}
function displayInvoiceEditModeMessage(invoiceId) {
    let messageBox;
    messageBox = document.createElement('div');
    messageBox.id = 'editModeMessageChild';
    messageBox.name= invoiceId;
    messageBox.style.backgroundColor = 'orange';
    messageBox.style.color = 'white';
    messageBox.style.padding = '10px';
    messageBox.style.marginTop = '10px';
    messageBox.style.textAlign = 'center';
    messageBox.className = 'ui segment';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel Editing';
    cancelButton.className = 'fluid ui button'
    cancelButton.onclick = cancelEditMode;

    messageBox.appendChild(document.createTextNode(`Editing Invoice ID: ${invoiceId}`));
    messageBox.appendChild(cancelButton);

    document.getElementById('editModeMessage').appendChild(messageBox);
}
function cancelEditMode() {
    emptyFormFields();
    const messageBox = document.getElementById('editModeMessageChild');
    if (messageBox) {
        messageBox.parentNode.removeChild(messageBox);
    }
    document.getElementById('menuSearch').click(); 
}
function populateFormForUpdate(invoice, id) {
    document.getElementById('menuNewInv').click(); 
    emptyFormFields(); 
    document.querySelectorAll('.dynamic-input').forEach(input => {
        input.value = invoice[input.name] ? invoice[input.name] : '';
    })
    displayInvoiceEditModeMessage(id); 
}
function handleImageError() {
    var image = document.getElementById('invoice-image');
    var fallbackAttempted = false; 
    image.onerror = function() {
        if (!fallbackAttempted) {
            image.src = 'FCRInvoiceTemplateNull.png';
            fallbackAttempted = true; 
        } else {
            console.error('Both primary and fallback images failed to load.');
        }
    };
    image.src = 'FCRInvoiceTemplate.png';
}
function displayAWIMessage(message, type) {
    const messageDisplay = document.getElementById('AWImessageDisplay');
    messageDisplay.style.display = 'block'; 
    messageDisplay.className = `ui message ${type} fade-out`; 
    messageDisplay.innerHTML = message; 
}
function addWorkItemValidation(formData) {

    const messageDisplay = document.getElementById('AWImessageDisplay');
    messageDisplay.innerHTML = '';
    messageDisplay.style.display = 'none';
    let columnAWithoutParenthesesCount = 0;
    let hasDescriptionInB = false;
    let hasPriceInC = false;
    let errors = [];

    for (let pair of formData.entries()) {
        let [key, value] = pair;
        const column = key.slice(-1); 

        if (key === "Client" && value === "") {
            errors.push(`Error: Missing client`);
        } else if (key === "date" && value === "") {
            errors.push(`Error: Missing date`);
        }

        if (column === 'A') {
            if (value.trim() !== "" && (!value.startsWith('(') || !value.endsWith(')'))) columnAWithoutParenthesesCount++;
        } else if (column === 'B') {
            if (value.trim() !== "") {
                hasDescriptionInB = true;
                if (!value.startsWith('-')) errors.push(`Error: Each description must start with a dash: " - "`);
            }
        }else if (column === 'C') {
            if (value.trim() !== "") {
                const numericValue = parseFloat(value);
                if (isNaN(numericValue)) {
                    errors.push(`Error: Price must be a number`);
                } else {
                    if (!/^\d+\.\d{2}$/.test(value)) {
                        errors.push(`Error: Price must have up to two decimal places: "0.00"`);
                    } else {
                        hasPriceInC = true;
                    }
                }
            }
        }
    }

    if (columnAWithoutParenthesesCount === 0) errors.push(`Error: Missing Equipment ID`);
    if (columnAWithoutParenthesesCount > 1) errors.push(`Error: Only one Equipment ID is allowed per work item, please use parentheses: "( )"`);
    if (!hasDescriptionInB) errors.push(`Error: Missing Description`);
    if (!hasPriceInC) errors.push(`Error: Missing Price`);

    if (errors.length > 0) {
        displayAWIMessage(errors.join('<br>'), 'red error');
        return false;
    }
    return true;
}
function checkBoxValidation() {
    const currentCheckbox = this;
    const currentClientId = this.getAttribute('WI-data-client-id');
    const checkboxes = document.querySelectorAll('input[type="checkbox"][WI-data-client-id]');
    let checkedCount = 0;

    checkboxes.forEach(cb => {
        checkedCount += cb.checked ? 1 : 0;
    });

    if (checkedCount > 0) {
        checkboxes.forEach(cb => {
            if (cb.getAttribute('WI-data-client-id') !== currentClientId && (checkedCount > 0 && currentCheckbox.checked) || (checkedCount === 0 && !currentCheckbox.checked)){
                cb.disabled = currentCheckbox.checked;
            }
        });
        let el = document.getElementById('assignToInvoice')
        el.style.display = 'block';
        el.disabled = false;
    } else {
        checkboxes.forEach(cb => {
            if (cb.getAttribute('WI-data-client-id') !== currentClientId && (checkedCount > 0 && currentCheckbox.checked) || (checkedCount === 0 && !currentCheckbox.checked)){
                cb.disabled = currentCheckbox.checked;
            }
        });
        let el = document.getElementById('assignToInvoice')
        el.style.display = 'none';
        el.disabled = true;
    }    
}
function viewWorkItem(data) {
    populateForm(data, true); 
    toggleFormButtons(true); 
}
function editWorkItem(data) {
    populateForm(data, false); 
    toggleFormButtons(false); 
}
function populateForm(workItemDetails, isViewMode) {
    document.getElementById('addWorkItemForm').reset();
    document.getElementById('menuAddWorkItem').click();
    document.getElementById('addWorkItemSection').setAttribute("mode", isViewMode ? 'view' : 'edit');
    document.getElementById('addWorkItemSection').setAttribute("data-field-id", workItemDetails.workItemID);
    document.querySelector('#AWIsaveNextBtn').disabled = true;
    document.querySelector('#addWorkItemSection > div > h1').style.display = 'none';


    document.querySelectorAll('#headBtns .item').forEach(button => {
        button.classList.add('disableBtn');
    });

    $('#AWIClientDropdown').dropdown();
    $('#AWIClientDropdown').dropdown('set selected', `${workItemDetails.clientID} - ${workItemDetails.clientName}`);

    document.querySelector(`#addWorkItemForm > div:nth-child(1) > div:nth-child(1) > div > div > div`).classList.add('disabled');
    document.getElementById('AWIAddClientBtn').classList.add('disabled');
    
  
    const workDateField = document.querySelector(`#addWorkItemForm [name="date"]`);
    workDateField.value = workItemDetails.workDate.split('T')[0];
    workDateField.disabled = isViewMode;
  
    Object.keys(workItemDetails.descriptionPrice).forEach(key => {
        const inputField = document.querySelector(`#addWorkItemForm [name="${key}"]`);
        if (inputField) {
            inputField.value = workItemDetails.descriptionPrice[key];
        }
        if(key.includes('A') && key !== 'A' && (!workItemDetails.descriptionPrice[key].includes('(')) && (!workItemDetails.descriptionPrice[key].includes(')')) && (workItemDetails.descriptionPrice[key] !== '')){
            inputField.id = 'TempAWIunitNumID';
            document.getElementById('TempAWIunitNumID').classList.add('disableBtn');
        }
    });

    document.querySelectorAll('#addWorkItemForm input').forEach(input => {
        input.disabled = isViewMode;
    });
  
    displayEditModeMessage(isViewMode);
}
function displayEditModeMessage(isViewMode) {
    let messageBox = document.querySelector('#editModeMessageChild');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'editModeMessageChild';
        messageBox.style = "position: absolute; z-index: 1; width: 100%; background-color: orange; text-align: center; color: white; align-self:center; font-weight: bold; inset:0;padding:10px;";
        const headerButtons = document.getElementById('headBtns');
        headerButtons.style.position = 'relative';
        headerButtons.insertBefore(messageBox, headerButtons.firstChild);
    }
  
    messageBox.innerHTML = `${isViewMode ? 'You are in View mode ---  ' : 'You are in Edit mode --- '} 
                            <button id="editModeButton" class="ui button" style="background-color: white; color: black;" onclick="cancelViewOrEditMode()">Exit</button>`;
}
function toggleFormButtons(disable) {
    document.querySelector('#AWISaveBtn').disabled = disable;
}
function setupModal(ModalId, addFormId, errorDisplayId, addBtnId, addCancelId, addSaveId) {
    var modal = document.getElementById(ModalId);
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);

    function openModal() {
        overlay.style.display = 'block';
        modal.style.display = 'block';
    }

    function closeModal() {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        document.getElementById(errorDisplayId).style.display = 'none';
        document.getElementById(addFormId).reset();
    }

    document.getElementById(addBtnId).addEventListener('click', function(event) {
        event.preventDefault();
        openModal();
    });

    modal.querySelector('.close.icon').addEventListener('click', function(event) {
        event.preventDefault();
        closeModal();
    });

    document.getElementById(addCancelId).addEventListener('click', function(event) {
        closeModal();
    });

    overlay.addEventListener('click', closeModal);

    modal.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    if (addFormId === 'addClientForm') {
        async function submitNewClientForm(formData) {
            try {
                const response = await fetch(`/newClient?${formData}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Error: ${response.status}`);
                }
                const data = await response.json();
                console.log(response, data);
                document.getElementById(addFormId).reset();
                document.getElementById(errorDisplayId).style.display = 'none';
                closeModal();
                fetchClientsAndPopulateDropdown();
            } catch (error) {
                console.error('Fetch error:', error.message);
                const errorDisplay = document.getElementById(errorDisplayId);
                errorDisplay.textContent = error.message;
                errorDisplay.style.display = '';
            }
        }
        document.getElementById(addSaveId).addEventListener('click', async function(event) {
            event.preventDefault();
            const formData = new URLSearchParams(new FormData(document.getElementById(addFormId))).toString();
            console.log(formData);
            submitNewClientForm(formData);
        });
    }
}
function displayMessages(elementId, message, isError = false) {
    const displayElement = document.getElementById(elementId);
    const formattedMessage = Array.isArray(message) ? message.join('<br>') : message;
    displayElement.innerHTML = formattedMessage;
    displayElement.style.display = 'block';
    displayElement.classList = isError ? 'ui red error message' : 'ui green success message';
    setTimeout(() => {
        displayElement.textContent = '';
        displayElement.style.display = 'none';
    }, 60000);
}
function cancelViewOrEditMode() {
    document.querySelector('#addWorkItemSection > div > h1').style.display = 'block';
    document.getElementById('addWorkItemForm').reset();
    document.querySelectorAll('#addWorkItemForm input, #addWorkItemForm select').forEach(input => {
        input.setAttribute('disabled', 'false');
    });
    document.querySelector(`#addWorkItemForm > div:nth-child(1) > div:nth-child(1) > div > div > div`).classList.remove('disabled');
    document.getElementById('AWIAddClientBtn').classList.remove('disabled');
    $('#AWIClientDropdown').dropdown('clear');

    document.querySelector('#AWIsaveNextBtn').disabled = false;

    document.getElementById('addWorkItemSection').setAttribute("data-field-id", " ");

    document.querySelectorAll('#headBtns .item').forEach(button => {
        button.classList.remove('disableBtn');
    });

    let unitIdEl = document.getElementById('TempAWIunitNumID');
    if(unitIdEl){
        unitIdEl.classList.remove('disableBtn');
        unitIdEl.id = '';
        unitIdEl.removeAttribute('id');
    }

    const messageBox = document.getElementById('editModeMessageChild');
    if (messageBox) {
        messageBox.parentNode.removeChild(messageBox);
    }

    document.getElementById('addWorkItemSection').setAttribute("mode", 'normal');
    document.getElementById('menuSearchWorkItem').click();
    
    toggleFormButtons(false);
}
//this is for the image gallery of when a unit id is typed
// function createDropdown(folderName, pictureIds) {
//     const dropdownDiv = document.createElement('div');
//     dropdownDiv.className = 'ui dropdown';
//     dropdownDiv.innerHTML = `<input type="hidden" name="${folderName}">
//                              <i class="dropdown icon"></i>
//                              <div class="default text">${folderName}</div>
//                              <div class="menu">`;

//     pictureIds.forEach(pictureId => {
//         const item = document.createElement('div');
//         item.className = 'item';
//         item.dataset.pictureId = pictureId;
//         item.textContent = `Picture ${pictureId}`;
//         item.onclick = () => fetchAndDisplayImage(pictureId);
//         dropdownDiv.querySelector('.menu').appendChild(item);
//     });

//     dropdownDiv.innerHTML += '</div>';
//     return dropdownDiv;
// }
// function displayPopupImage(imageUrl) {
//     let modal = document.getElementById('imageModal');
//     if (!modal) {
//         modal = document.createElement('div');
//         modal.id = 'imageModal';
//         modal.className = 'ui modal';
//         modal.style.display = 'none'; 
//         document.body.appendChild(modal);

//         // Optional: Add a close button inside the modal
//         const closeButton = document.createElement('i');
//         closeButton.className = 'close icon';
//         closeButton.onclick = () => modal.style.display = 'none'; 
//         modal.appendChild(closeButton);
//     }

//     modal.innerHTML += `<div class="content">
//                             <img src="${imageUrl}" style="max-width: 90vw; max-height: 90vh;">
//                         </div>`;

//     modal.style.display = 'block';

//     window.onclick = (event) => {
//         if (event.target == modal) {
//             modal.style.display = 'none';
//         }
//     };
// }



document.addEventListener('DOMContentLoaded', function() {
    handleImageError();
    document.getElementById('headBtns').addEventListener('click', function(e) {
        if (e.target.dataset.target) {
            document.querySelectorAll('.sect').forEach(function(section) {
                section.style.display = 'none';
            });
            const targetSection = document.getElementById(e.target.dataset.target);
            if (targetSection) {
                targetSection.style.display = '';
            }
        }
    });




    ///////////////(Make New Invoice)///////////////



    //save button (Make New Invoice)
    async function submitFormData(data) {
        const submitData = data ? data : collectFormData()
        console.log(submitData)
        try {
            const response = await fetch('/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submitData)
            });
            const responseData = await response.json();
            if (!response.ok) {
                displayMessage(responseData.errors || 'Unknown error', 'error');
                return [null,null]; 
            }
            console.log('Form submitted:', responseData, submitData);
            displayMessage(`Success: ${responseData.message}. New ID: ${responseData.result}`, 'success');
            return [responseData, submitData.A];
        } catch (error) {
            console.error('Error submitting form:', error);
            displayMessage(`Error: ${error.message}`, 'error');
            throw error;
        }
    }
    document.getElementById('saveButton').addEventListener('click', async function() {
        toggleButtonState('saveButton', true);
        try {
            let data, name
            const docId = document.getElementById('editModeMessageChild')
            if(docId){
                [data, name] = await editFormData(docId.name);
            }else{
                [data, name] = await submitFormData();
            }
            if (data && name) {
                emptyFormFields();
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            toggleButtonState('saveButton', false);
        }
    });
    
    //save and download button (Make New Invoice)
    document.getElementById('saveDownloadButton').addEventListener('click', async function() {
        toggleButtonState('saveDownloadButton', true);
        const invoiceData = collectFormData();
        const docId = document.getElementById('editModeMessageChild')
        try {
            let res, invName
            if(docId){
                [res, invName] = await editFormData(docId.name);
            }else{
                [res, invName] = await submitFormData();
            }
            if (res && res.result) {
                await downloadInvoice(invoiceData, res, invName);
                emptyFormFields();
            } else {
                console.error('Error: Invalid response from submitFormData');
                displayMessage('Error: Invalid response from submitFormData', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            toggleButtonState('saveDownloadButton', false);
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
            input.setAttribute('autocomplete', 'off');
            input.classList.add('dynamic-input');
            input.type = 'text';
            input.name = field.id; 
            input.style.width = '100%';
            input.style.height = '100%';
            input.style.border = 'none'; 
            input.style.padding = '0'; 
            input.style.margin = '0'; 
            input.style.fontFamily = 'Times New Roman';
    
            if((String(field.id) != 'A') && (String(field.id).includes('A'))){
                input.style.textAlign = 'center';
            }
            if(String(field.id) === 'A'){
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
            if(String(field.id) == 'E'){
                input.style.textAlign = 'left';
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
    fetch('/formdata').then(response => response.json()).then(data => {
            formData = data; 
            console.log(formData)
            reloadFields();
        }).catch(error => console.error('Error fetching data:', error));
    window.addEventListener('resize', reloadFields);

    //calculate total charges (Make New Invoice)
    document.getElementById('invoice-form').addEventListener('input', handleTotalChargesCalculation, true);
    document.getElementById('newInv').addEventListener('click', handleTotalChargesCalculation, true);

    //auto fill textbox (Make New Invoice)

    //add the auto detect for each of the work items on the invoice (Make New Invoice)
    


    ///////////////(Search Invoices)///////////////



    //show initial interactive table of invoices (Search Invoices)
    async function fetchAndDisplayInvoices() {
        toggleLoadingAnimation(true);
        try {
            const response = await fetch('/getInvoices');
            if (!response.ok) throw new Error(`Failed to fetch invoices: ${response}`);
            const invoices = await response.json();
            renderInvoicesTable(invoices);
        } catch (error) {
            console.error(`Error: ${error}`, error);
        } finally {
            toggleLoadingAnimation(false);
        }
    }
    function renderInvoicesTable(invoices) {
        const tbody = document.getElementById('invoiceTable').querySelector('tbody');
        tbody.innerHTML = ''; 
        // check if invoice is an array
        if (!Array.isArray(invoices)) {
            console.error('Error: Invalid invoice data');
            return;
        }
        invoices.forEach(invoice => {
            const downloadPDFdata = JSON.stringify(flattenServerRes(invoice));
            for (const [key, value] of Object.entries(invoice.fields)) {
                if (value.stringValue) {
                    invoice.fields[key].stringValue = value.stringValue.replace(/\s+/g, ' ');
                }
            }

            const row = document.createElement('tr');
            row.id = `invoice-row-${invoice.id}`;
    
            const invoiceId = invoice.id;
            row.appendChild(createCell(invoiceId)); 
            
            const invoiceNumber = invoice.fields['A'] ? invoice.fields['A'].stringValue : 'null';
            row.appendChild(createCell(invoiceNumber)); // Invoice #
            
            const invoiceDate = invoice.fields['B'] ? (invoice.fields['B'].timestampValue  ? convertToMMDDYYYY(invoice.fields['B'].timestampValue) : invoice.fields['B'].stringValue) : 'null';
            row.appendChild(createCell(invoiceDate)); // Invoice Date
            
            const clientName = invoice.fields['C'] ? invoice.fields['C'].stringValue : 'null';
            row.appendChild(createCell(clientName)); // Client Name
            
            const clientAddress = invoice.fields['D'] ? invoice.fields['D'].stringValue : '';
            row.appendChild(createCell(clientAddress)); // Client Address

            const clientEmail = invoice.fields['E'] ? invoice.fields['E'].stringValue : '';
            row.appendChild(createCell(clientEmail)); // Client email
            
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
                        <div class="item itemOptions" id="${invoiceId}" attr="editInvoice">Edit Invoice</div>
                    </div>
                </div>
            `;
            row.appendChild(optionsCell); 
            tbody.appendChild(row); 
        });
        initializeDropdowns();
    }
    function initializeDropdowns(whichTable) {
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
                // search Invoice
                const data = JSON.parse(opp.parentElement.getAttribute('pdfData')) || {};
                if (opp.getAttribute('attr') === 'viewInvoice') {
                    viewInvoice(data);
                } else if (opp.getAttribute('attr') === 'downloadInvoice') {
                    const name = opp.getAttribute("invnum").toString();
                    downloadInvoice(data, opp.id, name);
                } else if (opp.getAttribute('attr') === 'printInvoice') {
                    printInvoice(data, opp.id);
                } else if (opp.getAttribute('attr') === 'delInvoice') {
                    deleteInvoice(opp.id);
                } else if (opp.getAttribute('attr') === 'editInvoice') {
                    populateFormForUpdate(data, opp.id);
                } else if (opp.getAttribute('attr') === 'viewWorkItem') {
                    viewWorkItem(JSON.parse(opp.parentElement.getAttribute('data')));
                } else if (opp.getAttribute('attr') === 'delWorkItem') {
                    delWorkItem(opp.id, JSON.parse(opp.parentElement.getAttribute('data')));
                } else if (opp.getAttribute('attr') === 'editWorkItem') {
                    editWorkItem(JSON.parse(opp.parentElement.getAttribute('data')));
                }

                // search Work items

            }
        )});
    }
    document.getElementById('menuSearch').addEventListener('click', fetchAndDisplayInvoices);

    //dropdown filters for the columns (Search Invoices)
    document.getElementById('searchInvoiceId').addEventListener('input', filterTable);
    document.getElementById('searchInvoiceNumber').addEventListener('input', filterTable);
    document.getElementById('searchInvoiceDate').addEventListener('input', filterTable);
    document.getElementById('searchClientName').addEventListener('input', filterTable);
    document.getElementById('searchClientAddress').addEventListener('input', filterTable);
    document.getElementById('searchClientEmail').addEventListener('input', filterTable);
    function filterTable() {
        const idValue = document.getElementById('searchInvoiceId').value.toLowerCase();
        const numberValue = document.getElementById('searchInvoiceNumber').value.toLowerCase();
        const dateValue = document.getElementById('searchInvoiceDate').value.toLowerCase();
        const clientNameValue = document.getElementById('searchClientName').value.toLowerCase();
        const clientAddressValue = document.getElementById('searchClientAddress').value.toLowerCase();
        const clientEmailValue = document.getElementById('searchClientEmail').value.toLowerCase();
    
        const table = document.getElementById('invoiceTable');
        const rows = table.getElementsByTagName('tr');
    
        for (let i = 2; i < rows.length; i++) { 
            let idCell = rows[i].getElementsByTagName('td')[0];
            let numberCell = rows[i].getElementsByTagName('td')[1];
            let dateCell = rows[i].getElementsByTagName('td')[2];
            let clientNameCell = rows[i].getElementsByTagName('td')[3];
            let clientAddressCell = rows[i].getElementsByTagName('td')[4];
            let clientEmailCell = rows[i].getElementsByTagName('td')[5];
    
            // Check if row should be displayed
            if (idCell && numberCell && dateCell && clientNameCell && clientAddressCell && clientEmailCell) {
                if (idCell.textContent.toLowerCase().indexOf(idValue) > -1 &&
                    numberCell.textContent.toLowerCase().indexOf(numberValue) > -1 &&
                    dateCell.textContent.toLowerCase().indexOf(dateValue) > -1 &&
                    clientNameCell.textContent.toLowerCase().indexOf(clientNameValue) > -1 &&
                    clientAddressCell.textContent.toLowerCase().indexOf(clientAddressValue) > -1 &&
                    clientEmailCell.textContent.toLowerCase().indexOf(clientEmailValue) > -1) {
                    rows[i].style.display = '';
                } else {
                    rows[i].style.display = 'none';
                }
            }
        }
    }

    //advanced search (Search Invoices)
    const toggleBtn = document.getElementById('toggleAdvancedSearch');
    const advSearchDiv = document.getElementById('advancedSearch');
    const caretIcon = document.getElementById('caretIcon');
    toggleBtn.addEventListener('click', function() {
        // caretIcon.classList.toggle('rotated'); 
        advSearchDiv.classList.toggle('active');
        caretIcon.classList.toggle('rotated'); 
    });
    document.getElementById('advSearchForm').addEventListener('submit', async function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const searchParams = new URLSearchParams(formData);
        const queryString = searchParams.toString();
        try {
            const response = await fetch(`/getAdvancedInvoice?${queryString}`);
            console.log(response);
            if (!response.ok) throw new Error(`Failed to fetch invoices: ${response}`);
            const invoices = await response.json();
            renderInvoicesTable(invoices);
        } catch (error) {
            console.error('Error:', error);
        }
    });

    //submit num of most recent amt of invoices by number (Search Invoices)


    //search bar (Search Invoices)




    ///////////////(Add work Items)///////////////





    //this will always add one row to the form to make sure there is always one row (Add work Items)


    // Handle form submission (Add work Items)
    const jsonFormData2 = {
        Client: '7 - Test Client',
        date: '2024-10-12',
        '1A': 'LMIZ111222',
        '2A': '(test)',
        '3A': '(anythingGoesHere)',
        '4A': '',
        '5A': '',
        '6A': '',
        '7A': '',
        '8A': '',
        '9A': '',
        '10A': '',
        '1B': '-m',
        '2B': '- Description 2',
        '3B': '',
        '4B': '',
        '5B': '',
        '6B': '',
        '7B': '',
        '8B': '',
        '9B': '',
        '10B': '',
        '1C': '9.01',
        '2C': '411.19',
        '3C': '',
        '4C': '',
        '5C': '',
        '6C': '',
        '7C': '',
        '8C': '',
        '9C': '',
        '10C': ''
    };
    function addWorkItemForm(event, saveNext) {
        const form = document.getElementById('addWorkItemForm');
        const formData = new FormData(form);
        const jsonFormData = Object.fromEntries(formData.entries());

        if(!jsonFormData['Client']){
            jsonFormData['Client'] = $('#AWIClientDropdown').val();
        }

        if (!addWorkItemValidation(formData)){
            return; 
        }
    
        const saveBtn = event.target;
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        const mode = document.getElementById('addWorkItemSection').getAttribute("mode");
        const route = mode === 'normal' ? 'addWorkItem' : mode === 'edit' ? 'updateWorkItem' : null;
    
        if (!route) {
            console.error('Error: Invalid mode', mode);
            displayAWIMessage('Error: Invalid mode', 'red error');
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            return;
        }
    
        if (mode === 'edit') {
            jsonFormData['dataFieldId'] = document.getElementById('addWorkItemSection').getAttribute("data-field-id");
        }
    
        submitWorkItemForm(route, jsonFormData, saveBtn, saveNext, form, mode);
    }
    document.getElementById('AWISaveBtn').addEventListener('click', function(event) {
        event.preventDefault(); 
        addWorkItemForm(event, false);
    });
    document.getElementById('AWIsaveNextBtn').addEventListener('click', function(event) {
        event.preventDefault(); 
        addWorkItemForm(event, true);
    });
    document.getElementById('addWorkItemForm').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            if (event.shiftKey) {
                document.getElementById('AWISaveBtn').click();
            } else {
                document.getElementById('AWIsaveNextBtn').click();
            }
        }
    });

    //add new client (Add work Items)
    fetchClientsAndPopulateDropdown();
    //Setup for the add client modal
    setupModal('clientModal', 'addClientForm', 'errorDisplay', 'AWIAddClientBtn', 'addClientCancel', 'addClientSave');

    ////////////////////////Search Work Items////////////////////////

    //search bar (Search Work Items)


    //Display Work Items Table (Search Work Items)
    async function fetchAndDisplayWorkItems() {
        let el = document.getElementById('assignToInvoice')
        el.style.display = 'none';
        el.disabled = true;
        toggleLoadingAnimation(true, 'loadingSpinnerWI');
        try {
            const response = await fetch('/displayWorkItems'); //////////////////////////////////////////////
            if (!response.ok) throw new Error(`Failed to fetch work items: ${response.statusText}`);
            const workItems = await response.json();
            renderWorkItemsTable(workItems);
        } catch (error) {
            console.error(`Error: ${error.message}`, error);
        } finally {
            toggleLoadingAnimation(false, 'loadingSpinnerWI');
        }
    }
    
    function renderWorkItemsTable(workItems) {
        const tbody = document.getElementById('workItemTable').querySelector('tbody');
        tbody.innerHTML = '';
        workItems.forEach(item => {
            const row = document.createElement('tr');
            row.id = `work-item-row-${item.workItemID}`;
            row.appendChild(createCell(item.workItemID));
            row.appendChild(createCell(item.unitName));
            row.appendChild(createCell(convertToMMDDYYYY(item.workDate)));
            row.appendChild(createCell(item.clientName));
            row.appendChild(createCell(item.totalCharges));
            const assignedCell = createCell(item.assignedToInvoice ? '✔️' : '');
            assignedCell.style.textAlign = 'center'; 
            if (!item.assignedToInvoice) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.setAttribute('WI-data-client-id', item.clientID);
                checkbox.setAttribute('WI-data-work-item-id', item.workItemID); 
                checkbox.onclick = checkBoxValidation; 
                assignedCell.appendChild(checkbox);
            }
            row.appendChild(assignedCell);
            const optionsCell = document.createElement('td');
            optionsCell.innerHTML = `
                <div class="ui floating dropdown icon button">
                    <i class="dropdown icon"></i>
                    <div class="menu" data='${JSON.stringify(item)}'>
                        <div class="item itemOptions" id="${item.workItemID}" attr="viewWorkItem">View Work Item</div>
                        <div class="item itemOptions" id="${item.workItemID}" attr="delWorkItem">Delete Work Item</div>
                        <div class="item itemOptions" id="${item.workItemID}" attr="editWorkItem">Edit Work Item</div>
                    </div>
                </div>
            `;
            row.appendChild(optionsCell); 
            tbody.appendChild(row);
        });
        initializeDropdowns();
    }
    
    document.getElementById('advSearchFormWI').addEventListener('submit', async function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const searchParams = new URLSearchParams(formData);
        const queryString = searchParams.toString();
        console.log(`Searching Work Items with query: ${queryString}`);
    });
    
    const toggleBtnWI = document.getElementById('toggleAdvancedSearchWI');
    const advSearchDivWI = document.getElementById('advancedSearchWI');
    const caretIconWI = document.getElementById('caretIconWI');
    toggleBtnWI.addEventListener('click', function() {
        advSearchDivWI.classList.toggle('active');
        caretIconWI.classList.toggle('rotated');
    });
    
    document.getElementById('menuSearchWorkItem').addEventListener('click', fetchAndDisplayWorkItems);
    
    function filterWorkItemsTable() {
        const idValue = document.getElementById('searchWorkItemId').value.toLowerCase();
        const equipmentIdValue = document.getElementById('searchWorkItemEquipmentId').value.toLowerCase();
        const workDateValue = document.getElementById('searchWorkItemDate').value.toLowerCase();
        const clientNameValue = document.getElementById('searchWorkItemName').value.toLowerCase();
        const assignedValue = document.getElementById('searchAssigned').value.toLowerCase();
        const table = document.getElementById('workItemTable');
        const rows = table.getElementsByTagName('tr');
        for (let i = 1; i < rows.length; i++) {
            let idCell = rows[i].getElementsByTagName('td')[0];
            let equipmentIdCell = rows[i].getElementsByTagName('td')[1];
            let workDateCell = rows[i].getElementsByTagName('td')[2];
            let clientNameCell = rows[i].getElementsByTagName('td')[3];
            let assignedCell = rows[i].getElementsByTagName('td')[5];
            if (idCell && equipmentIdCell && workDateCell && clientNameCell && assignedCell) {
                if (idCell.textContent.toLowerCase().indexOf(idValue) > -1 &&
                    equipmentIdCell.textContent.toLowerCase().indexOf(equipmentIdValue) > -1 &&
                    workDateCell.textContent.toLowerCase().indexOf(workDateValue) > -1 &&
                    clientNameCell.textContent.toLowerCase().indexOf(clientNameValue) > -1 &&
                    assignedCell.textContent.toLowerCase().indexOf(assignedValue) > -1) {
                    rows[i].style.display = '';
                } else {
                    rows[i].style.display = 'none';
                }
            }
        }
    }
    
    document.getElementById('searchWorkItemId').addEventListener('input', filterWorkItemsTable);
    document.getElementById('searchWorkItemEquipmentId').addEventListener('input', filterWorkItemsTable);
    document.getElementById('searchWorkItemDate').addEventListener('input', filterWorkItemsTable);
    document.getElementById('searchWorkItemName').addEventListener('input', filterWorkItemsTable);
    // document.getElementById('searchAssigned').addEventListener('input', filterWorkItemsTable);

    // Assigning an invoice to the work Items (Search Work Items)
    document.getElementById('addWIinvoiceSave').addEventListener('click', submitInvoiceWorkItems);

    //setup for the assign to invoice(Search Work Items)
    setupModal('WIinvoiceModal', 'addWIinvoiceForm', 'errorWIDisplay', 'assignToInvoice', 'addWIinvoiceCancel', 'addWIinvoiceSave');
    

    

    //make the table interactive (Search Work Items)


});

