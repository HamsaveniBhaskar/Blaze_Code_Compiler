const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let runProcess = null; // Store the running process
let processOutput = ""; // Buffer for program output

// Endpoint to compile and start the program
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

            // Listen for output from the program
            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString(); // Append the output to the buffer
            });

            runProcess.stderr.on("data", (data) => {
                processOutput += data.toString(); // Append error output to the buffer
            });

            // Send the initial output back to the client
            setTimeout(() => {
                res.json({ output: processOutput }); // Send the initial output
                processOutput = ""; // Clear the buffer after sending
            }, 200); // Delay to collect initial output
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });
    }
});

// Endpoint to handle user input
app.post("/input", (req, res) => {
    const { input } = req.body;

    if (!runProcess) {
        return res.status(400).json({ output: "Error: No running process found!" });
    }

    // Write the input to the running process
    runProcess.stdin.write(input.trim() + "\n");

    // Collect the output after input
    setTimeout(() => {
        const output = processOutput; // Copy the current output
        processOutput = ""; // Clear the buffer
        res.json({ output }); // Send the output to the client
    }, 200); // Delay to wait for the program's response
});

// Cleanup temporary files
function cleanup(sourceFile, executable) {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
}

// Endpoint to terminate the process (optional)
app.post("/cleanup", (req, res) => {
    if (runProcess) {
        runProcess.kill(); // Kill the running process
        runProcess = null;
    }
    res.json({ output: "Process terminated." });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
