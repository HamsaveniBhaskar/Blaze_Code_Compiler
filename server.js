const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// Store active processes to handle inputs interactively
let activeProcesses = {};

app.post('/run', (req, res) => {
    const { code } = req.body;
    const sourceFile = path.join(__dirname, 'temp.cpp');
    const executable = path.join(__dirname, 'temp.exe');

    // Save the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    // Compile the code
    const compileProcess = spawn('g++', [sourceFile, '-o', executable]);
    
    compileProcess.on('close', (code) => {
        if (code !== 0) {
            return res.json({ output: 'Compilation failed!' });
        }

        // Run the compiled executable
        const runProcess = spawn(executable, [], { stdio: 'pipe' });

        const processId = Date.now();  // Unique process ID based on timestamp
        activeProcesses[processId] = runProcess;  // Store the process by its ID

        let output = '';

        runProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        runProcess.stderr.on('data', (data) => {
            output += data.toString();
        });

        runProcess.on('close', () => {
            res.json({ output: output || 'No output' });
            delete activeProcesses[processId]; // Clean up after execution
        });

        res.json({
            waitingForInput: true,
            output: output + "\nEnter First Number: ",  // Output prompt for first input
            processId
        });
    });
});

app.post('/enter', (req, res) => {
    const { processId, input } = req.body;

    if (!activeProcesses[processId]) {
        return res.json({ output: 'Invalid process ID!' });
    }

    const process = activeProcesses[processId];

    // Send the input to the running process (simulate user input)
    process.stdin.write(input + '\n');  // Send input to the process

    let output = '';
    process.stdout.on('data', (data) => {
        output += data.toString();
    });

    process.stderr.on('data', (data) => {
        output += data.toString();
    });

    process.on('close', () => {
        res.json({ output: output || 'No output' });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
