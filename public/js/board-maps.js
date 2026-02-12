// Initialize mini-maps on board postcards
document.addEventListener('DOMContentLoaded', () => {
  const mapElements = document.querySelectorAll('.post-mini-map');
  
  mapElements.forEach(el => {
    const lat = parseFloat(el.dataset.lat);
    const lng = parseFloat(el.dataset.lng);
    const name = el.dataset.name;
    
    if (!lat || !lng) return;
    
    const map = L.map(el.id, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
      zoomControl: true
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
      maxZoom: 19
    }).addTo(map);
    
    // Add marker with popup
    const marker = L.marker([lat, lng]).addTo(map);
    
    const popupContent = `
      <div class="map-popup-content">
        <strong>${name}</strong><br>
        <small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small><br>
        <button class="copy-address-btn" onclick="navigator.clipboard.writeText('${name}').then(() => alert('Address copied!'))">
          Copy Address
        </button>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.openPopup();
  });
});
