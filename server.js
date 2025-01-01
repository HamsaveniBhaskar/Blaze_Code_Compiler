const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let inputRequestId = 0;  // To track input for interactive programs

// POST route to run the code
app.post("/run", (req, res) => {
  const { code, input } = req.body;

  if (!code) {
    return res.status(400).json({ output: "Error: No code provided!" });
  }

  // Write the code to a temporary file
  const sourceFile = path.join(__dirname, "temp.cpp");
  const executable = path.join(__dirname, "temp.exe");

  fs.writeFileSync(sourceFile, code);

  try {
    // Compile the code using g++
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

      // Check if the program requires interactive input (i.e., `cin`)
      if (code.includes("cin")) {
        if (input) {
          runProcess.stdin.write(input + "\n");  // Provide input if available
        } else {
          // Handle input automatically without waiting for prompts
          runProcess.stdin.write("\n");  // Write a blank line if no input is provided
        }
      }

      // Wait for the program to finish execution and then send the output
      runProcess.on("close", () => {
        setTimeout(() => {
          res.json({
            output: processOutput || "No output received!",
          });
          cleanupFiles(sourceFile, executable);  // Clean up after execution
        }, 200);
      });
    });
  } catch (error) {
    console.error("Error occurred:", error);
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
