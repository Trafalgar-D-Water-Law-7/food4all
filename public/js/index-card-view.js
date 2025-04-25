const toggleBtn = document.getElementById('toggleCardView');
const cardContainer = document.getElementById('cardViewContainer');
const cardList = document.getElementById('card-list');

toggleBtn.addEventListener('click', () => {
  cardContainer.classList.toggle('d-none');
  toggleBtn.textContent = cardContainer.classList.contains('d-none')
    ? 'Show in Card Format'
    : 'Hide Card Format';
});

// You can reuse the sortedDonations list from your existing script
navigator.geolocation.getCurrentPosition(position => {
  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;

  const sortedDonations = donations
    .filter(d => d.status === 'claim')
    .map(d => ({
      ...d,
      distance: getDistanceKm(userLat, userLon, d.latitude, d.longitude)
    }))
    .sort((a, b) => a.distance - b.distance);

  sortedDonations.forEach(d => {
    const { _id, subject, message, distance, expiryTime, photos, latitude, longitude } = d;
    const foodDetailsUrl = `/food/${_id}`;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${latitude},${longitude}&travelmode=driving`;
    const timeLeft = getTimeLeft(expiryTime);
    const imageUrl = photos?.[0] || 'https://via.placeholder.com/300x150?text=No+Image';

    const card = document.createElement('div');
    card.className = 'col-md-4 col-sm-6';
    card.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${imageUrl}" class="card-img-top" style="height: 160px; object-fit: cover;" alt="${subject}">
        <div class="card-body">
          <h6 class="card-title">${subject}</h6>
          <p class="card-text small">${message || 'No message provided.'}</p>
          <p class="mb-1 text-muted small">⏳ ${timeLeft}</p>
          <p class="mb-1 text-muted small">📍 ${distance} km away</p>
          <div class="d-flex gap-2">
            <a href="${foodDetailsUrl}" class="btn btn-sm btn-success w-50" target="_blank">Details</a>
            <a href="${directionsUrl}" class="btn btn-sm btn-outline-primary w-50" target="_blank">Directions</a>
          </div>
        </div>
      </div>
    `;
    cardList.appendChild(card);
  });
});