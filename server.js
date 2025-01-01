const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { exec } = require('child_process');

// Use JSON parser for POST request
app.use(bodyParser.json());

// Endpoint to run the code
app.post('/', (req, res) => {
    const { code, input } = req.body;

    // Save the code to a temporary file
    const fs = require('fs');
    const filename = 'temp_program.cpp';

    // Write code to a file
    fs.writeFileSync(filename, code);

    // Compile the C++ code
    exec(`g++ ${filename} -o temp_program`, (compileErr, stdout, stderr) => {
        if (compileErr || stderr) {
            return res.json({ error: { fullError: stderr || compileErr } });
        }

        // If compilation is successful, execute the compiled program with the input
        exec(`echo "${input}" | ./temp_program`, (execErr, execStdout, execStderr) => {
            if (execErr || execStderr) {
                return res.json({ error: { fullError: execStderr || execErr } });
            }

            // Send the output from the execution back to the frontend
            res.json({ output: execStdout });
        });
    });
});

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
