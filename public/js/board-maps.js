// Fix Leaflet default marker icon (leaflet-rotate breaks default icon resolution)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom rotate control — cycles 90° CW on each click
L.Control.RotateControl = L.Control.extend({
  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    const button = L.DomUtil.create('a', 'leaflet-control-rotate-btn', container);
    button.innerHTML = '↻';
    button.href = '#';
    button.title = 'Rotate map 90° clockwise';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'Rotate map 90° clockwise');

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(button, 'click', function(e) {
      L.DomEvent.preventDefault(e);
      const currentBearing = map.getBearing();
      const newBearing = (currentBearing + 90) % 360;
      map.setBearing(newBearing);
    });

    return container;
  }
});

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
      rotate: true,
      bearing: -90,
      rotateControl: false,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      touchRotate: false,
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
        zoom: 15,
        rotate: true,
        bearing: -90,
        rotateControl: false,
        touchRotate: false,
        shiftKeyRotate: false,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        zoomControl: true,
        maxZoom: 19
      });
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
        maxZoom: 19
      }).addTo(activeModalMap);

      // Add custom rotate control to modal map
      activeModalMap.addControl(new L.Control.RotateControl({ position: 'topleft' }));
      
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
