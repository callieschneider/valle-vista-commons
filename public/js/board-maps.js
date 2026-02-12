// Initialize clickable mini-map thumbnails with modal expansion
document.addEventListener('DOMContentLoaded', () => {
  const mapElements = document.querySelectorAll('.post-mini-map');
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'mapModal';
  modal.className = 'map-modal';
  modal.innerHTML = `
    <div class="map-modal-overlay"></div>
    <div class="map-modal-content">
      <button class="map-modal-close" aria-label="Close">&times;</button>
      <div id="modalMapContainer" class="modal-map-container"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const overlay = modal.querySelector('.map-modal-overlay');
  const closeBtn = modal.querySelector('.map-modal-close');
  const modalMapContainer = document.getElementById('modalMapContainer');
  
  let activeModalMap = null;
  
  // Close modal handlers
  function closeModal() {
    modal.classList.remove('show');
    if (activeModalMap) {
      activeModalMap.remove();
      activeModalMap = null;
    }
  }
  
  overlay.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
  
  // Initialize thumbnail maps
  mapElements.forEach(el => {
    const lat = parseFloat(el.dataset.lat);
    const lng = parseFloat(el.dataset.lng);
    const name = el.dataset.name;
    
    if (!lat || !lng) return;
    
    // Create static thumbnail map
    const thumbnailMap = L.map(el.id, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      attributionControl: false
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(thumbnailMap);
    
    // Add marker
    const thumbnailMarker = L.marker([lat, lng]).addTo(thumbnailMap);
    
    // Make thumbnail clickable
    el.style.cursor = 'pointer';
    el.title = 'Click to expand map';
    
    el.addEventListener('click', () => {
      // Show modal
      modal.classList.add('show');
      
      // Create full interactive map in modal
      if (activeModalMap) {
        activeModalMap.remove();
      }
      
      activeModalMap = L.map('modalMapContainer', {
        center: [lat, lng],
        zoom: 16,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        zoomControl: true,
        maxBounds: [[45.484798, -122.448344], [45.490063, -122.442604]],
        maxBoundsViscosity: 1.0,
        minZoom: 14,
        maxZoom: 19
      });
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
        maxZoom: 19
      }).addTo(activeModalMap);
      
      // Add marker with popup
      const modalMarker = L.marker([lat, lng]).addTo(activeModalMap);
      
      const popupContent = `
        <div class="map-popup-content">
          <strong>${name}</strong><br>
          <small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small><br>
          <button class="copy-address-btn" onclick="navigator.clipboard.writeText('${name}').then(() => alert('Address copied!'))">
            Copy Address
          </button>
        </div>
      `;
      
      modalMarker.bindPopup(popupContent);
      modalMarker.openPopup();
      
      // Invalidate size after modal animation
      setTimeout(() => activeModalMap.invalidateSize(), 300);
    });
  });
});
