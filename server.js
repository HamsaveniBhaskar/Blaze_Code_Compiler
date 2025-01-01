const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let runProcess = null; // Store the running process
let isWaitingForInput = false; // Flag to check if process is waiting for input
let processOutput = ""; // Store accumulated process output

// POST endpoint to compile and run code
app.post("/run", (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: "No code provided!" });
    }

    const sourceFile = path.join(__dirname, "program.cpp");
    const executableFile = path.join(__dirname, "program.exe");

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    // Compile the C++ code
    const compileProcess = spawn("g++", [sourceFile, "-o", executableFile]);

    compileProcess.stderr.on("data", (data) => {
        console.error("Compilation error:", data.toString());
    });

    compileProcess.on("close", (compileCode) => {
        if (compileCode !== 0) {
            cleanupFiles(sourceFile, executableFile);
            return res.json({ output: "Compilation failed. Check your code for errors." });
        }

        // Run the compiled executable
        runProcess = spawn(executableFile, [], { stdio: ["pipe", "pipe", "pipe"] });
        isWaitingForInput = false;
        processOutput = "";

        runProcess.stdout.on("data", (data) => {
            processOutput += data.toString();
            if (isWaitingForInput) return;
            res.json({ output: processOutput });
        });

        runProcess.stderr.on("data", (data) => {
            processOutput += "Error: " + data.toString();
        });

        runProcess.on("close", () => {
            cleanupFiles(sourceFile, executableFile);
            runProcess = null;
        });
    });
});

// POST endpoint to handle user input
app.post("/input", (req, res) => {
    const { input } = req.body;

    if (!runProcess || !isWaitingForInput) {
        return res.status(400).json({ error: "No process is waiting for input." });
    }

    // Send the user input to the process
    runProcess.stdin.write(input + "\n");
    isWaitingForInput = false;

    // Send updated output back to the client
    setTimeout(() => {
        res.json({ output: processOutput });
    }, 100);
});

// Cleanup temporary files
function cleanupFiles(sourceFile, executableFile) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executableFile)) fs.unlinkSync(executableFile);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
