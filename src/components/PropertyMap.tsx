import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { Property } from '../types/property';
import { formatPrice } from '../utils/priceFormatter';
import { Navigation, Satellite } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  onMarkerClick?: (property: Property) => void;
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

export function PropertyMap({ properties, center = [29.3909, 76.9635], onMarkerClick }: PropertyMapProps) {
  // Load saved map view preference from localStorage, default to map view
  const [isSatelliteView, setIsSatelliteView] = useState(() => {
    const saved = localStorage.getItem('mapViewPreference');
    return saved === 'satellite';
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const propertiesWithCoords = properties.filter(
    (p) => p.location && p.location.includes(',')
  );

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
        setMapCenter([lat, lng]);
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
          const coords = property.location.split(',').map((c) => parseFloat(c.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            const radius = property.location_accuracy ? parseFloat(property.location_accuracy) || 500 : 500;
            return [
              // Location Accuracy Radius Circle
              <Circle
                key={`circle-${property.id}`}
                center={[coords[0], coords[1]]}
                radius={radius}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 2,
                  opacity: 0.5,
                }}
              />,
              <Marker 
                key={`marker-${property.id}`}
                position={[coords[0], coords[1]]}
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
                      {property.min_size}-{property.size_max} {property.size_unit}
                    </p>
                    {property.location_accuracy && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Accuracy: {property.location_accuracy}m
                      </p>
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
            ];
          }
          return [];
        })}
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
