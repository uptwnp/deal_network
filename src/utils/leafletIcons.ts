import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with webpack/vite
// This ensures the default marker icons are properly configured
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

// Remove the problematic _getIconUrl method if it exists
if ((L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl) {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
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
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background-color: #2563eb;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20]
});

// Create a user location icon
export const getUserLocationIcon = () => L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: #4285F4;
    border: 2px solid white;
    box-shadow: 0 0 0 6px rgba(66, 133, 244, 0.2), 0 1px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9]
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
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background-color: ${color};
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transition: transform 0.2s ease;
  ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      ${iconPath}
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20]
});

const R2_ICONS_BASE = 'https://pub-9e00030e294c40efa96642db5ba7f437.r2.dev/assets/icons';

// Mapping of property types to their standardized R2 icon filenames
const propertyTypeToFileMap: Record<string, string> = {
  'House': 'house.svg',
  'Villa': 'house.svg',
  'House / Villa': 'house.svg',
  'Farm House': 'house.svg',
  'Residential Plot': 'plot.svg',
  'Plot': 'plot.svg',
  'Farm Land': 'plot.svg',
  'Commercial Plot': 'plot.svg',
  'Industrial Plot': 'plot.svg',
  'Indus. Plot': 'plot.svg',
  'Flat': 'flat.svg',
  'Floor': 'flat.svg',
  'Penthouse': 'flat.svg',
  'Flat / Apt': 'flat.svg',
  'Labour Quarter': 'flat.svg',
  'Agriculture Land': 'agriculture.svg',
  'Commercial': 'commercial.svg',
  'Shop': 'commercial.svg',
  'Showroom': 'commercial.svg',
  'Shop / Showroom': 'commercial.svg',
  'Office': 'commercial.svg',
  'Commercial Built-up': 'commercial.svg',
  'Hotel': 'commercial.svg',
  'PG': 'commercial.svg',
  'Hotel / PG / Qtr': 'commercial.svg',
  'Warehouse': 'industrial.svg',
  'Factory': 'industrial.svg',
  'Whouse / Factory': 'industrial.svg',
  'Industrial Built-up': 'industrial.svg',
  'Other': 'other.svg'
};

// Helper function to get the R2 icon URL for a property type
export const getPropertyIconUrl = (type: string): string => {
  const filename = propertyTypeToFileMap[type] || 'other.svg';
  return `${R2_ICONS_BASE}/${filename}`;
};

// Create the exportable icons object from definitions
export const propertyTypeIcons: Record<string, L.Icon> = Object.keys(propertyTypeToFileMap).reduce((acc, type) => {
  acc[type] = L.icon({
    iconUrl: getPropertyIconUrl(type),
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    className: 'custom-property-marker'
  });
  return acc;
}, {} as Record<string, L.Icon>);

// Function to get icon for a property type
export const getPropertyTypeIcon = (propertyType: string, isLandmark: boolean = false): L.Icon | L.DivIcon => {
  const icon = propertyTypeIcons[propertyType];
  if (icon) return icon;
  return isLandmark ? landmarkIcon : defaultIcon;
};

// Also export definitions for components that need colors (like the PropertyCard)
export const propertyTypeDefinitions: Record<string, { color: string; url: string }> = {
  'Agriculture Land': { color: '#2E7D32', url: getPropertyIconUrl('Agriculture Land') },
  'Farm Land': { color: '#2E7D32', url: getPropertyIconUrl('Farm Land') },
  'Residential Plot': { color: '#2E7D32', url: getPropertyIconUrl('Residential Plot') },
  'Plot': { color: '#2E7D32', url: getPropertyIconUrl('Plot') },
  'House': { color: '#F57C00', url: getPropertyIconUrl('House') },
  'Villa': { color: '#F57C00', url: getPropertyIconUrl('Villa') },
  'House / Villa': { color: '#F57C00', url: getPropertyIconUrl('House / Villa') },
  'Floor': { color: '#7B1FA2', url: getPropertyIconUrl('Floor') },
  'Flat': { color: '#7B1FA2', url: getPropertyIconUrl('Flat') },
  'Penthouse': { color: '#7B1FA2', url: getPropertyIconUrl('Penthouse') },
  'Flat / Apt': { color: '#7B1FA2', url: getPropertyIconUrl('Flat / Apt') },
  'Farm House': { color: '#F57C00', url: getPropertyIconUrl('Farm House') },
  'Labour Quarter': { color: '#7B1FA2', url: getPropertyIconUrl('Labour Quarter') },
  'Hotel': { color: '#1976D2', url: getPropertyIconUrl('Hotel') },
  'PG': { color: '#7B1FA2', url: getPropertyIconUrl('PG') },
  'Hotel / PG / Qtr': { color: '#1976D2', url: getPropertyIconUrl('Hotel / PG / Qtr') },
  'Commercial Plot': { color: '#1976D2', url: getPropertyIconUrl('Commercial Plot') },
  'Shop': { color: '#1976D2', url: getPropertyIconUrl('Shop') },
  'Showroom': { color: '#1976D2', url: getPropertyIconUrl('Showroom') },
  'Shop / Showroom': { color: '#1976D2', url: getPropertyIconUrl('Shop / Showroom') },
  'Office': { color: '#1976D2', url: getPropertyIconUrl('Office') },
  'Commercial Built-up': { color: '#1976D2', url: getPropertyIconUrl('Commercial Built-up') },
  'Industrial Plot': { color: '#424242', url: getPropertyIconUrl('Industrial Plot') },
  'Indus. Plot': { color: '#424242', url: getPropertyIconUrl('Indus. Plot') },
  'Warehouse': { color: '#424242', url: getPropertyIconUrl('Warehouse') },
  'Factory': { color: '#424242', url: getPropertyIconUrl('Factory') },
  'Whouse / Factory': { color: '#424242', url: getPropertyIconUrl('Whouse / Factory') },
  'Industrial Built-up': { color: '#424242', url: getPropertyIconUrl('Industrial Built-up') },
  'Other': { color: '#9ca3af', url: getPropertyIconUrl('Other') },
};

