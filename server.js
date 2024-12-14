const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');  // For hashing the code

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Cache to store compiled executables
const compiledBinaries = {};

// POST endpoint to compile and run C++ code
app.post('/', (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    // Generate a unique hash for the code
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const executable = path.join(__dirname, `${codeHash}.exe`);

    // Check if the binary is already compiled
    if (compiledBinaries[codeHash]) {
        return executeBinary(executable, input, res);
    }

    // Compile the code if not already compiled
    const sourceFile = path.join(__dirname, 'temp.cpp');
    fs.writeFileSync(sourceFile, code);

    // Compile using g++ with optimized execution
    execFile('g++', [sourceFile, '-o', executable], (err, stdout, stderr) => {
        if (err) {
            return res.json({ output: `Compilation Error:\n${stderr || stdout}` });
        }

        // Store the compiled executable in cache
        compiledBinaries[codeHash] = executable;
        executeBinary(executable, input, res);
    });
});

// Helper function to execute compiled binary
function executeBinary(executable, input, res) {
    // Run the compiled executable with input redirection if provided
    const runCommand = input ? `echo ${input} | "${executable}"` : `"${executable}"`;

    execFile(runCommand, (err, stdout, stderr) => {
        if (err) {
            return res.json({ output: `Runtime Error:\n${stderr || stdout}` });
        }
        res.json({ output: stdout || 'No output' });
    });
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
