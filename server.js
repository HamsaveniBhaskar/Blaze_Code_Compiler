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
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    const sourceFile = path.join(__dirname, 'temp.cpp');
    const executable = path.join(__dirname, 'temp.exe');

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the C++ code
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-std=c++17', '-O2']);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: 'Compilation failed!' });
            }

            // Run the compiled executable
            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            // Send user input to stdin of the C++ program
            if (input) {
                runProcess.stdin.write(input + '\n');
            }

            let output = '';
            let error = '';

            // Handle program output
            runProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            // Handle program errors
            runProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            runProcess.on('close', () => {
                res.json({ output: error || output.trim() || 'No output' });

                // Clean up files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            });
        });
    } catch (err) {
        res.json({ output: `Error: ${err.message}` });

        // Clean up files
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
