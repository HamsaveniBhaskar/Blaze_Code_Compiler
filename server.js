function runCode() {
    const loader = document.getElementById('loader');
    const runner = document.getElementById('run');
    
    runner.style.display = 'none';
    loader.style.display = 'inline-block';

    // Retrieve the code from the editor
    const code = editor.getValue();
    
    console.log('Code:', code);  // Log the code to ensure it's being captured correctly
    
    outputEditor.setValue("Executing...");
    outputEditor.clearSelection();

    // Make the POST request to the backend (your Render service)
    fetch("https://blaze-code-compiler.onrender.com", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            code,  // The code from the editor
            input: '32'  // Test with a fixed input for now
        }),
    })
    .then(response => {
        console.log('Received response:', response);  // Log the response
        if (!response.ok) {
            throw new Error(`Server Error: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);  // Log the data received from the backend
        if (data.error) {
            outputEditor.setValue(data.error.fullError || "No output received!");
        } else {
            outputEditor.setValue(data.output || "No output received!");
        }

        loader.style.display = 'none';
        runner.style.display = 'flex';
    })
    .catch(error => {
        console.error("Error occurred:", error);
        outputEditor.setValue(`Error running code: ${error.message}`);
        outputEditor.clearSelection();

        loader.style.display = 'none';
        runner.style.display = 'flex';
    });
}
