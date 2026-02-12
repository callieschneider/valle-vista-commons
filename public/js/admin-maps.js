import { initMapPicker } from '/js/map-picker.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize maps for all edit forms when they're shown
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
      
      container.dataset.initialized = 'true';
      setTimeout(() => mapInstance.map.invalidateSize(), 100);
    });
  });

  // Same for liveEdit forms
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
      
      container.dataset.initialized = 'true';
      setTimeout(() => mapInstance.map.invalidateSize(), 100);
    });
  });
});
