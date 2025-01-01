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

// Handle code execution
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
        // Compile the code
        const compileProcess = spawn("g++", [sourceFile, "-o", executable]);

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                return res.json({ output: "Compilation failed!" });
            }

            // Run the compiled executable
            runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });

            let output = "";

            runProcess.stdout.on("data", (data) => {
                output += data.toString();
            });

            runProcess.stderr.on("data", (data) => {
                output += data.toString();
            });

            runProcess.on("close", () => {
                res.json({ output });
                cleanup(sourceFile, executable);
            });
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });
        cleanup(sourceFile, executable);
    }
});

// Handle user input during program execution
app.post("/input", (req, res) => {
    const { input } = req.body;

    if (runProcess) {
        runProcess.stdin.write(input + "\n"); // Send input to the running process

        let output = "";

        runProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        runProcess.stderr.on("data", (data) => {
            output += data.toString();
        });

        runProcess.on("close", () => {
            res.json({ output });
        });
    } else {
        res.status(400).json({ output: "Error: No running process found!" });
    }
});

// Cleanup temporary files
function cleanup(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
