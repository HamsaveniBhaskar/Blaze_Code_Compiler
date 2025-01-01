const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let runProcess = null; // Store the running process
let outputBuffer = ''; // Buffer to store program output

// Endpoint to run the C++ code
app.post('/', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    const sourceFile = path.join(__dirname, 'temp.cpp');
    const executable = path.join(__dirname, 'temp.exe');

    fs.writeFileSync(sourceFile, code);

    try {
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-std=c++17', '-O2']);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: 'Compilation failed!' });
            }

            // Run the compiled program
            runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            runProcess.stdout.on('data', (data) => {
                outputBuffer += data.toString();
                if (outputBuffer.includes('Enter')) {
                    res.json({ output: outputBuffer.trim(), waitingForInput: true });
                    outputBuffer = '';
                }
            });

            runProcess.stderr.on('data', (data) => {
                outputBuffer += data.toString();
            });

            runProcess.on('close', () => {
                res.json({ output: outputBuffer.trim(), waitingForInput: false });
                runProcess = null;
                outputBuffer = '';
                fs.unlinkSync(sourceFile);
                fs.unlinkSync(executable);
            });
        });
    } catch (err) {
        res.json({ output: `Error: ${err.message}` });
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

// Endpoint to send input to the running process
app.post('/input', (req, res) => {
    const { input } = req.body;

    if (runProcess) {
        runProcess.stdin.write(input + '\n');
        res.json({ output: 'Input received.', waitingForInput: true });
    } else {
        res.status(400).json({ output: 'Error: No running process!' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
