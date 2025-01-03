const { parentPort, workerData } = require("worker_threads");
const { execFileSync, spawnSync } = require("child_process");
const path = require("path");
const os = require("os");

// Utility function to clean up temporary files
function cleanupFiles(...files) {
    files.forEach((file) => {
        try {
            require("fs").unlinkSync(file);
        } catch (err) {
            // Ignore errors
        }
    });
}

// Worker logic
(async () => {
    const { code, input } = workerData;

    // Paths for temporary source file and executable
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.exe`);

    try {
        // Write the code to the source file
        require("fs").writeFileSync(sourceFile, code);

        // Compile the code using Clang
        const clangPath = "clang"; // Default Linux path for Clang
        const compileProcess = spawnSync(clangPath, [sourceFile, "-o", executable], {
            encoding: "utf-8",
        });


        if (compileProcess.error || compileProcess.stderr) {
            cleanupFiles(sourceFile, executable);
            const error = compileProcess.stderr || compileProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${error}` },
            });
        }

        // Execute the compiled binary
        const runProcess = spawnSync(executable, [], {
            input,
            encoding: "utf-8",
        });

        cleanupFiles(sourceFile, executable);

        if (runProcess.error || runProcess.stderr) {
            const error = runProcess.stderr || runProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${error}` },
            });
        }

        // Send the output back to the main thread
        return parentPort.postMessage({
            output: runProcess.stdout || "No output received!",
        });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        return parentPort.postMessage({
            error: { fullError: `Server error: ${err.message}` },
        });
    }
})();
