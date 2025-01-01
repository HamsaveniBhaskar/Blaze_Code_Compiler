const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let runProcess = null; // Store the currently running process
let processOutput = ""; // Buffer for program output

// Endpoint to compile and execute the code
app.post("/", (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided!" });
    }

    const sourceFile = path.join(__dirname, "temp.cpp");
    const executable = path.join(__dirname, "temp.exe");

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the C++ code
        const compileProcess = spawn("g++", [sourceFile, "-o", executable]);

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: "Compilation failed!" });
            }

            // Run the compiled program
            runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            processOutput = ""; // Clear the output buffer

            // Collect output from the running process
            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString();
            });

            runProcess.stderr.on("data", (data) => {
                processOutput += data.toString();
            });

            res.json({ output: "Program started...\n" + processOutput });
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });
    }
});

// Endpoint to handle user input for the running program
app.post("/input", (req, res) => {
    const { input } = req.body;

    if (!runProcess) {
        return res.status(400).json({ output: "Error: No running process found!" });
    }

    // Write the input to the running process
    runProcess.stdin.write(input + "\n");

    // Wait a small amount of time to collect the process's output
    setTimeout(() => {
        const output = processOutput; // Copy the output buffer
        processOutput = ""; // Clear the buffer
        res.json({ output }); // Send the output back to the client
    }, 200); // Small delay to wait for program output
});

// Cleanup process on server shutdown
app.post("/cleanup", (req, res) => {
    if (runProcess) {
        runProcess.kill(); // Kill the running process
        runProcess = null;
    }
    res.json({ output: "Process terminated." });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
