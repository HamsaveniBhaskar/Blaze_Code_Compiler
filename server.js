const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let inputRequestId = 0;

app.post("/run", (req, res) => {
    const { code, input, inputRequestId: reqInputRequestId } = req.body;

    if (!code) {
        return res.status(400).json({ output: "Error: No code provided!" });
    }

    // Write the code to a temporary file
    const sourceFile = path.join(__dirname, "temp.cpp");
    const executable = path.join(__dirname, "temp.exe");

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
            const runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            
            let processOutput = "";
            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString();
            });

            runProcess.stderr.on("data", (data) => {
                processOutput += "Error: " + data.toString();
            });

            // If input is required, send the prompt and expect input
            if (reqInputRequestId) {
                inputRequestId++;
                return res.json({
                    inputPrompt: "Enter a positive number: ",  // Ask for input
                    inputRequestId: inputRequestId,
                });
            }

            // If input is provided, continue the program with the input
            if (input) {
                runProcess.stdin.write(input + "\n");
            }

            setTimeout(() => {
                res.json({
                    output: processOutput || "No output received!",
                });
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
