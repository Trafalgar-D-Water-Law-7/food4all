const map = L.map('map').setView([27.7, 85.3], 13); // Default center (Kathmandu-ish)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2); // Return the distance in kilometers
}

function getTimeLeft(expiryTime) {
  const now = new Date();
  const expiry = new Date(expiryTime);
  const diffMs = expiry - now;

  if (diffMs <= 0) return "Expired";

  const mins = Math.floor((diffMs / 1000 / 60) % 60);
  const hrs = Math.floor(diffMs / 1000 / 60 / 60);

  return `Expires in ${hrs}h ${mins}m`;
}

// Get user's current location
navigator.geolocation.getCurrentPosition(position => {
  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;

  // Set map view to the user's location
  map.setView([userLat, userLon], 14);

  donations.forEach(donation => {
    if (donation.status !== 'claim') return;

    const { latitude, longitude, subject, message, expiryTime } = donation;
    const distance = getDistanceKm(userLat, userLon, latitude, longitude);
    const timeLeft = getTimeLeft(expiryTime);
    
    const marker = L.marker([latitude, longitude]).addTo(map);

    marker.bindTooltip(`${subject} (${distance} km)`, {
      permanent: false,
      direction: 'top'
    });

    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${latitude},${longitude}&travelmode=driving`;
    const foodDetailsUrl = `/food/${donation._id}`;

    marker.bindPopup(`
      <div class="popup-card">
        <h4>${subject}</h4>
        ${message ? `<p><strong>Note:</strong> ${message}</p>` : ''}
        <p><strong>Distance:</strong> ${distance} km</p>
        <p><strong>${timeLeft}</strong></p>
        
        <a href="${foodDetailsUrl}" class="details-btn" target="_blank">🍽️ Food Details</a>
        <a href="${directionsUrl}" class="directions-btn" target="_blank">🧭 Get Directions</a>
      </div>
    `);
  });

}, error => {
  console.error("Geolocation error:", error);
  alert("Unable to access your location. Please enable location services.");
}, {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
});