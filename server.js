const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const ShipPosition = require('./models/ShipPosition');
const axios = require('axios');
const { getShipInfo } = require('./scraper');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get ship position (proxies to the API proxy)
app.get('/api/ship/position', async (req, res) => {
    try {
        console.log('Fetching position from API proxy...');
        const response = await axios.get('http://localhost:3001/api/ship/position');
        console.log('Received response from API proxy:', response.data);
        
        // Save position to database if we got valid data
        if (response.data && response.data.success && response.data.data) {
            const positionData = response.data.data.data || response.data.data;
            try {
                await ShipPosition.create({
                    latitude: positionData.latitude,
                    longitude: positionData.longitude,
                    angle: positionData.angle || '0',
                    speed: positionData.speed || '0',
                    satellites: positionData.satellites || '0',
                    timestamp: new Date()
                });
                console.log('Position saved to database');
            } catch (dbError) {
                console.error('Error saving to database:', dbError);
            }
        }

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching ship position:', error.message);
        if (error.response) {
            console.error('API proxy response:', error.response.data);
        }
        res.status(500).json({
            success: false,
            error: 'Failed to get ship position'
        });
    }
});

// API endpoint to get historical positions
app.get('/api/ship/history', async (req, res) => {
    try {
        const positions = await ShipPosition.find()
            .sort({ timestamp: -1 })
            .limit(100);
        res.json({ success: true, data: positions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint to get ship information
app.get('/api/ship/info/:shipName', async (req, res) => {
    try {
        const shipName = req.params.shipName;
        console.log('Fetching information for ship:', shipName);
        
        const shipInfo = await getShipInfo(shipName);
        res.json({ success: true, data: shipInfo });
    } catch (error) {
        console.error('Error fetching ship information:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ship information'
        });
    }
});

// Start the server
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
    console.log(`Main server running on port ${PORT}`);
}); 