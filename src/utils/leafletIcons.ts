import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with webpack/vite
// This ensures the default marker icons are properly configured
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

// Remove the problematic _getIconUrl method if it exists
if ((L.Icon.Default.prototype as any)._getIconUrl) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
}

// Configure default icon options
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Create a default icon instance that can be reused
export const defaultIcon = new L.Icon.Default();

// Create a custom landmark icon
export const landmarkIcon = L.divIcon({
  className: 'custom-landmark-marker',
  html: `<div style="position: relative; width: 30px; height: 41px; opacity: 0.8;">
    <svg width="30" height="41" viewBox="0 0 30 41" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 26 15 26s15-15.5 15-26C30 6.716 23.284 0 15 0z" fill="#2563eb"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
      <svg x="9" y="9" width="12" height="12" viewBox="0 0 24 24" fill="#2563eb" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    </svg>
  </div>`,
  iconSize: [30, 41],
  iconAnchor: [15, 41],
  popupAnchor: [0, -41]
});

// Create a user location icon
export const getUserLocationIcon = () => L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #3b82f6;
    border: 5px solid white;
    box-shadow: 0 3px 10px rgba(0,0,0,0.4);
    position: relative;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: white;
    "></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Create an exact location icon (custom blue marker)
export const exactLocationIcon = L.divIcon({
  className: 'custom-exact-marker',
  html: `<div style="position: relative; width: 25px; height: 41px;">
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.75 12.5 21.667 12.5 21.667S25 21.25 25 12.5C25 5.596 19.404 0 12.5 0z" fill="#3b82f6"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white"/>
    </svg>
  </div>`,
  iconSize: [25, 41],
  iconAnchor: [12.5, 41],
  popupAnchor: [0, -41]
});

// Create a private/exact location icon with lock (green)
export const privateLocationIcon = L.divIcon({
  className: 'custom-private-marker',
  html: `<div style="position: relative; width: 30px; height: 41px;">
    <svg width="30" height="41" viewBox="0 0 30 41" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 26 15 26s15-15.5 15-26C30 6.716 23.284 0 15 0z" fill="#16a34a"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
      <svg x="9" y="9" width="12" height="12" viewBox="0 0 24 24" fill="#16a34a" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
    </svg>
  </div>`,
  iconSize: [30, 41],
  iconAnchor: [15, 41],
  popupAnchor: [0, -41]
});

