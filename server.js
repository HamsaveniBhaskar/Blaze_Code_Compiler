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
        // Compile the code using g++ (MinGW)
        const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-O2']);

        compileProcess.on('close', (code) => {
            if (code !== 0) {
                return res.json({ output: 'Compilation failed!' });
            }

            // Run the compiled executable
            const runProcess = spawn(executable, [], { stdio: 'pipe' });

            let output = '';

            runProcess.stdout.on('data', (data) => (output += data.toString()));
            runProcess.stderr.on('data', (data) => (output += data.toString()));

            runProcess.on('close', () => {
                res.json({ output: output || 'No output' });

                // Cleanup temporary files
                fs.unlinkSync(sourceFile);
                fs.unlinkSync(executable);
            });
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });

        // Cleanup temporary files in case of an error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
