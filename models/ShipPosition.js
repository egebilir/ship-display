const mongoose = require('mongoose');

const shipPositionSchema = new mongoose.Schema({
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
        required: true
    },
    angle: {
        type: String,
        required: true
    },
    speed: {
        type: String,
        required: true
    },
    satellites: {
        type: String,
        required: true
    },
    route: {
        from: {
            port: String,
            country: String,
            coordinates: {
                lat: String,
                lng: String
            }
        },
        to: {
            port: String,
            country: String,
            coordinates: {
                lat: String,
                lng: String
            }
        },
        estimatedArrival: Date
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ShipPosition', shipPositionSchema); 