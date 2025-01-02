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

            // Execute the compiled program
            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            let output = '';
            let error = '';

            // Send input to the program's stdin
            if (input) {
                runProcess.stdin.write(input + '\n');
            }
            runProcess.stdin.end();

            // Collect program output and error
            runProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            runProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                runProcess.kill(); // Terminate the process if it takes too long
                res.json({ output: 'Error: Execution timeout' });

                // Clean up files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            }, 5000); // 5 seconds timeout

            runProcess.on('close', () => {
                clearTimeout(timeout);

                // If there's an error, return it; otherwise, return the output
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
