import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch'; // Import fetch for API requests
import cors from 'cors'; // Import CORS

const app = express();

// Enable CORS for all origins (or specify allowed origins)
app.use(cors());

// Middleware to parse incoming JSON request bodies
app.use(bodyParser.json());

// POST endpoint to execute C++ code
app.post('/run', async (req, res) => {
    const { code, input } = req.body; // Extract code and input from the request

    const payload = {
        client_id: 'a541184058b69e0ad3f768b4b0a66db2590bc5193fdf.api.hackerearth.com', // HackerEarth Client ID
        client_secret: '7b09b380c9e085844b56ef67e59a4ceb2f45e70e', // HackerEarth Client Secret Key
        script: code, // The C++ code to execute
        stdin: input, // Input to the code
        lang: 'CPP14', // Specify C++ as the language (using C++14 for compatibility)
        time_limit: 5, // Time limit for execution in seconds
        memory_limit: 262144, // Memory limit in KB (256 MB)
    };

    try {
        // Sending request to HackerEarth API to execute the code
        const response = await fetch('https://api.hackerearth.com/v4/partner/code-evaluation/submissions/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // If the response from HackerEarth API is not ok, throw an error
        if (!response.ok) {
            const errorMessage = `HackerEarth API error: ${response.statusText}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        const data = await response.json();
        res.json(data); // Send the output back to the frontend
    } catch (error) {
        // Log error details and send a 500 response to the frontend
        console.error('Backend Error:', error);
        res.status(500).json({ error: 'Error executing code. Try again later.' });
    }
});

// Use a dynamic port if available, otherwise default to 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
