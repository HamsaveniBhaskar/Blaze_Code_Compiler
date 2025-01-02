const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public")); // Serve frontend files

wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        const { type, code, input } = JSON.parse(message);

        if (type === "execute") {
            const sourceFile = path.join(__dirname, "temp.cpp");
            const executable = path.join(__dirname, "temp.exe");

            // Write the code to a temporary file
            fs.writeFileSync(sourceFile, code);

            // Compile the program
            const compile = spawn("g++", [sourceFile, "-o", executable]);

            compile.stderr.on("data", (data) => {
                ws.send(JSON.stringify({ type: "error", output: data.toString() }));
            });

            compile.on("close", (compileCode) => {
                if (compileCode !== 0) {
                    ws.send(JSON.stringify({ type: "error", output: "Compilation failed!" }));
                    return;
                }

                // Run the compiled program
                const run = spawn(executable);

                run.stdout.on("data", (data) => {
                    ws.send(JSON.stringify({ type: "output", output: data.toString() }));
                });

                run.stderr.on("data", (data) => {
                    ws.send(JSON.stringify({ type: "error", output: data.toString() }));
                });

                run.on("close", () => {
                    ws.send(JSON.stringify({ type: "done" }));
                });

                ws.on("message", (inputMessage) => {
                    const { type, input } = JSON.parse(inputMessage);
                    if (type === "input") {
                        run.stdin.write(input + "\n");
                    }
                });
            });
        }
    });
});

// Start the server
server.listen(3000, () => {
    console.log("WebSocket server running on ws://localhost:3000");
});
