let map;
let shipMarker;
let routeLine;
let routeHistory = [];
let isFetching = false;

// Server configuration
const SERVER_CONFIG = {
    host: window.location.hostname || 'localhost',
    port: '8001',
    get apiUrl() {
        return `http://${this.host}:${this.port}`;
    }
};

// Initialize the map
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Calculate distance between two points in nautical miles
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI/180);
}

// Get wind direction from degrees
function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// Format date to show day of week
function formatDate() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    return `Today is ${days[today.getDay()]}`;
}

// Fetch weather data
async function fetchWeatherData(lat, lng) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`);
        
        if (!response.ok) {
            console.error('Weather API error:', response.status, await response.text());
            return null;
        }
        
        const data = await response.json();
        console.log('Weather data received:', data);
        
        if (data && data.current) {
            return {
                temperature: Math.round(data.current.temperature_2m),
                windSpeed: data.current.wind_speed_10m.toFixed(1),
                windDirection: getWindDirection(data.current.wind_direction_10m)
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}

// Update ship position on the map
function updateMapPosition(lat, lng, angle) {
    if (!map) return;

    const shipIcon = L.divIcon({
        className: 'ship-marker',
        html: `
            <div class="direction-indicator">
                <div class="direction-circle"></div>
                <div class="direction-center"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    if (shipMarker) {
        shipMarker.setLatLng([lat, lng]);
        shipMarker.setIcon(shipIcon);
    } else {
        shipMarker = L.marker([lat, lng], { icon: shipIcon }).addTo(map);
    }

    // Update route history
    routeHistory.push([lat, lng]);
    if (routeHistory.length > 100) { // Keep last 100 points
        routeHistory.shift();
    }

    // Update route line
    if (routeLine) {
        map.removeLayer(routeLine);
    }
    routeLine = L.polyline(routeHistory, {
        color: '#2196F3',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 10'
    }).addTo(map);

    map.setView([lat, lng], 13);
}

async function fetchShipPosition() {
    if (isFetching) {
        console.log('Already fetching position, skipping...');
        return null;
    }

    isFetching = true;
    try {
        console.log(`Fetching ship position from ${SERVER_CONFIG.apiUrl}/ship/position...`);
        const response = await fetch(`${SERVER_CONFIG.apiUrl}/ship/position`, {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}, body:`, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received position data:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        // Update UI to show error state
        const locationDescEl = document.getElementById('location-description');
        if (locationDescEl) {
            locationDescEl.textContent = 'Error connecting to server. Retrying...';
        }
        return null;
    } finally {
        isFetching = false;
    }
}

function startShipPositionUpdates() {
    if (window.shipPositionInterval) {
        clearInterval(window.shipPositionInterval);
    }

    window.shipPositionInterval = setInterval(async () => {
        const position = await fetchShipPosition();
        if (position) {
            displayShipPosition(position);
        }
    }, 3000);
}

async function findNearestLand(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
        const data = await response.json();
        
        if (data && data.display_name) {
            // Extract just the city/region name
            const locationParts = data.display_name.split(',');
            const location = locationParts[0].trim();
            return location;
        }
        return 'Unknown Location';
    } catch (error) {
        console.error('Error finding location:', error);
        return 'Location Unknown';
    }
}

// Get weather emoji based on temperature
function getWeatherEmoji(temp) {
    if (temp >= 30) return '☀️'; // Hot
    if (temp >= 20) return '🌤️'; // Warm
    if (temp >= 10) return '⛅'; // Mild
    if (temp >= 0) return '🌥️'; // Cool
    return '❄️'; // Cold
}

// Get wind emoji based on speed
function getWindEmoji(speed) {
    if (speed >= 50) return '🌪️'; // Strong storm
    if (speed >= 30) return '💨'; // Strong wind
    if (speed >= 15) return '🌬️'; // Moderate wind
    return '🌫️'; // Light wind
}

// Get location emoji
function getLocationEmoji(location) {
    if (location.toLowerCase().includes('port')) return '⚓';
    if (location.toLowerCase().includes('island')) return '🏝️';
    if (location.toLowerCase().includes('sea')) return '🌊';
    if (location.toLowerCase().includes('bay')) return '🌅';
    return '📍';
}

function displayShipPosition(position) {
    console.log('Processing position data:', JSON.stringify(position, null, 2));
    
    let positionData;
    if (position && position.success && position.data) {
        if (position.data.success && position.data.data) {
            positionData = position.data.data;
        } else {
            positionData = position.data;
        }
    }

    if (!positionData) {
        console.error('Invalid position data structure:', position);
        const locationDescEl = document.getElementById('location-description');
        if (locationDescEl) {
            locationDescEl.textContent = 'Acquiring GPS signal...';
        }
        return;
    }

    // Extract and validate data
    let lat = parseFloat(positionData.latitude);
    let lng = parseFloat(positionData.longitude);
    let rawAngle = parseFloat(positionData.angle || 0);
    const speed = parseFloat(positionData.speed) || 0;
    const satellites = positionData.satellites || 'N/A';

    if (isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates:', { lat, lng });
        const locationDescEl = document.getElementById('location-description');
        if (locationDescEl) {
            locationDescEl.textContent = 'Acquiring GPS signal...';
        }
        return;
    }

    if (isNaN(rawAngle)) {
        rawAngle = 0;
    }

    // Calculate rotation angle
    const finalAngle = (rawAngle - 45) % 360;

    // Convert speed to knots
    const speedKnots = (speed * 0.539957).toFixed(1);

    // Update UI elements
    const locationDescEl = document.getElementById('location-description');
    if (locationDescEl) {
        // Check if we're close to land and moving slowly (likely in port)
        findNearestLand(lat, lng).then(location => {
            if (location && location !== 'Unknown Location' && location !== 'Location Unknown' && speedKnots < 1) {
                locationDescEl.textContent = `Docked at ${location}`;
            } else {
                locationDescEl.textContent = `Cruising at ${speedKnots} knots`;
            }
        });
    }

    // Update date info with day of week
    const dateInfoEl = document.getElementById('date-info');
    if (dateInfoEl) {
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dateInfoEl.textContent = `${days[now.getDay()]}, ${now.toLocaleDateString()}`;
    }

    // Fetch and update weather information
    fetchWeatherData(lat, lng).then(weatherData => {
        if (weatherData) {
            const tempEl = document.getElementById('temperature');
            const windEl = document.getElementById('wind-info');

            if (tempEl) {
                const weatherEmoji = getWeatherEmoji(weatherData.temperature);
                tempEl.textContent = `${weatherEmoji} ${weatherData.temperature}°C`;
            }
            if (windEl) {
                const windEmoji = getWindEmoji(parseFloat(weatherData.windSpeed));
                windEl.textContent = `${windEmoji} ${weatherData.windSpeed} km/h ${weatherData.windDirection}`;
            }
        }
    });

    // Find and update current location
    findNearestLand(lat, lng).then(location => {
        const currentLocationEl = document.getElementById('current-location');
        if (currentLocationEl) {
            const locationEmoji = getLocationEmoji(location);
            currentLocationEl.textContent = `${locationEmoji} ${location}`;
        }
    });

    // Update timestamp
    const now = new Date();
    if (document.getElementById('update-time')) {
        document.getElementById('update-time').textContent = now.toLocaleTimeString();
    }

    // Update map position
    updateMapPosition(lat, lng, finalAngle);
}

// Initialize the GPS tracking
async function initShipTracking() {
    try {
        console.log('Initializing ship tracking...');
        initMap();
        
        const position = await fetchShipPosition();
        if (position) {
            console.log('Initial position received:', position);
            displayShipPosition(position);
            startShipPositionUpdates();
        } else {
            console.error('Failed to get initial position');
        }
    } catch (error) {
        console.error('Initialization failed:', error);
    }
}

// Start the application
initShipTracking(); 