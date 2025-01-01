const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Temporary files for code execution
const sourceFile = path.join(__dirname, "temp.cpp");
const executable = path.join(__dirname, "temp.exe");

app.post("/", (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided!" });
    }

    // Write the C++ code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Step 1: Compile the C++ code
        const compileProcess = spawn("g++", [sourceFile, "-o", executable]);

        compileProcess.stderr.on("data", (data) => {
            res.json({ output: `Compilation Error: ${data.toString()}` });
        });

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                cleanupFiles();
                return;
            }

            // Step 2: Run the compiled executable
            const runProcess = spawn(executable);

            // Handle the real-time interaction with `cin` (user input)
            let outputData = "";

            // Collect `stdout` data (program output)
            runProcess.stdout.on("data", (data) => {
                outputData += data.toString();
                res.write(JSON.stringify({ output: outputData }));
            });

            // Collect `stderr` data (error messages)
            runProcess.stderr.on("data", (data) => {
                outputData += `Error: ${data.toString()}`;
                res.write(JSON.stringify({ output: outputData }));
            });

            // Pass the user-provided input to the program's `stdin`
            if (input) {
                runProcess.stdin.write(input + "\n");
                runProcess.stdin.end();
            }

            // When the program finishes, send the final output
            runProcess.on("close", () => {
                cleanupFiles();
                res.end();
            });
        });
    } catch (error) {
        res.json({ output: `Server error: ${error.message}` });
        cleanupFiles();
    }
});

// Cleanup temporary files
function cleanupFiles() {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
