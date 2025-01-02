const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Utility function to clean up files
function cleanupFiles(...files) {
    files.forEach((file) => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
}

// POST endpoint to compile and execute C++ code
app.post("/", (req, res) => {
    const { code, inputs } = req.body; // inputs = array of input lines

    // Check if code is provided
    if (!code) {
        return res.status(400).json({ output: "Error: No code provided!" });
    }

    // File paths for temporary source and executable files
    const sourceFile = path.join(__dirname, "temp.cpp");
    const executable = path.join(__dirname, "temp.exe");

    // Write the code to the source file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code
        const compileProcess = spawn("g++", [sourceFile, "-o", executable]);

        let compileError = "";
        compileProcess.stderr.on("data", (data) => {
            compileError += data.toString();
        });

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                // Compilation failed
                cleanupFiles(sourceFile, executable);
                return res.json({
                    output: `Compilation Error:\n${compileError}`,
                });
            }

            // Prepare inputs as a single string (simulate stdin)
            const inputString = (inputs || []).join("\n") + "\n";

            // If compilation succeeds, execute the code
            const runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });

            let processOutput = "";
            let executionError = "";

            // Handle standard output
            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString();
            });

            // Handle standard error
            runProcess.stderr.on("data", (data) => {
                executionError += data.toString();
            });

            // Pass inputs to the program
            runProcess.stdin.write(inputString);
            runProcess.stdin.end();

            runProcess.on("close", (runCode) => {
                cleanupFiles(sourceFile, executable);

                if (runCode !== 0) {
                    // Runtime error occurred
                    return res.json({
                        output: `Runtime Error:\n${executionError || "An error occurred during execution."}`,
                    });
                }

                // Return the program output
                res.json({
                    output: processOutput || "No output received!",
                });
            });
        });
    } catch (error) {
        cleanupFiles(sourceFile, executable);
        res.json({
            output: `Server error: ${error.message}`,
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
