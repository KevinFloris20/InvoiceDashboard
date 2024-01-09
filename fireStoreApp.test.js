const { interactWithFirestore } = require('./server/models/firestoreApp');

async function runTests() {
    const testData = {
        A: "Test A",
        B: "Test B",
        C: "Test C",
        D: "Test D",
        invoiceDetails: {
            "key1": "value1",
            "key2": "value2"
        }
    };

    const updateData = {
        A: "Updated A",
        B: "Updated B"
    };

    try {
        console.time("Total time");
        console.log("Starting tests...");

        // Create a new document
        console.time("Create Document");
        const newDocumentId = await interactWithFirestore('writeData', testData);
        console.timeEnd("Create Document");
        console.log("Created Document ID:", newDocumentId);
        if (newDocumentId) {
            console.log("PASS");
        }else{
            console.log("FAIL");
            console.log(newDocumentId);
        }

        // Read the new document
        console.time("Read New Document");
        const newDocumentData = await interactWithFirestore('readData', { documentId: newDocumentId });
        console.timeEnd("Read New Document");
        if (newDocumentData) {
            console.log("PASS");
        }else{
            console.log("FAIL");
            console.log(newDocumentData);
        }

        // Update the document
        console.time("Updating the document");
        var res = await interactWithFirestore('updateData', { documentId: newDocumentId, updateFields: updateData });
        console.timeEnd("Updating the document");
        if (res) {
            console.log("PASS");
        }else{
            console.log("FAIL");
            console.log(res);
        }
        // Read the updated document
        console.time("Reading the updated document: ");
        const updatedDocumentData = await interactWithFirestore('readData', { documentId: newDocumentId });
        console.timeEnd("Reading the updated document: ");
        if (updatedDocumentData) {
            console.log("PASS");
        }else{
            console.log("FAIL");
            console.log(updatedDocumentData);
        }

        // Delete the document
        console.time("Delete Document");
        const deldata = await interactWithFirestore('deleteData', { documentId: newDocumentId });
        console.timeEnd("Delete Document");
        if (deldata) {
            console.log("PASS");
        }else{
            console.log("FAIL");
            console.log(deldata);
        }

        // Verify the deletion
        try {
            console.time("Verify Deletion");
            const res = await interactWithFirestore('readData', { documentId: newDocumentId });
            console.timeEnd("Verify Deletion");
            if(res.toString().includes("not found")){
                console.log("PASS");
            }else{
                console.log("FAIL");
                console.log(res);
            }
        } catch (error) {
            if (error.message.includes("not found")) {
                console.log("PASS");
            }else{
                console.log("FAIL");
                console.log(error);
            }
        }
        

        console.log("Tests completed.");
        //total time
        console.timeEnd("Total time");

    } catch (error) {
        console.error("An error occurred during the tests:", error);
    }
}

runTests().catch(console.error);
