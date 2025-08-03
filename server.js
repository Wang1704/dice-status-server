const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Store the current dice status
let currentStatus = {
    removedColors: [],
    lastUpdated: null
};

// Serve the status page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/status.html');
});

// Get current status
app.get('/api/status', (req, res) => {
    res.json(currentStatus);
});

// Update status (called by the extension)
app.post('/api/update', (req, res) => {
    const { removedColors } = req.body;
    currentStatus = {
        removedColors: removedColors || [],
        lastUpdated: new Date().toISOString()
    };
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Dice status server running on port ${port}`);
    console.log(`Access the status page at: https://your-app-name.railway.app`);
}); 