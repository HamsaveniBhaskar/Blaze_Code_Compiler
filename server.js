const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let runProcess = null;
let processOutput = "";
let waitingForInput = false;

// Handle the source code compilation and execution
app.post("/", (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided!" });
    }

    const sourceFile = path.join(__dirname, "temp.cpp");
    const executable = path.join(__dirname, "temp.exe");

    fs.writeFileSync(sourceFile, code);

    try {
        const compileProcess = spawn("g++", [sourceFile, "-o", executable]);

        compileProcess.stderr.on("data", (data) => {
            console.error("Compilation Error:", data.toString());
        });

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                cleanupFiles(sourceFile, executable);
                return res.json({ output: "Compilation failed. Please check your code." });
            }

            runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            processOutput = "";
            waitingForInput = false;

            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString();
                if (waitingForInput) {
                    return res.json({ output: processOutput });
                }
            });

            runProcess.stderr.on("data", (data) => {
                processOutput += "Error: " + data.toString();
            });

            runProcess.on("close", () => {
                cleanupFiles(sourceFile, executable);
                waitingForInput = false;
            });

            // Send initial response
            res.json({ output: processOutput });
        });
    } catch (error) {
        res.json({ output: `Server error: ${error.message}` });
        cleanupFiles(sourceFile, executable);
    }
});

// Handle user input during execution
app.post("/input", (req, res) => {
    const { input } = req.body;

    if (!runProcess) {
        return res.status(400).json({ output: "Error: No running process found!" });
    }

    // Send input to the running process
    runProcess.stdin.write(input + "\n");
    waitingForInput = false;

    setTimeout(() => {
        res.json({ output: processOutput });
        processOutput = ""; // Clear process output for the next interaction
    }, 200); 
});

// Cleanup temporary files
function cleanupFiles(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
