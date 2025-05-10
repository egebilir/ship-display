const axios = require('axios');
const cheerio = require('cheerio');

async function getShipInfo(shipName) {
    try {
        // First try vesselfinder.com
        const vesselFinderUrl = `https://www.vesselfinder.com/vessels?name=${encodeURIComponent(shipName)}`;
        console.log('Fetching from VesselFinder:', vesselFinderUrl);
        
        const response = await axios.get(vesselFinderUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        
        // Extract ship information
        const shipInfo = {
            name: shipName,
            from: {
                port: '',
                country: '',
                coordinates: {
                    lat: '',
                    lng: ''
                }
            },
            to: {
                port: '',
                country: '',
                coordinates: {
                    lat: '',
                    lng: ''
                }
            }
        };

        // Try to find the ship's current route
        $('.ship-info').each((i, element) => {
            const text = $(element).text();
            if (text.includes('From') || text.includes('To')) {
                const parts = text.split('\n').map(p => p.trim()).filter(p => p);
                
                parts.forEach(part => {
                    if (part.includes('From:')) {
                        const fromInfo = part.replace('From:', '').trim();
                        const [port, country] = fromInfo.split(',').map(s => s.trim());
                        shipInfo.from.port = port;
                        shipInfo.from.country = country;
                    }
                    if (part.includes('To:')) {
                        const toInfo = part.replace('To:', '').trim();
                        const [port, country] = toInfo.split(',').map(s => s.trim());
                        shipInfo.to.port = port;
                        shipInfo.to.country = country;
                    }
                });
            }
        });

        // If we couldn't find the information on VesselFinder, try marinetraffic.com
        if (!shipInfo.from.port || !shipInfo.to.port) {
            console.log('Trying MarineTraffic...');
            const marineTrafficUrl = `https://www.marinetraffic.com/en/ais/details/ships/shipid:${shipName}`;
            
            const mtResponse = await axios.get(marineTrafficUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $mt = cheerio.load(mtResponse.data);
            
            // Extract route information from MarineTraffic
            $mt('.port-call').each((i, element) => {
                const text = $mt(element).text();
                if (text.includes('Last Port') && !shipInfo.from.port) {
                    const portInfo = text.split('Last Port')[1].split(',');
                    shipInfo.from.port = portInfo[0].trim();
                    shipInfo.from.country = portInfo[1]?.trim() || '';
                }
                if (text.includes('Next Port') && !shipInfo.to.port) {
                    const portInfo = text.split('Next Port')[1].split(',');
                    shipInfo.to.port = portInfo[0].trim();
                    shipInfo.to.country = portInfo[1]?.trim() || '';
                }
            });
        }

        // If we have port names, try to get their coordinates
        if (shipInfo.from.port) {
            try {
                const fromCoords = await getPortCoordinates(shipInfo.from.port, shipInfo.from.country);
                shipInfo.from.coordinates = fromCoords;
            } catch (error) {
                console.error('Error getting from port coordinates:', error);
            }
        }

        if (shipInfo.to.port) {
            try {
                const toCoords = await getPortCoordinates(shipInfo.to.port, shipInfo.to.country);
                shipInfo.to.coordinates = toCoords;
            } catch (error) {
                console.error('Error getting to port coordinates:', error);
            }
        }

        return shipInfo;
    } catch (error) {
        console.error('Error fetching ship information:', error);
        throw error;
    }
}

async function getPortCoordinates(portName, country) {
    try {
        // Use OpenStreetMap Nominatim API to get port coordinates
        const searchQuery = `${portName} port ${country}`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'ShipTracker/1.0'
            }
        });

        if (response.data && response.data.length > 0) {
            return {
                lat: response.data[0].lat,
                lng: response.data[0].lon
            };
        }
        return { lat: '', lng: '' };
    } catch (error) {
        console.error('Error getting port coordinates:', error);
        return { lat: '', lng: '' };
    }
}

module.exports = { getShipInfo }; 