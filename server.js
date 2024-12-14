import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();

// Enable CORS for all origins (or specify allowed origins)
app.use(cors());

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// POST endpoint to execute C++ code
app.post('/run', async (req, res) => {
    const { code, input } = req.body; // Extract code and input from the request

    const payload = {
        client_id: '9a4ad25166a556295e35a98005992a34be7ca789b9f4.api.hackerearth.com', // HackerEarth Client ID
        client_secret: '19b9a4ac7f22af170ad74461e87feb999aace545', // HackerEarth Client Secret Key
        script: code, // The C++ code to execute
        stdin: input, // Input for the code
        lang: 'CPP17', // Specify C++17 as the language (if CPP is causing issues)
        time_limit: 5, // Execution time limit in seconds
        memory_limit: 262144, // Memory limit in KB (256 MB)
    };

    try {
        // Make a POST request to HackerEarth API
        const response = await fetch('https://api.hackerearth.com/v4/partner/code-evaluation/submissions/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-secret': '19b9a4ac7f22af170ad74461e87feb999aace545'  // Ensure the secret is in the header as well
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
        res.json(data); // Send the output from the HackerEarth API back to the frontend
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
