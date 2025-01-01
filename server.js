const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Global variables to manage the running process
let runProcess = null;
let processOutput = ""; // Buffer for the output

/**
 * Compile and execute the C++ code
 */
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

        compileProcess.stderr.on("data", (data) => {
            console.error("Compilation Error:", data.toString());
        });

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                cleanupFiles(sourceFile, executable);
                return res.json({ output: "Compilation failed. Please check your code." });
            }

            // Run the compiled program
            runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
            processOutput = ""; // Reset output buffer

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

            // Send the initial program output to the client
            setTimeout(() => {
                res.json({
                    output: processOutput,
                    prompt: extractPrompt(processOutput),
                });
                processOutput = ""; // Clear buffer after sending
            }, 200); // Wait briefly to capture initial output
        });
    } catch (error) {
        res.json({ output: `Server error: ${error.message}` });
        cleanupFiles(sourceFile, executable);
    }
});

/**
 * Handle user input and send it to the running program
 */
app.post("/input", (req, res) => {
    const { input } = req.body;

    if (!runProcess) {
        return res.status(400).json({ output: "Error: No running process found!" });
    }

    console.log("User Input Received:", input);

    // Write the input to the running process
    runProcess.stdin.write(input.trim() + "\n");

    // Capture output after input
    setTimeout(() => {
        const output = processOutput; // Copy the output buffer
        processOutput = ""; // Clear the buffer
        res.json({ output }); // Send the output to the client
    }, 200); // Small delay to wait for program response
});

/**
 * Function to extract the prompt from the program output (e.g., "Enter a number:")
 */
function extractPrompt(output) {
    const match = output.match(/Enter .+/);
    return match ? match[0] : null;
}

/**
 * Cleanup temporary files
 */
function cleanupFiles(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
