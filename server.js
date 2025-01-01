const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/', (req, res) => {
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
        const compileProcess = spawn('g++', [sourceFile, '-o', executable]);

        compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: 'Compilation failed!' });
            }

            try {
                // Run the compiled executable
                const runProcess = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'] });

                let output = '';
                let prompt = 'Enter a number: '; // Static prompt for now; we can dynamically change it based on the code

                // Listen for the program's output
                runProcess.stdout.on('data', (data) => {
                    output += data.toString();

                    // If the program is prompting for input, wait for user input
                    if (output.includes("Enter a number:")) {
                        // We simulate that user input will be sent back to the program
                        runProcess.stdin.write(input + '\n');
                    }
                });

                runProcess.stderr.on('data', (data) => {
                    output += data.toString();
                });

                runProcess.on('close', () => {
                    // After the program finishes, return the output to the client
                    res.json({ output: output.trim() || 'No output' });

                    // Clean up temporary files after execution
                    fs.unlinkSync(sourceFile);
                    fs.unlinkSync(executable);
                });
            } catch (err) {
                console.error("Error running the process:", err);
                res.json({ output: `Error: ${err.message}` });

                // Clean up temporary files if the run process fails
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            }
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });
        
        // Clean up temporary files in case of an error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
