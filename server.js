const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/', (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    const sourceFile = path.join(__dirname, 'temp.cpp');
    const executable = path.join(__dirname, 'temp.exe');

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code using g++ (MinGW)
        const compileProcess = spawn('g++', [sourceFile, '-o', executable]);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: 'Compilation failed!' });
            }

            // Run the compiled executable
            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            let output = '';
            let prompt = ''; // To store the prompt for user input

            // If input is required, simulate waiting for input
            if (inputIndex === 0) {
                prompt = "Enter a Number:";
            } else {
                // Send user input to the program as cin
                runProcess.stdin.write(input + '\n');
            }

            runProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            runProcess.stderr.on('data', (data) => {
                output += data.toString();
            });

            runProcess.on('close', () => {
                if (output.indexOf("Enter a Number:") !== -1) {
                    return res.json({ prompt: prompt }); // Wait for input
                } else {
                    res.json({ output: output || 'No output' });
                }

                // Clean up temporary files after execution
                fs.unlinkSync(sourceFile);
                fs.unlinkSync(executable);
            });
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });
        
        // Clean up temporary files in case of an error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
