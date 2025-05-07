// utils/ipLocation.js
const axios = require('axios');

async function getLocationFromIP(ip) {
    try {
        // Fallback for localhost or private IPs
        if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168')) {
            return {
                latitude: 0,  // Default to 0, 0 for localhost
                longitude: 0, // Default to 0, 0 for localhost
                city: 'Localhost',
                country: 'Development Machine'
            };
        }

        const response = await axios.get(`https://ipapi.co/${ip}/json/`);
        const { city, country_name: country, latitude, longitude } = response.data;

        return { latitude, longitude, city, country };
    } catch (err) {
        console.error("🌍 IP Location Fetch Error:", err.message);
        return {
            latitude: 0,   // Default to 0, 0 on error
            longitude: 0,  // Default to 0, 0 on error
            city: 'Unknown',
            country: 'Unknown'
        };
    }
}

module.exports = { getLocationFromIP };
