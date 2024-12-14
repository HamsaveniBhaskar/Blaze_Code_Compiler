const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');  // For generating unique hashes of code

const app = express();
const PORT = 3000;

// Middleware to parse JSON data
app.use(express.json());

// Use in-memory cache to store the compiled binaries
const compiledBinaries = {};

// POST route to compile and execute the code
app.post('/', (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    // Generate a unique hash for the given code
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const executable = path.join(__dirname, `${codeHash}.exe`);

    // If the binary is already compiled, skip compilation
    if (compiledBinaries[codeHash]) {
        return executeBinary(executable, input, res);
    }

    // Otherwise, compile the code and store the binary in memory
    const sourceFile = path.join(__dirname, 'temp.cpp');
    fs.writeFileSync(sourceFile, code);

    // Compile the code with quotes around paths
    exec(`g++ "${sourceFile}" -o "${executable}"`, (err, stdout, stderr) => {
        if (err) {
            return res.json({ output: `Compilation Error:\n${stderr}` });
        }

        // Cache the compiled binary
        compiledBinaries[codeHash] = executable;
        executeBinary(executable, input, res);
    });
});

// Function to execute the compiled binary
function executeBinary(executable, input, res) {
    const runCommand = input ? `echo ${input} | "${executable}"` : `"${executable}"`;

    exec(runCommand, (runErr, runStdout, runStderr) => {
        if (runErr) {
            return res.json({ output: `Runtime Error:\n${runStderr}` });
        }
        res.json({ output: runStdout || 'No output' });
    });
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
