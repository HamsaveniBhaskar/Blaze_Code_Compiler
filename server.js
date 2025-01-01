const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    const sourceFile = path.join(__dirname, 'temp.cpp');
    const executable = path.join(__dirname, 'temp.exe');

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code using g++
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-O2']);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                cleanupFiles(sourceFile, executable);
                return res.json({ output: 'Compilation failed!' });
            }

            // Run the compiled executable
            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            let outputBuffer = '';
            let errorBuffer = '';
            let responseSent = false; // Flag to track if the response has already been sent

            runProcess.stdout.on('data', (data) => {
                outputBuffer += data.toString();

                // If the output contains an input prompt (e.g., "Enter"), send the partial output to the client
                if (outputBuffer.includes('Enter') && !responseSent) {
                    res.json({ output: outputBuffer.trim(), waitingForInput: true });
                    responseSent = true;
                    outputBuffer = ''; // Clear the buffer for further input/output handling
                }
            });

            runProcess.stderr.on('data', (data) => {
                errorBuffer += data.toString();
            });

            runProcess.on('close', (runCode) => {
                if (!responseSent) {
                    // If no response has been sent yet, send the final output or error
                    const finalOutput = errorBuffer || outputBuffer || 'No output';
                    res.json({ output: finalOutput.trim(), waitingForInput: false });
                }
                cleanupFiles(sourceFile, executable);
            });
        });
    } catch (err) {
        res.json({ output: `Error: ${err.message}` });
        cleanupFiles(sourceFile, executable);
    }
});

// Helper function to clean up temporary files
function cleanupFiles(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
