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

    try {
        // Step 1: Write code to a temporary file
        fs.writeFileSync(sourceFile, code);

        // Step 2: Compile the code
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-std=c++17', '-O2']);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: 'Compilation failed!' });
            }

            // Step 3: Run the compiled program
            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            let output = '';
            let currentPrompt = '';
            let inputQueue = [];

            // Listen for stdout (prompts from the program)
            runProcess.stdout.on('data', (data) => {
                const dataString = data.toString();
                output += dataString;
                currentPrompt += dataString;

                // If the program asks for input, send the current prompt to the client
                if (currentPrompt.includes(':')) {
                    res.write(JSON.stringify({ prompt: currentPrompt }));
                    currentPrompt = ''; // Reset the prompt
                }
            });

            // Listen for stderr (errors from the program)
            runProcess.stderr.on('data', (data) => {
                output += data.toString();
            });

            // Handle user input dynamically
            req.on('data', (data) => {
                inputQueue.push(data.toString().trim());

                // Send the input to the program
                if (inputQueue.length > 0) {
                    runProcess.stdin.write(inputQueue.shift() + '\n');
                }
            });

            req.on('end', () => {
                runProcess.stdin.end();
            });

            // When the program finishes, send the final output
            runProcess.on('close', (runCode) => {
                res.end(
                    JSON.stringify({
                        output: output.trim(),
                        status: runCode === 0 ? 'Execution Successful' : 'Execution Failed',
                    })
                );

                // Cleanup temporary files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
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
