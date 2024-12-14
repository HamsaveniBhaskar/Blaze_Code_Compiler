const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const execPromise = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
};

app.post('/', async (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: 'Error: No code provided!' });
    }

    const sourceFile = path.join(__dirname, 'temp.cpp');
    const executable = path.join(__dirname, 'temp.exe');
    const outputFile = path.join(__dirname, 'output.txt');

    fs.writeFileSync(sourceFile, code);

    try {
        // Compile with optimization and architecture-specific flags
        const compileResult = await execPromise(`g++ "${sourceFile}" -o "${executable}" -O3 -Ofast -march=native -g0`);
        if (compileResult.error) {
            return res.json({ output: `Compilation Error:\n${compileResult.stderr}` });
        }

        // Execute the compiled program
        const runCommand = input ? `echo "${input}" | "${executable}" > "${outputFile}"` : `"${executable}" > "${outputFile}"`;
        const runResult = await execPromise(runCommand);

        const output = fs.readFileSync(outputFile, 'utf8');
        res.json({ output: output || 'No output' });
    } catch (error) {
        res.json({ output: `Error: ${error.stderr || error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
