import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch'; // For making API requests
import cors from 'cors'; // To handle cross-origin requests

const app = express();

// Enable CORS for all origins (or specify allowed origins)
app.use(cors());

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// POST endpoint to execute C++17 code
app.post('/run', async (req, res) => {
    const { code, input } = req.body; // Extract code and input from the request

    const payload = {
        client_id: 'a541184058b69e0ad3f768b4b0a66db2590bc5193fdf.api.hackerearth.com', // HackerEarth Client ID
        client_secret: '7b09b380c9e085844b56ef67e59a4ceb2f45e70e', // HackerEarth Client Secret Key
        script: code, // The C++17 code to execute
        stdin: input, // Input for the code
        lang: 'CPP17', // Specify C++17 as the language
        time_limit: 5, // Execution time limit in seconds
        memory_limit: 262144, // Memory limit in KB (256 MB)
    };

    try {
        // Make a POST request to HackerEarth API to execute code
        const response = await fetch('https://api.hackerearth.com/v4/partner/code-evaluation/submissions/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-secret': '7b09b380c9e085844b56ef67e59a4ceb2f45e70e', // Client secret for auth
            },
            body: JSON.stringify(payload), // Send the payload as JSON
        });

        // Check if the response from the API is successful
        if (!response.ok) {
            const errorMessage = `HackerEarth API error: ${response.statusText}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const he_id = data.he_id; // Get the unique he_id for the request
        
        // Now fetch the status using the he_id
        const statusResponse = await fetch(`https://api.hackerearth.com/v4/partner/code-evaluation/submissions/${he_id}/`, {
            method: 'GET',
            headers: {
                'client-secret': '7b09b380c9e085844b56ef67e59a4ceb2f45e70e', // Client secret for auth
            },
        });

        // Check if the status response is successful
        if (!statusResponse.ok) {
            const errorMessage = `HackerEarth status API error: ${statusResponse.statusText}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        const statusData = await statusResponse.json();
        res.json(statusData); // Send the status response back to the frontend
    } catch (error) {
        // Log error details and send a 500 response to the frontend
        console.error('Backend Error:', error);
        res.status(500).json({ error: 'Error executing C++ code. Try again later.' });
    }
});

// Use a dynamic port if available, otherwise default to 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
