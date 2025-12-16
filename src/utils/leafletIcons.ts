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

// Helper function to create a property type icon
const createPropertyIcon = (color: string, iconPath: string) => L.divIcon({
  className: 'custom-property-marker',
  html: `<div style="position: relative; width: 30px; height: 41px;">
    <svg width="30" height="41" viewBox="0 0 30 41" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 26 15 26s15-15.5 15-26C30 6.716 23.284 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="8" fill="white"/>
      <svg x="8" y="8" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
        ${iconPath}
      </svg>
    </svg>
  </div>`,
  iconSize: [30, 41],
  iconAnchor: [15, 41],
  popupAnchor: [0, -41]
});

// Property type specific icons with distinct colors using Lucide icons
export const propertyTypeIcons: Record<string, L.DivIcon> = {
  // Residential properties - Blue/Purple shades
  'Residential Plot': createPropertyIcon('#8b5cf6', '<path d="m12 8 6-3-6-3v10"/><path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"/><path d="m6.49 12.85 11.02 6.3"/><path d="M17.51 12.85 6.5 19.15"/>'), // LandPlot
  'Residential House': createPropertyIcon('#6366f1', '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'), // Home
  'Independent Floor': createPropertyIcon('#3b82f6', '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>'), // Building
  'Flat/Apartment': createPropertyIcon('#0ea5e9', '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'), // Building2

  // Commercial properties - Green shades
  'Commercial Plot': createPropertyIcon('#10b981', '<path d="m12 8 6-3-6-3v10"/><path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"/><path d="m6.49 12.85 11.02 6.3"/><path d="M17.51 12.85 6.5 19.15"/>'), // LandPlot
  'Shop': createPropertyIcon('#059669', '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>'), // Store
  'Showroom': createPropertyIcon('#14b8a6', '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>'), // Store
  'Commercial Builtup': createPropertyIcon('#22c55e', '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>'), // Building

  // SCO properties - Orange shades
  'SCO Plot': createPropertyIcon('#f97316', '<path d="m12 8 6-3-6-3v10"/><path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"/><path d="m6.49 12.85 11.02 6.3"/><path d="M17.51 12.85 6.5 19.15"/>'), // LandPlot
  'SCO Builtup': createPropertyIcon('#ea580c', '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>'), // Building

  // Industrial properties - Gray/Steel shades
  'Industrial Land': createPropertyIcon('#6b7280', '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>'), // Factory
  'Factory': createPropertyIcon('#4b5563', '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>'), // Factory
  'Warehouse': createPropertyIcon('#374151', '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>'), // Warehouse

  // Agricultural properties - Green/Brown shades
  'Agriculture Land': createPropertyIcon('#84cc16', '<path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L2 22l4.53-4.53a3.5 3.5 0 0 1 4.94 0L13 19l1.53-1.53"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L6 18l4.53-4.53a3.5 3.5 0 0 1 4.94 0L17 15l1.53-1.53"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L10 14l4.53-4.53a3.5 3.5 0 0 1 4.94 0L21 11l1.53-1.53"/>'), // Wheat
  'Farm House': createPropertyIcon('#65a30d', '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 8.5 11 4l2 4.5 3 3.8a1 1 0 0 1-.7 1.7H15"/><path d="M12 22v-3"/>'), // TreePine
  'Ploting Land': createPropertyIcon('#a3e635', '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="m15 14 2 2 4-4"/>'), // Grid2x2Check

  // Other properties - Purple/Pink shades
  'Labour Quarter': createPropertyIcon('#a855f7', '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'), // Home
  'Other': createPropertyIcon('#9333ea', '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'), // MapPin
};

// Function to get icon for a property type
export const getPropertyTypeIcon = (propertyType: string, isLandmark: boolean = false): L.DivIcon => {
  // If it's a landmark location, always use the landmark icon
  if (isLandmark) {
    return landmarkIcon;
  }

  // Return property-specific icon or default icon
  return propertyTypeIcons[propertyType] || defaultIcon;
};
