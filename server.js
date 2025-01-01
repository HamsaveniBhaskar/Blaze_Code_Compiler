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
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-std=c++17', '-O2']);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: 'Compilation failed!' });
            }

            // Spawn the executable
            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            let output = '';
            let promptIndex = 0;

            const prompts = [];

            runProcess.stdout.on('data', (data) => {
                const prompt = data.toString();
                output += prompt;
                prompts.push(prompt);

                // Send the current prompt back to the client and wait for input
                res.write(`${prompt}`);
            });

            runProcess.stderr.on('data', (data) => {
                output += data.toString();
            });

runProcess.on('close', (runCode) => {
                // Finalize the response when the program finishes execution
                if (runCode === 0) {
                    output += "\n=== Code Execution Successful ===";
                    res.end(`${output}`);
                } else {
                    res.end("Error: Program execution failed!");
                }

                // Cleanup temporary files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            });

            // Handle user inputs
            req.on('data', (data) => {
                // Send user input to the program's stdin
                runProcess.stdin.write(data.toString() + '\n');
            });

            req.on('end', () => {
                // End the stdin stream when input is finished
                runProcess.stdin.end();
            });
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });

        // Cleanup temporary files in case of an error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
