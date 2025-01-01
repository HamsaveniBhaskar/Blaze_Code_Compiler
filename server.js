const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const os = require('os');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // For handling large requests

// Temp directories for compiled code and executables
const tempDir = path.join(__dirname, 'temp');
const sourceFile = path.join(tempDir, 'temp.cpp');
const executable = path.join(tempDir, 'temp.exe');

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Handle compilation and execution
app.post('/', async (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-std=c++17', '-O2']);
        let compileOutput = '';
        let compileError = '';

        compileProcess.stdout.on('data', (data) => {
            compileOutput += data.toString();
        });

        compileProcess.stderr.on('data', (data) => {
            compileError += data.toString();
        });

        // After compilation completes
        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                // Clean up if compilation failed
                cleanup();
                return res.json({ output: `Compilation failed: ${compileError || 'Unknown error'}` });
            }

            // Run the executable
            runExecutable(input, res);
        });
    } catch (err) {
        cleanup();
        res.status(500).json({ output: `Server error: ${err.message}` });
    }
});

// Function to run the compiled executable
const runExecutable = (input, res) => {
    const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let error = '';

    // Send input to the C++ program
    if (input) {
        runProcess.stdin.write(input + '\n');
    }
    runProcess.stdin.end(); // End input stream after writing

    // Collect output and error
    runProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    runProcess.stderr.on('data', (data) => {
        error += data.toString();
    });

    // When execution finishes, send response
    runProcess.on('close', () => {
        cleanup(); // Clean up temporary files

        if (error) {
            return res.json({ output: `Execution failed: ${error}` });
        }

        // Respond with the output or a default message if no output
        res.json({ output: output.trim() || 'No output' });
    });
};

// Function to clean up temporary files
const cleanup = () => {
    try {
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    } catch (err) {
        console.error('Error cleaning up temp files:', err);
    }
};

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

// Optimized error handling to gracefully shutdown
process.on('uncaughtException', (err) => {
    console.error('Unhandled exception:', err);
    cleanup();
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('Server is shutting down...');
    cleanup();
    process.exit(0);
});
