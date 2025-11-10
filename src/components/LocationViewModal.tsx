import { useState, useEffect, useMemo } from 'react';
import { X, Lock, Globe, Navigation, Satellite, Map as MapIcon } from 'lucide-react';
import { Property } from '../types/property';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationViewModalProps {
  propertyLocation: { lat: number; lng: number };
  property: Property;
  onClose: () => void;
  onOpenInGoogleMaps: () => void;
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

// Component to update map bounds to show property, landmark, and user location
function MapBoundsUpdater({ propertyLocation, landmarkLocation, userLocation, hasUserLocation, isInitialLoad, shouldUpdateBounds }: { propertyLocation: [number, number]; landmarkLocation: [number, number] | null; userLocation: [number, number] | null; hasUserLocation: boolean; isInitialLoad: boolean; shouldUpdateBounds: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    const invalidateSize = () => {
      try {
        map.invalidateSize();
      } catch (e) {
        console.log('Map invalidateSize error:', e);
      }
    };

    invalidateSize();
    
    const timers = [
      setTimeout(invalidateSize, 100),
      setTimeout(invalidateSize, 300),
      setTimeout(invalidateSize, 500),
    ];
    
    if (isInitialLoad || shouldUpdateBounds) {
      const updateBounds = () => {
        try {
          const locationsToFit: [number, number][] = [propertyLocation];
          
          if (landmarkLocation) {
            locationsToFit.push(landmarkLocation);
          }
          
          if (hasUserLocation && userLocation) {
            locationsToFit.push(userLocation);
          }
          
          if (locationsToFit.length > 1) {
            const bounds = L.latLngBounds(locationsToFit);
            map.fitBounds(bounds, { padding: [50, 50] });
          } else {
            map.setView(propertyLocation, 15);
          }
          invalidateSize();
        } catch (e) {
          console.log('Map bounds update error:', e);
        }
      };
      
      setTimeout(updateBounds, isInitialLoad ? 400 : 100);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [propertyLocation, landmarkLocation, userLocation, hasUserLocation, isInitialLoad, shouldUpdateBounds, map]);
  
  return null;
}

// Component to ensure user location marker is visible
function UserLocationMarkerUpdater({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      console.log('UserLocationMarkerUpdater: userLocation set, invalidating map');
      // Force map to redraw markers
      setTimeout(() => {
        map.invalidateSize();
        // Try to pan slightly to force redraw
        const currentCenter = map.getCenter();
        map.setView(currentCenter, map.getZoom());
      }, 200);
    }
  }, [userLocation, map]);
  
  return null;
}

export function LocationViewModal({ propertyLocation, property, onClose, onOpenInGoogleMaps }: LocationViewModalProps) {
  const landmarkLocationCoords = (() => {
    if (!property.landmark_location) return null;
    const hasCoords = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(property.landmark_location.trim());
    if (hasCoords) {
      const parts = property.landmark_location.split(',').map(c => parseFloat(c.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]] as [number, number];
      }
    }
    return null;
  })();

  const [isSatelliteView, setIsSatelliteView] = useState(() => {
    const saved = localStorage.getItem('mapViewPreference');
    return saved === 'satellite';
  });
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldUpdateBounds, setShouldUpdateBounds] = useState(false);
  
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
        console.log('GPS location received:', lat, lng);
        setUserLocation([lat, lng]);
        setIsGettingLocation(false);
        setIsInitialLoad(false);
        setShouldUpdateBounds(true);
        
        // Reset the flag after a short delay
        setTimeout(() => {
          setShouldUpdateBounds(false);
        }, 500);
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
  
  const mapCenter: [number, number] = (() => {
    if (landmarkLocationCoords) {
      return [
        (propertyLocation.lat + landmarkLocationCoords[0]) / 2,
        (propertyLocation.lng + landmarkLocationCoords[1]) / 2
      ];
    }
    if (userLocation) {
      return [
        (propertyLocation.lat + userLocation[0]) / 2,
        (propertyLocation.lng + userLocation[1]) / 2
      ];
    }
    return [propertyLocation.lat, propertyLocation.lng];
  })();

  useEffect(() => {
    localStorage.setItem('mapViewPreference', isSatelliteView ? 'satellite' : 'map');
  }, [isSatelliteView]);

  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const mapElements = document.querySelectorAll('.leaflet-container');
      mapElements.forEach((element) => {
        const leafletElement = element as any;
        if (leafletElement._leaflet_id) {
          const allMaps = (L as any).map._instances || {};
          const mapInstance = Object.values(allMaps).find((map: any) => 
            map.getContainer() === element
          ) as any;
          if (mapInstance) {
            mapInstance.invalidateSize();
          }
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      setIsGettingLocation(false);
      setIsInitialLoad(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsGettingLocation(false);
    }, 2000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log('Auto GPS location received:', lat, lng);
        setUserLocation([lat, lng]);
        setIsGettingLocation(false);
        setShouldUpdateBounds(true);
        setTimeout(() => {
          setIsInitialLoad(false);
          setShouldUpdateBounds(false);
        }, 500);
      },
      (error) => {
        clearTimeout(timeoutId);
        setIsGettingLocation(false);
        setIsInitialLoad(false);
        console.log('Could not get user location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => clearTimeout(timeoutId);
  }, []);

  const exactLocationIcon = L.divIcon({
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

  const landmarkLocationIcon = L.divIcon({
    className: 'custom-landmark-marker',
    html: `<div style="position: relative; width: 30px; height: 41px; opacity: 0.7;">
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

  // Create user icon - make it more visible
  const userIcon = useMemo(() => {
    return L.divIcon({
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
  }, []);
  
  // Debug: Log when userLocation changes and invalidate map
  useEffect(() => {
    if (userLocation) {
      console.log('User location state updated:', userLocation);
      // Force map to update when marker is added
      setTimeout(() => {
        const mapElement = document.querySelector('.leaflet-container') as any;
        if (mapElement && mapElement._leaflet_id) {
          const mapInstance = (window as any).L?.maps?.[mapElement._leaflet_id];
          if (mapInstance) {
            mapInstance.invalidateSize();
          }
        }
      }, 100);
    }
  }, [userLocation]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl mobile-modal-content sm:max-h-[90vh] h-[90vh] sm:h-auto overflow-hidden flex flex-col animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Property Location
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden" style={{ minHeight: '400px' }}>
          <div className="w-full h-full relative" style={{ height: '100%', minHeight: '400px' }}>
            {isGettingLocation && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Getting your location...</p>
                </div>
              </div>
            )}
            
            <MapContainer
              center={mapCenter}
              zoom={userLocation ? 13 : 15}
              className="h-full w-full"
              scrollWheelZoom={true}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, height: '100%', width: '100%' }}
            >
                <MapBoundsUpdater 
                  propertyLocation={[propertyLocation.lat, propertyLocation.lng]} 
                  landmarkLocation={landmarkLocationCoords}
                  userLocation={userLocation}
                  hasUserLocation={!!userLocation}
                  isInitialLoad={isInitialLoad}
                  shouldUpdateBounds={shouldUpdateBounds}
                />
                <UserLocationMarkerUpdater userLocation={userLocation} />
                <TileLayerSwitcher isSatelliteView={isSatelliteView} />
                
                {landmarkLocationCoords && (
                  <Polyline
                    positions={[[propertyLocation.lat, propertyLocation.lng], landmarkLocationCoords]}
                    pathOptions={{
                      color: '#3b82f6',
                      weight: 2,
                      opacity: 0.6,
                      dashArray: '10, 5',
                    }}
                  />
                )}
                
                {property.location_accuracy && (
                  <Circle
                    center={[propertyLocation.lat, propertyLocation.lng]}
                    radius={parseFloat(property.location_accuracy) || 500}
                    pathOptions={{
                      color: '#22c55e',
                      fillColor: '#22c55e',
                      fillOpacity: 0.1,
                      weight: 2,
                      opacity: 0.5,
                    }}
                  />
                )}
                
                <Marker 
                  position={[propertyLocation.lat, propertyLocation.lng]}
                  icon={exactLocationIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-4 h-4 text-green-700" />
                        <h3 className="font-semibold text-sm">Exact Location (Private)</h3>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {property.area}, {property.city}
                      </p>
                      <p className="text-xs text-gray-500">
                        {propertyLocation.lat.toFixed(6)}, {propertyLocation.lng.toFixed(6)}
                      </p>
                      {property.location_accuracy && (
                        <p className="text-xs text-green-700 mt-1">
                          Accuracy: {property.location_accuracy}m
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {landmarkLocationCoords && (
                  <Marker 
                    position={landmarkLocationCoords}
                    icon={landmarkLocationIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <h3 className="font-semibold text-sm">Landmark Location (Public)</h3>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {property.area}, {property.city}
                        </p>
                        <p className="text-xs text-gray-500">
                          {landmarkLocationCoords[0].toFixed(6)}, {landmarkLocationCoords[1].toFixed(6)}
                        </p>
                        {property.landmark_location_distance && (
                          <p className="text-xs text-blue-600 mt-1">
                            Distance: {property.landmark_location_distance}m
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {userLocation && (
                  <Marker 
                    key={`user-location-${userLocation[0]}-${userLocation[1]}`}
                    position={userLocation}
                    icon={userIcon}
                    zIndexOffset={1000}
                    riseOnHover={true}
                    eventHandlers={{
                      add: (e) => {
                        console.log('User location marker added to map at:', userLocation);
                        // Force the marker to be visible
                        const marker = e.target;
                        if (marker && marker.getElement) {
                          const element = marker.getElement();
                          if (element) {
                            element.style.zIndex = '1000';
                            element.style.position = 'relative';
                          }
                        }
                      },
                      click: () => {
                        console.log('User location marker clicked');
                      }
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-sm mb-1">Your Location</h3>
                        <p className="text-xs text-gray-500">
                          {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}
            </MapContainer>
            
            <div className="absolute inset-0 pointer-events-none z-[10]" style={{ pointerEvents: 'none' }}>
              {/* Satellite View Toggle Button - Top Right */}
              <button
                type="button"
                onClick={() => {
                  const newView = !isSatelliteView;
                  setIsSatelliteView(newView);
                  localStorage.setItem('mapViewPreference', newView ? 'satellite' : 'map');
                  setTimeout(() => {
                    const mapElement = document.querySelector('.leaflet-container') as any;
                    if (mapElement && mapElement._leaflet_id) {
                      const mapInstance = (window as any).L?.maps?.[mapElement._leaflet_id];
                      if (mapInstance) {
                        mapInstance.invalidateSize();
                      }
                    }
                  }, 100);
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
              
              {/* GPS/Current Location Button - Bottom Right */}
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
        </div>

        <div className="border-t border-gray-200 p-4 sm:p-6 bg-white space-y-2">
          <button
            onClick={onOpenInGoogleMaps}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-2 bg-red-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg"
          >
            <Navigation className="w-5 h-5" />
            Navigate to Location
          </button>
          {landmarkLocationCoords && (
            <button
              onClick={() => {
                const url = `https://www.google.com/maps?q=${landmarkLocationCoords[0]},${landmarkLocationCoords[1]}`;
                window.open(url, '_blank');
              }}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg opacity-90"
            >
              <Navigation className="w-5 h-5" />
              Navigate to Landmark
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

