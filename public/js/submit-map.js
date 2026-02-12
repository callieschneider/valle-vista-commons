import { initMapPicker } from '/js/map-picker.js';

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('mapToggle');
  const container = document.getElementById('mapContainer');
  const helper = document.getElementById('mapHelper');
  const display = document.getElementById('mapDisplay');
  const removeBtn = document.getElementById('removePin');
  const findBtn = document.getElementById('findOnMapBtn');
  const locationInput = document.getElementById('location');

  if (!toggle || !container) return;

  let mapInstance = null;

  // Open and initialize map
  function openMap() {
    if (!container.classList.contains('show')) {
      toggle.click();
    }
  }

  toggle.addEventListener('click', () => {
    const isShown = container.classList.toggle('show');
    
    if (isShown && !mapInstance) {
      // Initialize map on first open
      mapInstance = initMapPicker({
        containerId: 'mapContainer',
        latInput: document.getElementById('latitude'),
        lngInput: document.getElementById('longitude'),
        nameInput: document.getElementById('locationName'),
        onPinSet: (lat, lng) => {
          helper.style.display = 'block';
          removeBtn.style.display = 'inline';
          display.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        },
        onPinRemove: () => {
          helper.style.display = 'none';
          display.textContent = 'No location selected';
        }
      });
      
      // Invalidate size after container is visible
      setTimeout(() => mapInstance.map.invalidateSize(), 100);
    } else if (isShown && mapInstance) {
      // Re-invalidate on reopen
      setTimeout(() => mapInstance.map.invalidateSize(), 100);
    }
  });

  removeBtn.addEventListener('click', () => {
    if (mapInstance) {
      mapInstance.removePin();
    }
  });

  // Find on Map button
  findBtn.addEventListener('click', async () => {
    const address = locationInput.value.trim();
    if (!address) {
      alert('Enter a location first');
      locationInput.focus();
      return;
    }

    // Open map if not already open
    openMap();
    
    // Wait for map to initialize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (mapInstance && mapInstance.geocodeAndCenter) {
      findBtn.disabled = true;
      findBtn.textContent = 'Searching...';
      
      await mapInstance.geocodeAndCenter(address);
      
      findBtn.disabled = false;
      findBtn.textContent = '📍 Find on Map';
    }
  });
});
