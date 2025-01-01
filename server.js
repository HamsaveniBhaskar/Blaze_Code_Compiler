            runProcess.on('close', (runCode) => {
                // Finalize the response when the program finishes execution
                if (runCode === 0) {
                    output += "\n=== Code Execution Successful ===";
                    res.end(`${output}`);
                } else {
                    res.end("Error: Program execution failed!");
                }

                // Cleanup temporary files
                if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            });

            // Handle user inputs
            req.on('data', (data) => {
                // Send user input to the program's stdin
                runProcess.stdin.write(data.toString() + '\n');
            });

            req.on('end', () => {
                // End the stdin stream when input is finished
                runProcess.stdin.end();
            });
        });
    } catch (error) {
        res.json({ output: `Error: ${error.message}` });

        // Cleanup temporary files in case of an error
        if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
        if (fs.existsSync(executable)) fs.unlinkSync(executable);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
