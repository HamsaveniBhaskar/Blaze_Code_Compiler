let processId = null; // Store the process ID when first response is received

// Event listener for when the "Run" button is clicked
document.getElementById('runButton').addEventListener('click', async () => {
    const code = editor.getValue();  // Assume `editor` is your code editor

    // Send code to the server for compilation and running
    const response = await fetch('https://your-server-url/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });

    const result = await response.json();
    if (result.waitingForInput) {
        processId = result.processId;
        outputEditor.setValue(result.output);
    }
});

// Event listener for when the user provides input
document.getElementById('submitButton').addEventListener('click', async () => {
    const input = outputEditor.getValue();  // Get the input from the output editor

    // Send the input and processId to the backend
    const response = await fetch('https://your-server-url/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            processId: processId,  // Use the correct process ID
            input: input
        })
    });

    const result = await response.json();
    outputEditor.setValue(result.output);  // Update the output editor
});
