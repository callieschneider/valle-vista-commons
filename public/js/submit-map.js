import { initMapPicker } from '/js/map-picker.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('mapContainer');
  const display = document.getElementById('mapDisplay');
  const removeBtn = document.getElementById('removePin');
  const findBtn = document.getElementById('findOnMapBtn');
  const locationInput = document.getElementById('location');

  if (!container) return;

  // Initialize map immediately (always visible)
  const mapInstance = initMapPicker({
    containerId: 'mapContainer',
    latInput: document.getElementById('latitude'),
    lngInput: document.getElementById('longitude'),
    nameInput: document.getElementById('locationName'),
    onPinSet: (lat, lng) => {
      display.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    },
    onPinRemove: () => {
      display.textContent = 'Click map to drop a pin';
    }
  });
  
  // Invalidate size after map is rendered
  setTimeout(() => mapInstance.map.invalidateSize(), 100);

  // Remove pin button
  removeBtn.addEventListener('click', () => {
    if (mapInstance) {
      mapInstance.removePin();
    }
  });

  // Find on Map button (geocode and center)
  findBtn.addEventListener('click', async () => {
    const address = locationInput.value.trim();
    if (!address) {
      alert('Enter a location first');
      locationInput.focus();
      return;
    }

    findBtn.disabled = true;
    findBtn.style.opacity = '0.5';
    
    if (mapInstance && mapInstance.geocodeAndCenter) {
      await mapInstance.geocodeAndCenter(address);
    }
    
    findBtn.disabled = false;
    findBtn.style.opacity = '1';
  });
});
