const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const activeProcesses = {};

app.post("/run", (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided!" });
    }

    const sourceFile = path.join(__dirname, "temp.cpp");
    const executable = path.join(__dirname, "temp.exe");

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code using g++
        const compileProcess = spawn("g++", [sourceFile, "-o", executable, "-O2"]);

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                cleanupFiles(sourceFile, executable);
                return res.json({ output: "Compilation failed!" });
            }

            // Run the compiled executable
            const runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            const processId = Date.now().toString();
            activeProcesses[processId] = runProcess;

            let outputBuffer = "";

            runProcess.stdout.on("data", (data) => {
                outputBuffer += data.toString();

                if (outputBuffer.includes("Enter")) {
                    res.json({ output: outputBuffer.trim(), processId, waitingForInput: true });
                    outputBuffer = "";
                }
            });

            runProcess.stderr.on("data", (data) => {
                outputBuffer += data.toString();
            });

            runProcess.on("close", () => {
                delete activeProcesses[processId];
                cleanupFiles(sourceFile, executable);
            });
        });
    } catch (err) {
        res.json({ output: `Error: ${err.message}` });
        cleanupFiles(sourceFile, executable);
    }
});

app.post("/enter", (req, res) => {
    const { processId, input } = req.body;

    if (!processId || !activeProcesses[processId]) {
        return res.status(400).json({ output: "Error: Invalid process ID!" });
    }

    const runProcess = activeProcesses[processId];

    runProcess.stdin.write(input + "\n");

    let outputBuffer = "";

    runProcess.stdout.once("data", (data) => {
        outputBuffer += data.toString();

        if (outputBuffer.includes("Enter")) {
            res.json({ output: outputBuffer.trim(), waitingForInput: true });
        } else {
            res.json({ output: outputBuffer.trim(), waitingForInput: false });
        }
    });

    runProcess.stderr.once("data", (data) => {
        outputBuffer += data.toString();
        res.json({ output: outputBuffer.trim(), waitingForInput: false });
    });
});

// Helper function to clean up temporary files
function cleanupFiles(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
