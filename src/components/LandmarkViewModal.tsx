import { useState, useEffect, useMemo } from 'react';
import { X, Globe, Navigation, Satellite, Map as MapIcon } from 'lucide-react';
import { Property } from '../types/property';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { landmarkIcon, getUserLocationIcon } from '../utils/leafletIcons';

interface LandmarkViewModalProps {
  landmarkLocation: { lat: number; lng: number };
  property: Property;
  onClose: () => void;
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

// Component to update map bounds to show landmark and user location
function MapBoundsUpdater({ landmarkLocation, userLocation, hasUserLocation, isInitialLoad, shouldUpdateBounds }: { landmarkLocation: [number, number]; userLocation: [number, number] | null; hasUserLocation: boolean; isInitialLoad: boolean; shouldUpdateBounds: boolean }) {
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
          const locationsToFit: [number, number][] = [landmarkLocation];
          
          if (hasUserLocation && userLocation) {
            locationsToFit.push(userLocation);
          }
          
          if (locationsToFit.length > 1) {
            const bounds = L.latLngBounds(locationsToFit);
            map.fitBounds(bounds, { padding: [50, 50] });
          } else {
            map.setView(landmarkLocation, 15);
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
  }, [landmarkLocation, userLocation, hasUserLocation, isInitialLoad, shouldUpdateBounds, map]);
  
  return null;
}

// Component to ensure user location marker is visible
function UserLocationMarkerUpdater({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      console.log('UserLocationMarkerUpdater: userLocation set, invalidating map');
      setTimeout(() => {
        map.invalidateSize();
        const currentCenter = map.getCenter();
        map.setView(currentCenter, map.getZoom());
      }, 200);
    }
  }, [userLocation, map]);
  
  return null;
}

export function LandmarkViewModal({ landmarkLocation, property, onClose }: LandmarkViewModalProps) {
  const [isSatelliteView, setIsSatelliteView] = useState(() => {
    const saved = localStorage.getItem('mapViewPreference');
    return saved === 'satellite';
  });
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldUpdateBounds, setShouldUpdateBounds] = useState(false);
  
  // Parse landmark distance - can be number or string
  const landmarkDistance = useMemo(() => {
    if (!property.landmark_location_distance) return 0;
    const distance = typeof property.landmark_location_distance === 'string' 
      ? parseFloat(property.landmark_location_distance) 
      : property.landmark_location_distance;
    return isNaN(distance) ? 0 : distance;
  }, [property.landmark_location_distance]);
  
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
    if (userLocation) {
      return [
        (landmarkLocation.lat + userLocation[0]) / 2,
        (landmarkLocation.lng + userLocation[1]) / 2
      ];
    }
    return [landmarkLocation.lat, landmarkLocation.lng];
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

  const userIcon = useMemo(() => getUserLocationIcon(), []);
  
  useEffect(() => {
    if (userLocation) {
      console.log('User location state updated:', userLocation);
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

  const handleOpenInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${landmarkLocation.lat},${landmarkLocation.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl mobile-modal-content sm:max-h-[90vh] h-[90vh] sm:h-auto overflow-hidden flex flex-col animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Landmark Location
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
                  landmarkLocation={[landmarkLocation.lat, landmarkLocation.lng]} 
                  userLocation={userLocation}
                  hasUserLocation={!!userLocation}
                  isInitialLoad={isInitialLoad}
                  shouldUpdateBounds={shouldUpdateBounds}
                />
                <UserLocationMarkerUpdater userLocation={userLocation} />
                <TileLayerSwitcher isSatelliteView={isSatelliteView} />
                
                {/* Circle showing the distance radius around landmark */}
                {landmarkDistance > 0 && (
                  <Circle
                    center={[landmarkLocation.lat, landmarkLocation.lng]}
                    radius={landmarkDistance}
                    pathOptions={{
                      color: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.1,
                      weight: 2,
                      opacity: 0.5,
                    }}
                  />
                )}
                
                <Marker 
                  position={[landmarkLocation.lat, landmarkLocation.lng]}
                  icon={landmarkIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-sm">Landmark Location</h3>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {property.area}, {property.city}
                      </p>
                      <p className="text-xs text-gray-500">
                        {landmarkLocation.lat.toFixed(6)}, {landmarkLocation.lng.toFixed(6)}
                      </p>
                      {landmarkDistance > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          Property is within {landmarkDistance}m of this landmark
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>

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
            onClick={handleOpenInGoogleMaps}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Navigation className="w-5 h-5" />
            View Landmark on Map
          </button>
        </div>
      </div>
    </div>
  );
}

