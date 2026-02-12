import { initMapPicker } from '/js/map-picker.js';

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('mapToggle');
  const container = document.getElementById('mapContainer');
  const helper = document.getElementById('mapHelper');
  const display = document.getElementById('mapDisplay');
  const removeBtn = document.getElementById('removePin');

  if (!toggle || !container) return;

  let mapInstance = null;

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
});
