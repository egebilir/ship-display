const mongoose = require('mongoose');
const ShipPosition = require('./models/ShipPosition');

async function initDB() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/ship_tracker', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await ShipPosition.deleteMany({});
        console.log('Cleared existing data');

        // Insert test data
        const testData = {
            latitude: '37.5665',
            longitude: '126.9780',
            angle: '45',
            speed: '10',
            satellites: '8',
            timestamp: new Date()
        };

        await ShipPosition.create(testData);
        console.log('Inserted test data');

        // Verify the data
        const positions = await ShipPosition.find();
        console.log('Current positions in database:', positions);

        console.log('Database initialization complete');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initDB(); 