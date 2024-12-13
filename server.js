import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();

// Use the PORT environment variable or default to 3000 for local development
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/run', async (req, res) => {
    const { code, input } = req.body;

    const payload = {
        script: code,
        stdin: input,
        language: 'cpp',
        versionIndex: '4',
        clientId: '55cb4c52637421b614ede04cb699621c',
        clientSecret: 'f5bbd5c65222f1848c47c4febc99948c113fabcbfe8d4d2214345567aad681f9',
    };

    try {
        const response = await fetch('https://api.jdoodle.com/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Error executing code. Try again later.' });
    }
});

app.use(express.static('C:/Users/hamsa/Music/Blaze Code Compilers'));

// Dynamically bind to the port
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
