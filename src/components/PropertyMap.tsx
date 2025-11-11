import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { Property } from '../types/property';
import { formatPrice } from '../utils/priceFormatter';
import { formatSize } from '../utils/sizeFormatter';
import { Navigation, Satellite } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultIcon, landmarkIcon, getUserLocationIcon } from '../utils/leafletIcons';

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  onMarkerClick?: (property: Property) => void;
  ownerId?: number; // Current user's owner ID to distinguish "mine" from "others"
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Component to handle tile layer switching
function TileLayerSwitcher({ isSatelliteView }: { isSatelliteView: boolean }) {
  return isSatelliteView ? (
    <TileLayer
      key="satellite"
      attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.esri.com/en-us/legal/terms/full-master-agreement">Esri Terms of Use</a>'
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      maxZoom={19}
    />
  ) : (
    <TileLayer
      key="map"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}

export function PropertyMap({ properties, center = [29.3909, 76.9635], onMarkerClick, ownerId }: PropertyMapProps) {
  // Load saved map view preference from localStorage, default to map view
  const [isSatelliteView, setIsSatelliteView] = useState(() => {
    const saved = localStorage.getItem('mapViewPreference');
    return saved === 'satellite';
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
  // Helper function to determine if a property is owned by the current user
  // Handle both number and string comparisons (in case API returns strings)
  const isOwnedByUser = useCallback((property: Property): boolean => {
    if (ownerId === undefined || ownerId === null) {
      return false;
    }
    // Convert both to numbers for comparison to handle string/number mismatches
    const propOwnerId = typeof property.owner_id === 'string' ? parseInt(property.owner_id, 10) : property.owner_id;
    const currentOwnerId = typeof ownerId === 'string' ? parseInt(ownerId, 10) : ownerId;
    return propOwnerId === currentOwnerId && !isNaN(propOwnerId) && !isNaN(currentOwnerId);
  }, [ownerId]);
  
  // Helper function to get coordinates for a property
  // For "mine" properties: prefer exact location, fallback to landmark
  // For "others" properties: only use landmark location (never show exact location for privacy)
  const getPropertyCoords = useCallback((property: Property): { coords: [number, number] | null; isLandmark: boolean } => {
    // If ownerId is not provided, treat all properties as "others" for safety (privacy-first)
    if (ownerId === undefined || ownerId === null) {
      // Fallback: only show landmark locations if ownerId is not available
      if (property.landmark_location && property.landmark_location.includes(',')) {
        const coords = property.landmark_location.split(',').map((c) => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return { coords: [coords[0], coords[1]], isLandmark: true };
        }
      }
      return { coords: null, isLandmark: false };
    }
    
    const isOwned = isOwnedByUser(property);
    
    if (isOwned) {
      // For "mine" properties: try exact location first, then fallback to landmark
      if (property.location && property.location.includes(',')) {
        const coords = property.location.split(',').map((c) => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return { coords: [coords[0], coords[1]], isLandmark: false };
        }
      }
      
      // Fallback to landmark_location for "mine" properties
      if (property.landmark_location && property.landmark_location.includes(',')) {
        const coords = property.landmark_location.split(',').map((c) => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return { coords: [coords[0], coords[1]], isLandmark: true };
        }
      }
    } else {
      // For "others" properties: ONLY use landmark_location (never show exact location for privacy)
      if (property.landmark_location && property.landmark_location.includes(',')) {
        const coords = property.landmark_location.split(',').map((c) => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return { coords: [coords[0], coords[1]], isLandmark: true };
        }
      }
      // Don't show "others" properties if they don't have a landmark_location
      return { coords: null, isLandmark: false };
    }
    
    return { coords: null, isLandmark: false };
  }, [ownerId, isOwnedByUser]);
  
  // Filter properties that have either location or landmark_location
  const propertiesWithCoords = useMemo(() => {
    return properties.filter((p) => {
      const { coords } = getPropertyCoords(p);
      return coords !== null;
    });
  }, [properties, getPropertyCoords]);
  
  // Create user location icon (memoized to avoid recreating on each render)
  const userIcon = useMemo(() => getUserLocationIcon(), []);

  // Update map center when center prop changes
  useEffect(() => {
    setMapCenter(center);
  }, [center]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const userPos: [number, number] = [lat, lng];
        setUserLocation(userPos);
        setMapCenter(userPos);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = 'Failed to get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="h-full w-full relative z-[8]">
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="h-full w-full rounded-lg"
        scrollWheelZoom={true}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <MapUpdater center={mapCenter} />
        <TileLayerSwitcher isSatelliteView={isSatelliteView} />
        {propertiesWithCoords.flatMap((property) => {
          const { coords, isLandmark } = getPropertyCoords(property);
          if (!coords) return [];
          
          const radius = property.location_accuracy ? parseFloat(property.location_accuracy) || 500 : 500;
          const markerIcon = isLandmark ? landmarkIcon : defaultIcon; // Use default icon for exact location, landmark icon for landmark
          
          return [
            // Location Accuracy Radius Circle (only for exact locations)
            !isLandmark && (
              <Circle
                key={`circle-${property.id}`}
                center={coords}
                radius={radius}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 2,
                  opacity: 0.5,
                }}
              />
            ),
            <Marker 
              key={`marker-${property.id}`}
              position={coords}
              icon={markerIcon}
            >
              <Popup>
                <div className="p-1.5">
                  <h3 className="font-semibold text-xs mb-0.5">{property.type}</h3>
                  <p className="text-xs text-gray-600 mb-1">
                    {property.area}, {property.city}
                  </p>
                  <p className="text-xs font-medium text-blue-600 mb-0.5">
                    {formatPrice(property.price_min, property.price_max, true)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatSize(property.min_size, property.size_max, property.size_unit)}
                  </p>
                  {isLandmark ? (
                    <>
                      <p className="text-xs text-orange-600 mt-0.5 font-medium">
                        Landmark Location (Approximate)
                      </p>
                      {property.landmark_location && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {property.landmark_location}
                        </p>
                      )}
                      {property.landmark_location_distance && (
                        <p className="text-xs text-blue-600 mt-0.5">
                          Distance: {property.landmark_location_distance}m
                        </p>
                      )}
                    </>
                  ) : (
                    property.location_accuracy && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Accuracy: {property.location_accuracy}m
                      </p>
                    )
                  )}
                  {onMarkerClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkerClick(property);
                      }}
                      className="mt-1.5 w-full px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ].filter(Boolean); // Remove any null/undefined elements
        })}
        
        {/* User Location Marker */}
        {userLocation && (
          <Marker 
            key={`user-location-${userLocation[0]}-${userLocation[1]}`}
            position={userLocation}
            icon={userIcon}
            zIndexOffset={1000}
            riseOnHover={true}
          >
            <Popup>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-sm">Your Location</h3>
                </div>
                <p className="text-xs text-gray-500">
                  {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Control Buttons Container */}
      <div className="absolute inset-0 pointer-events-none z-[2000]" style={{ zIndex: 2000 }}>
        {/* Satellite View Toggle Button - Top Right */}
        <button
          type="button"
          onClick={() => {
            const newView = !isSatelliteView;
            setIsSatelliteView(newView);
            // Save preference immediately
            localStorage.setItem('mapViewPreference', newView ? 'satellite' : 'map');
          }}
          className={`absolute top-2 right-2 pointer-events-auto flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg shadow-lg transition-colors ${
            isSatelliteView
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
          title={isSatelliteView ? 'Switch to Map View' : 'Switch to Satellite View'}
        >
          <Satellite 
            className="w-4 h-4 flex-shrink-0" 
            strokeWidth={2.5}
          />
          <span className="hidden sm:inline">{isSatelliteView ? 'Satellite' : 'Map'}</span>
        </button>

        {/* Current Location Button - Bottom Right */}
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="absolute bottom-2 right-2 pointer-events-auto flex items-center justify-center w-10 h-10 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
          title="Get Current Location"
        >
          <Navigation 
            className={`w-5 h-5 flex-shrink-0 ${isGettingLocation ? 'animate-spin' : ''}`} 
            strokeWidth={2.5}
          />
        </button>
      </div>
    </div>
  );
}
