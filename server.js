const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => {
    const { code, input } = req.body;

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

            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            let output = '';

            // Handle input
            if (input) {
                runProcess.stdin.write(input + '\n');
                runProcess.stdin.end();
            }

            // Collect output and error
            runProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            runProcess.stderr.on('data', (data) => {
                output += data.toString();
            });

            // Add timeout for the process
            const timeout = setTimeout(() => {
                runProcess.kill(); // Terminate the process if it runs for too long
                res.json({ output: 'Error: Execution timeout' });
            }, 5000); // 5 seconds timeout

            runProcess.on('close', () => {
                clearTimeout(timeout); // Clear timeout once the process ends
                res.json({ output: output.trim() || 'No output' });

                fs.unlinkSync(sourceFile);
                fs.unlinkSync(executable);
            });
        });
    } catch (err) {
        res.json({ output: `Error: ${err.message}` });

        // Cleanup files
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
