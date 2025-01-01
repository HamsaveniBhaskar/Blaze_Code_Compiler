const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const path = require('path');

const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Serve static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

// Route to compile and run the C++ code
app.post('/', (req, res) => {
    const { code, input } = req.body;

    // Step 1: Create a temporary C++ file
    const fs = require('fs');
    const cppFile = path.join(__dirname, 'temp.cpp');

    // Write the received C++ code to the file
    fs.writeFileSync(cppFile, code);

    // Step 2: Compile the C++ code
    exec(`g++ ${cppFile} -o ${path.join(__dirname, 'a.out')}`, (err, stdout, stderr) => {
        if (err) {
            // Compilation error, return error message
            return res.status(400).json({
                error: {
                    message: stderr || 'Compilation error occurred',
                    fullError: stderr,
                }
            });
        }

        // Step 3: Run the compiled C++ program with input
        exec(`echo "${input}" | ./a.out`, (runErr, runStdout, runStderr) => {
            if (runErr) {
                // Runtime error, return error message
                return res.status(400).json({
                    error: {
                        message: runStderr || 'Runtime error occurred',
                        fullError: runStderr,
                    }
                });
            }

            // Successfully ran the code, send back the output
            res.json({ output: runStdout });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
