// Map picker utility for Leaflet
// Usage: initMapPicker({ containerId, latInput, lngInput, nameInput, initialLat?, initialLng?, onPinSet?, onPinRemove? })

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_CENTER = [34.0522, -118.2437]; // Los Angeles area - adjust for Valle Vista
const DEFAULT_ZOOM = 13;

let reverseGeocodeTimeout = null;

// Reverse geocode with rate limiting (1 req/sec per Nominatim policy)
async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM_ENDPOINT}?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Valle Vista Commons Board' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (err) {
    console.error('Reverse geocode failed:', err);
    return null;
  }
}

export function initMapPicker(options) {
  const {
    containerId,
    latInput,
    lngInput,
    nameInput,
    initialLat = null,
    initialLng = null,
    onPinSet = null,
    onPinRemove = null
  } = options;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Initialize map
  const hasInitialPin = initialLat && initialLng;
  const center = hasInitialPin ? [initialLat, initialLng] : DEFAULT_CENTER;
  
  const map = L.map(containerId).setView(center, DEFAULT_ZOOM);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  let marker = null;

  // Place initial marker if coords provided
  if (hasInitialPin) {
    marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    setupMarkerDrag(marker);
  }

  // Click to drop/move pin
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      setupMarkerDrag(marker);
    }

    await updateCoordinates(lat, lng);
  });

  function setupMarkerDrag(m) {
    m.on('dragend', async (e) => {
      const { lat, lng } = e.target.getLatLng();
      await updateCoordinates(lat, lng);
    });
  }

  async function updateCoordinates(lat, lng) {
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    
    // Debounced reverse geocode
    if (reverseGeocodeTimeout) clearTimeout(reverseGeocodeTimeout);
    reverseGeocodeTimeout = setTimeout(async () => {
      const name = await reverseGeocode(lat, lng);
      if (name && nameInput) {
        nameInput.value = name;
      }
    }, 1000);

    if (onPinSet) onPinSet(lat, lng);
  }

  // Remove pin function
  function removePin() {
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
    latInput.value = '';
    lngInput.value = '';
    if (nameInput) nameInput.value = '';
    if (onPinRemove) onPinRemove();
  }

  return { map, marker, removePin };
}
