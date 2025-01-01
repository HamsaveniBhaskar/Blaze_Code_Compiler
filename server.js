const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware to handle CORS and body parsing
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Handle large request bodies

// Temp directories for compiled code and executables
const tempDir = path.join(__dirname, 'temp');
const sourceFile = path.join(tempDir, 'temp.cpp');
const executable = path.join(tempDir, 'temp.exe');

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Handle C++ code compilation and execution
app.post('/', async (req, res) => {
    const { code, input } = req.body; // Receive code and input from the client

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    // Write code to a temporary file
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

        // After compilation is complete, run the executable
        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                // Clean up temporary files if compilation failed
                cleanup();
                return res.json({ output: `Compilation failed: ${compileError || 'Unknown error'}` });
            }

            // If compilation is successful, proceed to run the code
            runExecutable(input, res); // Pass the input provided by the user
        });
    } catch (err) {
        cleanup();
        res.status(500).json({ output: `Server error: ${err.message}` });
    }
});

// Function to run the compiled executable with user input
const runExecutable = (input, res) => {
    const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let error = '';

    // Ensure the input is passed only when the user provides it
    if (input) {
        runProcess.stdin.write(input + '\n');
    }
    runProcess.stdin.end(); // Close the input stream after writing

    // Capture the output and error from the C++ program
    runProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    runProcess.stderr.on('data', (data) => {
        error += data.toString();
    });

    // When execution finishes, send the output or error back to the client
    runProcess.on('close', () => {
        cleanup(); // Clean up temporary files

        if (error) {
            return res.json({ output: `Execution failed: ${error}` });
        }

        // Send the output back to the client (or a default message if no output)
        res.json({ output: output.trim() || 'No output' });
    });
};

// Clean up temporary files after execution
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

// Handle uncaught exceptions and clean up resources
process.on('uncaughtException', (err) => {
    console.error('Unhandled exception:', err);
    cleanup();
    process.exit(1);
});

// Graceful shutdown on server termination
process.on('SIGINT', () => {
    console.log('Server is shutting down...');
    cleanup();
    process.exit(0);
});
