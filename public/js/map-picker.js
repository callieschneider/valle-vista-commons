// Map picker utility for Leaflet
// Usage: initMapPicker({ containerId, latInput, lngInput, nameInput, initialLat?, initialLng?, onPinSet?, onPinRemove? })

// Explicit marker icon — leaflet-rotate breaks Leaflet's default icon resolution
const PIN_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

// Valle Vista Commons defaults
const DEFAULT_CENTER = [45.487792, -122.445500]; // Valle Vista center
const DEFAULT_ZOOM = 15; // Standard neighborhood-level zoom
const MAP_BEARING = -90; // 90° counter-clockwise rotation

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

let reverseGeocodeTimeout = null;
let forwardGeocodeTimeout = null;

// Forward geocode (address → coordinates)
async function forwardGeocode(address) {
  try {
    const url = `${NOMINATIM_SEARCH_ENDPOINT}?format=json&q=${encodeURIComponent(address)}&limit=1`;
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
    rotate: true,
    bearing: MAP_BEARING,
    touchRotate: false,
    shiftKeyRotate: false,
    rotateControl: false,
    doubleClickZoom: false,
    maxZoom: 19
  }).setView(center, DEFAULT_ZOOM);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Add custom rotate control
  map.addControl(new L.Control.RotateControl({ position: 'topleft' }));

  let marker = null;

  // Place initial marker if coords provided
  if (hasInitialPin) {
    marker = L.marker([initialLat, initialLng], { draggable: true, icon: PIN_ICON }).addTo(map);
    setupMarkerDrag(marker);
  }

  // Click to drop/move pin
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { draggable: true, icon: PIN_ICON }).addTo(map);
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
    
    map.setView([result.lat, result.lng], Math.max(map.getZoom(), DEFAULT_ZOOM));
    
    if (marker) {
      marker.setLatLng([result.lat, result.lng]);
    } else {
      marker = L.marker([result.lat, result.lng], { draggable: true, icon: PIN_ICON }).addTo(map);
      setupMarkerDrag(marker);
    }
    
    await updateCoordinates(result.lat, result.lng);
  }

  return { map, marker, removePin, geocodeAndCenter };
}
