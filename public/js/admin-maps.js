import { initMapPicker } from '/js/map-picker.js';

document.addEventListener('DOMContentLoaded', () => {
  // Track initialized map instances
  const mapInstances = {};

  // Initialize maps for pending edit forms
  document.querySelectorAll('[id^="edit-"]').forEach(editSection => {
    editSection.addEventListener('shown.bs.collapse', () => {
      const idx = editSection.id.replace('edit-', '');
      const containerId = `adminMap-p${idx}`;
      const container = document.getElementById(containerId);
      
      if (!container || container.dataset.initialized) return;
      
      const latInput = document.getElementById(`adminLat-p${idx}`);
      const lngInput = document.getElementById(`adminLng-p${idx}`);
      const nameInput = document.getElementById(`adminName-p${idx}`);
      const display = document.getElementById(`coordDisplay-p${idx}`);
      const removeBtn = document.getElementById(`removeMapPin-p${idx}`);
      
      const initialLat = latInput.value ? parseFloat(latInput.value) : null;
      const initialLng = lngInput.value ? parseFloat(lngInput.value) : null;
      
      const mapInstance = initMapPicker({
        containerId,
        latInput,
        lngInput,
        nameInput,
        initialLat,
        initialLng,
        onPinSet: (lat, lng) => {
          display.innerHTML = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        },
        onPinRemove: () => {
          display.textContent = 'Click map to drop a pin';
        }
      });
      
      removeBtn.addEventListener('click', () => {
        mapInstance.removePin();
      });
      
      mapInstances[`p${idx}`] = mapInstance;
      container.dataset.initialized = 'true';
      setTimeout(() => mapInstance.map.invalidateSize(), 100);
    });
  });

  // Same for live edit forms
  document.querySelectorAll('[id^="liveEdit-"]').forEach(editSection => {
    editSection.addEventListener('shown.bs.collapse', () => {
      const idx = editSection.id.replace('liveEdit-', '');
      const containerId = `adminMap-l${idx}`;
      const container = document.getElementById(containerId);
      
      if (!container || container.dataset.initialized) return;
      
      const latInput = document.getElementById(`adminLat-l${idx}`);
      const lngInput = document.getElementById(`adminLng-l${idx}`);
      const nameInput = document.getElementById(`adminName-l${idx}`);
      const display = document.getElementById(`coordDisplay-l${idx}`);
      const removeBtn = document.getElementById(`removeMapPin-l${idx}`);
      
      const initialLat = latInput.value ? parseFloat(latInput.value) : null;
      const initialLng = lngInput.value ? parseFloat(lngInput.value) : null;
      
      const mapInstance = initMapPicker({
        containerId,
        latInput,
        lngInput,
        nameInput,
        initialLat,
        initialLng,
        onPinSet: (lat, lng) => {
          display.innerHTML = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        },
        onPinRemove: () => {
          display.textContent = 'Click map to drop a pin';
        }
      });
      
      removeBtn.addEventListener('click', () => {
        mapInstance.removePin();
      });
      
      mapInstances[`l${idx}`] = mapInstance;
      container.dataset.initialized = 'true';
      setTimeout(() => mapInstance.map.invalidateSize(), 100);
    });
  });

  // Pin button handlers (geocode and center)
  document.querySelectorAll('.map-pin-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.target; // e.g., "p0" or "l3"
      const mapInstance = mapInstances[target];
      
      if (!mapInstance) return;
      
      // Find the location input in the same form
      const form = btn.closest('form');
      const locationInput = form.querySelector('input[name="location"]');
      const address = locationInput?.value.trim();
      
      if (!address) {
        alert('Enter a location first');
        locationInput?.focus();
        return;
      }
      
      btn.disabled = true;
      btn.style.opacity = '0.5';
      
      if (mapInstance.geocodeAndCenter) {
        await mapInstance.geocodeAndCenter(address);
      }
      
      btn.disabled = false;
      btn.style.opacity = '1';
    });
  });
});
