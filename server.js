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
        // Start timer
        const startTime = performance.now();

        // Compile the C++ code
        console.log('Starting Compilation...');
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-std=c++17', '-O2']);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                console.error('Compilation failed');
                return res.json({ output: 'Compilation failed!' });
            }

            console.log('Compilation Successful, Starting Execution...');
            // Execute the compiled program
            const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

            let output = '';
            let error = '';

            // Send input to the program's stdin
            if (input) {
                console.log(`Sending input to the program: ${input}`);
                runProcess.stdin.write(input + '\n');
            }
            runProcess.stdin.end();

            // Collect program output and error
            runProcess.stdout.on('data', (data) => {
                output += data.toString();
                console.log(`stdout: ${data.toString()}`);
            });
            runProcess.stderr.on('data', (data) => {
                error += data.toString();
                console.error(`stderr: ${data.toString()}`);
            });

            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                console.log('Execution timed out');
                runProcess.kill(); // Terminate the process if it takes too long
                res.json({ output: 'Error: Execution timeout' });

                // Clean up files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            }, 5000); // 5 seconds timeout

            runProcess.on('close', () => {
                clearTimeout(timeout);

                // End timer
                const endTime = performance.now();
                const timeTaken = ((endTime - startTime) / 1000).toFixed(3); // Convert to seconds

                // If there's an error, return it; otherwise, return the output and execution time
                res.json({
                    output: error || output.trim() || 'No output',
                    status: '===Code Executed Successfully===',
                    timeTaken: `${timeTaken} seconds`
                });

                // Clean up files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            });
        });
    } catch (err) {
        console.error('Error during execution:', err);
        res.json({ output: `Error: ${err.message}` });

        // Clean up files
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
