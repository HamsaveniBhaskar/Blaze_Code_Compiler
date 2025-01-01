const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Global variables for managing input prompt and interaction
let inputRequestId = 0;

app.post("/", (req, res) => {
    const { code, input, inputRequestId } = req.body;

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
            const runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            
            // Handle output of the program
            let processOutput = "";
            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString();
            });

            runProcess.stderr.on("data", (data) => {
                processOutput += "Error: " + data.toString();
            });

            runProcess.on("close", (exitCode) => {
                console.log("Program terminated with code:", exitCode);
                cleanupFiles(sourceFile, executable);
            });

            // If the program requests input, we will return that
            if (inputRequestId && input) {
                runProcess.stdin.write(input + "\n");
            } else if (inputRequestId) {
                // If there's no input, request the user for input in the frontend
                inputRequestId++;
                return res.json({
                    inputPrompt: "Enter a Number: ",  // Prompt asking for input
                    inputRequestId: inputRequestId,
                });
            }

            // Return the output of the program
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
