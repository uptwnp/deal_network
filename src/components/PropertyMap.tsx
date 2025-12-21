import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import { Property } from '../types/property';
import { formatPrice } from '../utils/priceFormatter';
import { formatSize } from '../utils/sizeFormatter';
import { Navigation, Satellite, MapPin, Maximize, ArrowRight, LocateFixed } from 'lucide-react';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getUserLocationIcon, getPropertyTypeIcon } from '../utils/leafletIcons';
import MarkerClusterGroup from 'react-leaflet-cluster';




// Interface for focus target
export interface MapFocusPoint {
  coords: [number, number];
  zoom?: number;
  trigger?: number; // Timestamp to force updates
}

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number]; // Default center if no saved state
  onMarkerClick?: (property: Property) => void;
  focusOn?: MapFocusPoint | null; // Prop to trigger programmatic moves
}

// Component to handle map movements and persistence
function MapController({
  focusOn,
  defaultCenter
}: {
  focusOn: MapFocusPoint | null,
  defaultCenter: [number, number]
}) {
  const map = useMap();

  // Handle focus changes (programmatic moves)
  useEffect(() => {
    if (focusOn && focusOn.coords) {
      try {
        const [lat, lng] = focusOn.coords;
        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
          // Use a timeout to allow for layout changes (sidebar opening) to settle
          // and invalidate map size to ensure correct centering. 
          // 400ms covers standard CSS transitions (usually 150-300ms).
          setTimeout(() => {
            map.invalidateSize();
            map.flyTo([lat, lng], focusOn.zoom || 18, {
              animate: true,
              duration: 1.0
            });
          }, 400);
        } else {
          console.warn("Invalid coordinates for map focus:", focusOn.coords);
        }
      } catch (error) {
        console.error("Error animating map:", error);
      }
    }
  }, [focusOn, map]);

  // Handle map events (user saves)
  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      localStorage.setItem('map_view_state', JSON.stringify({
        lat: center.lat,
        lng: center.lng,
        zoom: zoom
      }));
    }
  });

  // Initial load logic
  useEffect(() => {
    // Try to load saved state
    try {
      const saved = localStorage.getItem('map_view_state');
      if (saved) {
        const { lat, lng, zoom } = JSON.parse(saved);
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(zoom)) {
          map.setView([lat, lng], zoom);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load map state", e);
    }

    // If no saved state, use default center (only on mount)
    if (map.getZoom() === undefined) {
      map.setView(defaultCenter, 13);
    }
  }, [map, defaultCenter]);

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

// Component to handle user location focus (when GPS button is clicked)
function UserLocationFocuser({ userLocation, shouldFocus }: { userLocation: [number, number] | null; shouldFocus: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation && shouldFocus) {
      // Fly to user location with a nice animation
      map.flyTo(userLocation, 16, {
        animate: true,
        duration: 1.2
      });
    }
  }, [userLocation, shouldFocus, map]);

  return null;
}

// Component to handle map size invalidation (fixes issue with map not rendering after modals close)
function MapSizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    // Create an intersection observer to detect when map becomes visible
    const container = map.getContainer();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Map is visible, invalidate size after a short delay to allow transitions
            setTimeout(() => {
              map.invalidateSize();
            }, 100);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    // Also invalidate on window resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Invalidate size periodically when map might be affected by DOM changes
    const interval = setInterval(() => {
      // Only invalidate if map container is visible
      if (container.offsetParent !== null) {
        map.invalidateSize();
      }
    }, 500);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [map]);

  return null;
}

export function PropertyMap({ properties, center = [29.3909, 76.9635], onMarkerClick, ...props }: PropertyMapProps) {
  // Load saved map view preference from localStorage, default to map view
  const [isSatelliteView, setIsSatelliteView] = useState(() => {
    const saved = localStorage.getItem('mapViewPreference');
    return saved === 'satellite';
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [shouldFocusUserLocation, setShouldFocusUserLocation] = useState(false);

  // Helper function to get coordinates for a property (location first, then landmark_location as fallback)
  // Memoized to improve performance
  const getPropertyCoords = useMemo(() => {
    return (property: Property): { coords: [number, number] | null; isLandmark: boolean } => {
      // Try exact location first
      if (property.location && property.location.includes(',')) {
        const coords = property.location.split(',').map((c) => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return { coords: [coords[0], coords[1]], isLandmark: false };
        }
      }

      // Fallback to landmark_location
      if (property.landmark_location && property.landmark_location.includes(',')) {
        const coords = property.landmark_location.split(',').map((c) => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          return { coords: [coords[0], coords[1]], isLandmark: true };
        }
      }

      return { coords: null, isLandmark: false };
    };
  }, []);

  // Filter properties that have either location or landmark_location
  // Memoized to improve performance
  const propertiesWithCoords = useMemo(() => properties.filter(
    (p) => {
      const { coords } = getPropertyCoords(p);
      return coords !== null;
    }
  ), [properties, getPropertyCoords]);

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
    setShouldFocusUserLocation(false); // Reset first

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const userPos: [number, number] = [lat, lng];
        setUserLocation(userPos);
        setIsGettingLocation(false);
        // Trigger focus after location is set
        setShouldFocusUserLocation(true);
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
        <MapController focusOn={props.focusOn || null} defaultCenter={center} />
        <UserLocationFocuser userLocation={userLocation} shouldFocus={shouldFocusUserLocation} />
        <MapSizeInvalidator />
        <TileLayerSwitcher isSatelliteView={isSatelliteView} />

        {/* Accuracy circles - rendered outside cluster group */}
        {propertiesWithCoords.map((property) => {
          const { coords, isLandmark } = getPropertyCoords(property);
          if (!coords || isLandmark) return null;
          const accuracy = property.location_accuracy ? parseFloat(property.location_accuracy) : NaN;
          const radius = !isNaN(accuracy) ? accuracy : 500;

          return (
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
          );
        })}

        {/* Property markers with clustering */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          iconCreateFunction={(cluster: any) => {

            const count = cluster.getChildCount();
            let sizeClass = 'w-10 h-10 text-sm';

            if (count > 100) {
              sizeClass = 'w-14 h-14 text-base';
            } else if (count > 10) {
              sizeClass = 'w-12 h-12 text-sm';
            }

            return L.divIcon({
              html: `<div class="${sizeClass} flex items-center justify-center bg-blue-600 text-white rounded-full border-4 border-white shadow-lg font-bold">${count}</div>`,
              className: 'custom-cluster-icon',
              iconSize: L.point(40, 40, true),
            });
          }}

        >
          {propertiesWithCoords.map((property) => {
            const { coords, isLandmark } = getPropertyCoords(property);
            if (!coords) return null;
            const markerIcon = getPropertyTypeIcon(property.type, isLandmark);

            return (
              <Marker
                key={`marker-${property.id}`}
                position={coords}
                icon={markerIcon}
              >
                <Popup>
                  <div className="w-[240px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden font-sans group">

                    {/* Hero Section: Price & Type */}
                    <div className="p-4 pb-2">
                      <div className="flex justify-between items-start mb-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {property.type}
                        </span>
                        {/* Status indicator for accuracy */}
                        <div className={`w-2 h-2 rounded-full ${isLandmark ? 'bg-orange-400' : 'bg-green-500'}`} title={isLandmark ? 'Approximate Location' : 'Exact Location'} />
                      </div>

                      <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                        {formatPrice(property.price_min, property.price_max, true)}
                      </h2>
                      <div className="flex items-center text-xs text-gray-500 mt-1 truncate">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        {property.area}, {property.city}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50 grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Size</span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <Maximize className="w-3 h-3 text-gray-400" />
                          {formatSize(property.size_min, property.size_max, property.size_unit)}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Accuracy</span>
                        <span className={`text-[11px] font-medium truncate ${isLandmark ? 'text-orange-600' : 'text-green-600'}`}>
                          {isLandmark ? 'Nearby Landmark' : `Exact (${property.location_accuracy} meter)`}
                        </span>
                      </div>
                    </div>

                    {/* Conditional Footer (Hidden by default, slides up or just sits cleaner) */}
                    {onMarkerClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkerClick(property);
                          // Close popup after clicking
                        }}
                        className="w-full py-3 bg-white hover:bg-slate-50 text-blue-600 text-xs font-bold border-t border-gray-100 transition-colors flex items-center justify-center gap-2"
                      >
                        View Full Details
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </Popup>


              </Marker>
            );
          })}
        </MarkerClusterGroup>


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
        {/* Satellite View Toggle Button - Bottom Left */}
        <button
          type="button"
          onClick={() => {
            const newView = !isSatelliteView;
            setIsSatelliteView(newView);
            // Save preference immediately
            localStorage.setItem('mapViewPreference', newView ? 'satellite' : 'map');
          }}
          className={`absolute bottom-2 left-2 pointer-events-auto flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg shadow-lg transition-colors ${isSatelliteView
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

        {/* Current Location Button - Top Right */}
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className="absolute top-2 right-2 pointer-events-auto flex items-center justify-center w-10 h-10 bg-white text-gray-700 hover:bg-gray-50 rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
          title="Get Current Location"
        >
          <LocateFixed
            className={`w-5 h-5 flex-shrink-0 ${isGettingLocation ? 'animate-spin' : ''}`}
            strokeWidth={2.5}
          />
        </button>
      </div>
    </div>
  );
}
