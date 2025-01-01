const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Global variables for managing process state
let runProcess = null;
let processOutput = ""; // Buffer to capture program output

// Compile and execute the C++ code
app.post("/", (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided!" });
    }

    const sourceFile = path.join(__dirname, "temp.cpp");
    const executable = path.join(__dirname, "temp.exe");

    // Write the source code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code
        const compileProcess = spawn("g++", [sourceFile, "-o", executable]);

        compileProcess.stderr.on("data", (data) => {
            console.error("Compilation Error:", data.toString());
        });

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                cleanupFiles(sourceFile, executable);
                return res.json({ output: "Compilation failed. Please check your code." });
            }

            // Execute the compiled program
            runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            processOutput = ""; // Reset the output buffer

            // Capture program output
            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString();
            });

            // Capture program errors
            runProcess.stderr.on("data", (data) => {
                processOutput += "Error: " + data.toString();
            });

            // Handle program exit
            runProcess.on("close", (exitCode) => {
                console.log("Program terminated with code:", exitCode);
                cleanupFiles(sourceFile, executable);
            });

            // Handle input if provided
            if (input) {
                runProcess.stdin.write(input.trim() + "\n"); // Send the input from the frontend to the process
            }

            setTimeout(() => {
                res.json({
                    output: processOutput || "No output received!",
                });
                processOutput = ""; // Clear the output buffer
            }, 200);
        });
    } catch (error) {
        res.json({ output: `Server error: ${error.message}` });
        cleanupFiles(sourceFile, executable);
    }
});

// Cleanup temporary files
function cleanupFiles(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
