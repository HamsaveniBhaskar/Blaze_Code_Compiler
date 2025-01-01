const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Store active processes by processId
let activeProcesses = {};

// Route for compiling and running the C++ code
app.post("/run", (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ output: "Error: No code provided!" });

    const sourceFile = path.join(__dirname, "temp.cpp");
    const executable = path.join(__dirname, "temp.exe");

    // Write the code to a temporary file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code using g++
        const compileProcess = spawn("g++", [sourceFile, "-o", executable, "-O2"]);

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) return res.json({ output: "Compilation failed!" });

            // Run the compiled executable
            const runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            const processId = Date.now().toString(); // Unique process ID
            activeProcesses[processId] = runProcess;

            let outputBuffer = "";

            // Listen to output from the C++ program
            runProcess.stdout.on("data", (data) => {
                outputBuffer += data.toString();

                // Send the output once the first prompt (for input) is found
                if (outputBuffer.includes("Enter")) {
                    res.json({
                        output: outputBuffer,
                        waitingForInput: true,
                        processId
                    });
                    outputBuffer = ""; // Reset buffer after sending response
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
        // Only send one response if error occurs
        if (!res.headersSent) {
            res.json({ output: `Error: ${err.message}` });
        }
        cleanupFiles(sourceFile, executable);
    }
});

// Route for handling user input after running the program
app.post("/enter", (req, res) => {
    const { processId, input } = req.body;

    // Ensure the process ID is valid
    if (!processId || !activeProcesses[processId]) {
        return res.status(400).json({ output: "Error: Invalid process ID!" });
    }

    const runProcess = activeProcesses[processId];
    runProcess.stdin.write(input + "\n");

    let outputBuffer = "";

    runProcess.stdout.once("data", (data) => {
        outputBuffer += data.toString();
        if (outputBuffer.includes("Enter")) {
            // Send the output with another prompt if required
            if (!res.headersSent) {
                res.json({ output: outputBuffer, waitingForInput: true });
            }
        } else {
            // Send final output once the program completes
            if (!res.headersSent) {
                res.json({ output: outputBuffer, waitingForInput: false });
            }
        }
    });

    runProcess.stderr.once("data", (data) => {
        outputBuffer += data.toString();
        if (!res.headersSent) {
            res.json({ output: outputBuffer, waitingForInput: false });
        }
    });
});

// Cleanup temporary files
function cleanupFiles(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
