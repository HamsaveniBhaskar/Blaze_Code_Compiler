const express = require("express");
const bodyParser = require("body-parser");
const { Worker } = require("worker_threads");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware for JSON parsing
app.use(bodyParser.json());

// In-memory cache to store compiled results
const cache = new Map();

// POST endpoint for code compilation and execution
app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Validate input
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // Generate a unique hash for the code
    const codeHash = crypto.createHash("md5").update(code).digest("hex");

    // Check if result is cached
    if (cache.has(codeHash)) {
        return res.json({ output: cache.get(codeHash) });
    }

    // Create a worker thread for compilation
    const worker = new Worker("./compiler-worker.js", {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
        // Cache the result and send the response
        if (result.output) {
            cache.set(codeHash, result.output);
        }
        res.json(result);
    });

    worker.on("error", (err) => {
        res.status(500).json({ error: { fullError: `Worker error: ${err.message}` } });
    });

    worker.on("exit", (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        }
    });
});

// Keep the server "warm" by pinging it every 5 minutes
setInterval(() => {
    const http = require("http");
    http.get(`http://localhost:${port}`, () => {});
}, 300000); // Ping every 5 minutes

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
