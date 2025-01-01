const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (for testing, you can restrict it to your frontend domain)
app.use(cors()); 
app.use(express.json());

// Endpoint to handle the code compilation and execution
app.post('/', async (req, res) => {
  const { code, input } = req.body; // Extract code and input from the request body

  if (!code) {
    return res.status(400).json({ error: "No code provided!" });
  }

  // Define paths for temporary files (source code and executable)
  const sourceFile = path.join(__dirname, 'temp.cpp');
  const executable = path.join(__dirname, 'temp.exe');
  
  try {
    // Write the received code to a temporary C++ file
    fs.writeFileSync(sourceFile, code);

    // Compile the code using g++ (assuming MinGW is installed)
    const compileProcess = spawn('g++', [sourceFile, '-o', executable, '-O2']);

    // Handle the compilation process
    compileProcess.on('close', (code) => {
      if (code !== 0) {
        return res.json({ error: "Compilation failed!" });
      }

      // If compilation succeeds, run the executable with the provided input
      const runProcess = spawn(executable, [], {
        stdio: ['pipe', 'pipe', 'pipe'] // Use pipes for input/output
      });

      // Send input to the process
      if (input) {
        runProcess.stdin.write(input + '\n');
        runProcess.stdin.end();
      }

      let output = '';
      let errorOutput = '';

      // Capture output from the executable
      runProcess.stdout.on('data', (data) => output += data.toString());
      runProcess.stderr.on('data', (data) => errorOutput += data.toString());

      // Once the process finishes, send the output or error back to the client
      runProcess.on('close', (exitCode) => {
        if (exitCode === 0) {
          // Successful execution
          res.json({ output: output || "No output" });
        } else {
          // Execution error
          res.json({ error: errorOutput || "Execution failed" });
        }

        // Clean up temporary files after execution
        fs.unlinkSync(sourceFile);
        fs.unlinkSync(executable);
      });
    });

  } catch (error) {
    // Catch any other errors and return the error message to the client
    console.error('Error: ', error);
    res.status(500).json({ error: `Server Error: ${error.message}` });

    // Clean up temporary files in case of error
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
    if (fs.existsSync(executable)) fs.unlinkSync(executable);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
