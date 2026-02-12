// Map picker utility for Leaflet
// Usage: initMapPicker({ containerId, latInput, lngInput, nameInput, initialLat?, initialLng?, onPinSet?, onPinRemove? })

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

// Valle Vista Commons specific bounds
const DEFAULT_CENTER = [45.487792, -122.445500]; // Valle Vista center
const DEFAULT_ZOOM = 16;
const MAP_BOUNDS = [
  [45.484798, -122.448344], // Southwest corner (bottom-left)
  [45.490063, -122.442604]  // Northeast corner (top-right)
];

let reverseGeocodeTimeout = null;
let forwardGeocodeTimeout = null;

// Forward geocode (address → coordinates)
async function forwardGeocode(address) {
  try {
    const url = `${NOMINATIM_SEARCH_ENDPOINT}?format=json&q=${encodeURIComponent(address)}&limit=1&bounded=1&viewbox=-122.448344,45.490063,-122.442604,45.484798`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Valle Vista Commons Board' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      name: data[0].display_name
    };
  } catch (err) {
    console.error('Forward geocode failed:', err);
    return null;
  }
}

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
  
  const map = L.map(containerId, {
    maxBounds: MAP_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 14,
    maxZoom: 19
  }).setView(center, DEFAULT_ZOOM);
  
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

  // Geocode and center on address
  async function geocodeAndCenter(address) {
    if (!address || address.trim() === '') return;
    
    const result = await forwardGeocode(address);
    if (!result) {
      alert('Could not find that location. Try a nearby street or landmark.');
      return;
    }
    
    map.setView([result.lat, result.lng], DEFAULT_ZOOM);
    
    if (marker) {
      marker.setLatLng([result.lat, result.lng]);
    } else {
      marker = L.marker([result.lat, result.lng], { draggable: true }).addTo(map);
      setupMarkerDrag(marker);
    }
    
    await updateCoordinates(result.lat, result.lng);
  }

  return { map, marker, removePin, geocodeAndCenter };
}
