import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Lock, Globe, Navigation, Satellite, Search, MapPin } from 'lucide-react';
import { Property } from '../types/property';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import type { LeafletMouseEvent } from 'leaflet';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationModalProps {
  property: Property;
  onClose: () => void;
  onSave: (location: string, locationAccuracy: string, landmarkLocation?: string, landmarkDistance?: string) => void;
}

// Helper function to check if location has lat/long format
function hasLocationCoordinates(location: string | undefined): boolean {
  if (!location) return false;
  const latLongPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
  return latLongPattern.test(location.trim());
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e: LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    },
  });
  return null;
}

// Component to update map center
function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (zoom !== undefined) {
      map.setView(center, zoom);
    } else {
      map.setView(center, map.getZoom());
    }
  }, [center, zoom, map]);
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

// Geocode city name to coordinates using CORS proxy
async function geocodeCity(cityName: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName + ', Haryana, India')}&limit=1`;
    
    const proxyServices = [
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];
    
    for (const getProxyUrl of proxyServices) {
      try {
        const proxyUrl = getProxyUrl(url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(proxyUrl, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
          if (jsonData && jsonData.length > 0) {
            return [parseFloat(jsonData[0].lat), parseFloat(jsonData[0].lon)];
          }
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
}

// Search for places using multiple CORS proxy services as fallback
async function searchPlaces(query: string): Promise<Array<{ display_name: string; lat: string; lon: string }>> {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const searchQuery = query.trim();
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', India')}&limit=5&addressdetails=1`;
    
    const proxyServices = [
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
    ];
    
    for (const getProxyUrl of proxyServices) {
      try {
        const proxyUrl = getProxyUrl(nominatimUrl);
        console.log('Trying proxy:', proxyUrl.substring(0, 50) + '...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
          
          if (Array.isArray(jsonData)) {
            const results = jsonData.map((item: any) => ({
              display_name: item.display_name || item.name || `${item.lat}, ${item.lon}`,
              lat: item.lat?.toString() || '',
              lon: item.lon?.toString() || '',
            })).filter((item: any) => item.lat && item.lon && item.display_name);
            
            if (results.length > 0) {
              console.log('Search successful with proxy, found', results.length, 'results');
              return results;
            }
          }
        } else {
          console.log('Proxy returned error:', response.status, response.statusText);
        }
      } catch (proxyError: any) {
        if (proxyError.name === 'AbortError') {
          console.log('Request timed out, trying next proxy...');
        } else {
          console.log('Proxy failed:', proxyError.message);
        }
        continue;
      }
    }
    
    console.warn('All proxy services failed. Search is not available due to CORS restrictions.');
    return [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Extract coordinates from various URL formats (synchronous, no API calls)
function extractCoordsFromUrl(url: string): [number, number] | null {
  try {
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const atMatch = url.match(atPattern);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    const slashAtPattern = /\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const slashAtMatch = url.match(slashAtPattern);
    if (slashAtMatch) {
      const lat = parseFloat(slashAtMatch[1]);
      const lng = parseFloat(slashAtMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    const qPattern = /[?&]q=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/;
    const qMatch = url.match(qPattern);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const llMatch = url.match(llPattern);
    if (llMatch) {
      const lat = parseFloat(llMatch[1]);
      const lng = parseFloat(llMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    const centerPattern = /[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const centerMatch = url.match(centerPattern);
    if (centerMatch) {
      const lat = parseFloat(centerMatch[1]);
      const lng = parseFloat(centerMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    const placePattern = /\/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const placeMatch = url.match(placePattern);
    if (placeMatch) {
      const lat = parseFloat(placeMatch[1]);
      const lng = parseFloat(placeMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    const slashPattern = /\/([-]?\d+\.?\d*),([-]?\d+\.?\d*)/;
    const slashMatch = url.match(slashPattern);
    if (slashMatch) {
      const lat = parseFloat(slashMatch[1]);
      const lng = parseFloat(slashMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }

    const dataPattern = /data=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const dataMatch = url.match(dataPattern);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lng = parseFloat(dataMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }
  } catch (error) {
    console.error('Error extracting coordinates from URL:', error);
  }
  return null;
}

// Resolve short Google Maps URL and extract coordinates
async function resolveGoogleMapsUrl(shortUrl: string): Promise<{ coords: [number, number]; finalUrl?: string } | null> {
  try {
    const directCoords = extractCoordsFromUrl(shortUrl);
    if (directCoords) {
      return { coords: directCoords, finalUrl: shortUrl };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(shortUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const finalUrl = response.url || shortUrl;
      const urlCoords = extractCoordsFromUrl(finalUrl);
      if (urlCoords) {
        return { coords: urlCoords, finalUrl };
      }

      try {
        const html = await response.text();
        const htmlCoords = extractCoordsFromUrl(html);
        if (htmlCoords) {
          return { coords: htmlCoords, finalUrl };
        }
      } catch (htmlError) {
        console.log('Could not read HTML response due to CORS');
      }
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        console.log('Request timed out');
      } else {
        console.log('Could not resolve short URL. Please use the full Google Maps URL with coordinates, or paste coordinates directly.');
      }
    }
  } catch (error) {
    console.error('Error resolving Google Maps URL:', error);
  }
  return null;
}

// Parse input to determine if it's a URL, lat/long, or search query
async function parseLocationInput(input: string): Promise<{ coords: [number, number]; displayText?: string } | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const latLongPattern = /^\s*(-?\d+\.?\d*)\s*[,，]\s*(-?\d+\.?\d*)\s*$/;
  const latLongMatch = trimmed.match(latLongPattern);
  if (latLongMatch) {
    const lat = parseFloat(latLongMatch[1]);
    const lng = parseFloat(latLongMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const displayText = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      return { coords: [lat, lng], displayText };
    }
  }

  const urlCoords = extractCoordsFromUrl(trimmed);
  if (urlCoords) {
    const displayText = `${urlCoords[0].toFixed(6)},${urlCoords[1].toFixed(6)}`;
    return { coords: urlCoords, displayText };
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('google.com') || url.hostname.includes('maps.app.goo.gl') || url.hostname.includes('goo.gl')) {
      const result = await resolveGoogleMapsUrl(trimmed);
      if (result) {
        const displayText = `${result.coords[0].toFixed(6)},${result.coords[1].toFixed(6)}`;
        return { coords: result.coords, displayText };
      }
    }
  } catch (e) {
    // Not a valid URL format
  }

  const searchResults = await searchPlaces(trimmed);
  if (searchResults && searchResults.length > 0) {
    const firstResult = searchResults[0];
    const coords: [number, number] = [parseFloat(firstResult.lat), parseFloat(firstResult.lon)];
    return { coords, displayText: firstResult.display_name };
  }

  return null;
}

export function LocationModal({ property, onClose, onSave }: LocationModalProps) {
  const { user } = useAuth();
  
  const locationField = property.location;
  const landmarkLocationField = property.landmark_location;
  const accuracyField = property.location_accuracy;
  
  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(() => {
    const hasCoords = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test((locationField || '').trim());
    if (hasCoords) {
      const parts = locationField!.split(',').map(c => parseFloat(c.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
      }
    }
    return null;
  });

  const [landmarkPosition, setLandmarkPosition] = useState<[number, number] | null>(() => {
    const hasCoords = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test((landmarkLocationField || '').trim());
    if (hasCoords) {
      const parts = landmarkLocationField!.split(',').map(c => parseFloat(c.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
      }
    }
    return null;
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([29.3909, 76.9635]);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
  const [isLoadingCity, setIsLoadingCity] = useState(true);
  const [showSearchSection, setShowSearchSection] = useState(false);
  const [radius, setRadius] = useState(() => {
    return accuracyField ? parseFloat(accuracyField) || 0 : 0;
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSatelliteView, setIsSatelliteView] = useState(() => {
    const saved = localStorage.getItem('mapViewPreference');
    return saved === 'satellite';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  const [addLandmark, setAddLandmark] = useState(true);
  // Store the preserved bearing and distance from property to landmark
  const [preservedBearing, setPreservedBearing] = useState<number | null>(null);
  const [preservedDistance, setPreservedDistance] = useState<number | null>(null);
  
  const landmarkDistance = useMemo(() => {
    return Math.floor(Math.random() * (350 - 150 + 1)) + 150;
  }, []);
  const landmarkDirection = useMemo(() => {
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    return directions[Math.floor(Math.random() * directions.length)];
  }, []);

  useEffect(() => {
    const initializeMapCenter = async () => {
      setIsLoadingCity(true);
      const cityName = user?.default_city || property.city || 'Panipat';
      
      const hasCoords = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test((locationField || '').trim());
      if (hasCoords) {
        const parts = locationField!.split(',').map(c => parseFloat(c.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setMapCenter([parts[0], parts[1]]);
          setIsLoadingCity(false);
          return;
        }
      }
      
      const coords = await geocodeCity(cityName);
      if (coords) {
        setMapCenter(coords);
      } else {
        const defaultCoords: [number, number] = [29.3909, 76.9635];
        setMapCenter(defaultCoords);
      }
      setIsLoadingCity(false);
    };

    initializeMapCenter();
  }, [user?.default_city, property.city, locationField]);

  // Calculate distance between two points in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate bearing (direction) from point A to point B in degrees
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x);
    bearing = bearing * (180 / Math.PI);
    bearing = (bearing + 360) % 360; // Normalize to 0-360
    
    return bearing;
  };

  // Calculate landmark location from a point using bearing (in degrees) and distance (in meters)
  const calculateLandmarkFromBearing = (lat: number, lng: number, bearingDegrees: number, distanceMeters: number): [number, number] => {
    const R = 6371000;
    const bearing = bearingDegrees * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);
    const lngRad = lng * (Math.PI / 180);
    
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distanceMeters / R) +
      Math.cos(latRad) * Math.sin(distanceMeters / R) * Math.cos(bearing)
    );
    
    const newLngRad = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(latRad),
      Math.cos(distanceMeters / R) - Math.sin(latRad) * Math.sin(newLatRad)
    );
    
    const newLat = newLatRad * (180 / Math.PI);
    const newLng = newLngRad * (180 / Math.PI);
    
    return [newLat, newLng];
  };

  useEffect(() => {
    const hasCoords = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test((locationField || '').trim());
    if (hasCoords) {
      const parts = locationField!.split(',').map(c => parseFloat(c.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setSelectedPosition([parts[0], parts[1]]);
      }
    }
    const hasLandmarkCoords = /^-?\d+\.?\d*,-?\d+\.?\d*$/.test((landmarkLocationField || '').trim());
    if (hasLandmarkCoords) {
      const parts = landmarkLocationField!.split(',').map(c => parseFloat(c.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setLandmarkPosition([parts[0], parts[1]]);
        setAddLandmark(true);
        
        // Calculate and preserve bearing and distance from property to landmark
        if (hasCoords) {
          const propertyParts = locationField!.split(',').map(c => parseFloat(c.trim()));
          if (propertyParts.length === 2 && !isNaN(propertyParts[0]) && !isNaN(propertyParts[1])) {
            const bearing = calculateBearing(propertyParts[0], propertyParts[1], parts[0], parts[1]);
            const distance = calculateDistance(propertyParts[0], propertyParts[1], parts[0], parts[1]);
            setPreservedBearing(bearing);
            setPreservedDistance(distance);
          }
        }
      }
    } else {
      // Reset preserved values if no landmark exists
      setPreservedBearing(null);
      setPreservedDistance(null);
    }
    setRadius(accuracyField ? parseFloat(accuracyField) || 0 : 0);
  }, [locationField, landmarkLocationField, accuracyField]);

  useEffect(() => {
    if (selectedPosition && addLandmark && !landmarkPosition) {
      // Use preserved bearing and distance if available, otherwise use random values
      if (preservedBearing !== null && preservedDistance !== null) {
        const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
          selectedPosition[0],
          selectedPosition[1],
          preservedBearing,
          preservedDistance
        );
        setLandmarkPosition([landmarkLat, landmarkLng]);
      } else {
        const R = 6371000;
        const directionToBearing: Record<string, number> = {
          'north': 0, 'northeast': 45, 'east': 90, 'southeast': 135,
          'south': 180, 'southwest': 225, 'west': 270, 'northwest': 315,
        };
        const bearing = (directionToBearing[landmarkDirection] || 0) * (Math.PI / 180);
        const latRad = selectedPosition[0] * (Math.PI / 180);
        const lngRad = selectedPosition[1] * (Math.PI / 180);
        const newLatRad = Math.asin(
          Math.sin(latRad) * Math.cos(landmarkDistance / R) +
          Math.cos(latRad) * Math.sin(landmarkDistance / R) * Math.cos(bearing)
        );
        const newLngRad = lngRad + Math.atan2(
          Math.sin(bearing) * Math.sin(landmarkDistance / R) * Math.cos(latRad),
          Math.cos(landmarkDistance / R) - Math.sin(latRad) * Math.sin(newLatRad)
        );
        const landmarkLat = newLatRad * (180 / Math.PI);
        const landmarkLng = newLngRad * (180 / Math.PI);
        setLandmarkPosition([landmarkLat, landmarkLng]);
      }
    } else if (!addLandmark) {
      setLandmarkPosition(null);
    }
  }, [selectedPosition, addLandmark, landmarkDistance, landmarkDirection, landmarkPosition, preservedBearing, preservedDistance]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    const trimmed = searchQuery.trim();
    
    if (trimmed.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    const latLongPattern = /^\s*(-?\d+\.?\d*)\s*[,，]\s*(-?\d+\.?\d*)\s*$/;
    const isCoordinates = latLongPattern.test(trimmed);
    const urlCoords = extractCoordsFromUrl(trimmed);
    
    if (isCoordinates || urlCoords) {
      setShowSuggestions(false);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(searchQuery);
        console.log('Search results:', results);
        setSearchSuggestions(results);
        setShowSuggestions(results.length > 0);
        setHasSearched(true);
      } catch (error) {
        console.error('Search error in useEffect:', error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const result = await parseLocationInput(searchQuery);
      if (result) {
        setSelectedPosition(result.coords);
        setMapCenter(result.coords);
        setMapZoom(16);
        if (addLandmark) {
          // Use preserved bearing and distance if available, otherwise use random values
          if (preservedBearing !== null && preservedDistance !== null) {
            const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
              result.coords[0],
              result.coords[1],
              preservedBearing,
              preservedDistance
            );
            setLandmarkPosition([landmarkLat, landmarkLng]);
          } else {
            const [landmarkLat, landmarkLng] = calculateLandmarkLocation(
              result.coords[0],
              result.coords[1],
              landmarkDistance,
              landmarkDirection
            );
            setLandmarkPosition([landmarkLat, landmarkLng]);
          }
        }
        if (result.displayText) {
          setSearchQuery(result.displayText);
        } else {
          setSearchQuery('');
        }
      } else {
        alert('Location not found. Please try a different search term or enter coordinates directly.');
      }
    } catch (error) {
      console.error('Search submit error:', error);
      alert('Error searching for location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (suggestion: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    setSelectedPosition([lat, lng]);
    setMapCenter([lat, lng]);
    setMapZoom(16);
    if (addLandmark) {
      // Use preserved bearing and distance if available, otherwise use random values
      if (preservedBearing !== null && preservedDistance !== null) {
        const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
          lat,
          lng,
          preservedBearing,
          preservedDistance
        );
        setLandmarkPosition([landmarkLat, landmarkLng]);
      } else {
        const [landmarkLat, landmarkLng] = calculateLandmarkLocation(
          lat,
          lng,
          landmarkDistance,
          landmarkDirection
        );
        setLandmarkPosition([landmarkLat, landmarkLng]);
      }
    }
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const radiusSteps = [0, 20, 50, 100, 200, 300, 500, 700, 900, 1100, 1300, 1500, 2000, 5000, 10000, 25000];
  
  const getClosestRadiusStepIndex = (value: number): number => {
    let closestIndex = 0;
    let minDiff = Math.abs(radiusSteps[0] - value);
    for (let i = 1; i < radiusSteps.length; i++) {
      const diff = Math.abs(radiusSteps[i] - value);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  const getCurrentStepIndex = (): number => {
    return getClosestRadiusStepIndex(radius);
  };

  const handleRadiusChange = (stepIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(stepIndex, radiusSteps.length - 1));
    setRadius(radiusSteps[clampedIndex]);
  };

  const formatRadius = (value: number): string => {
    if (value === 0) return '0 m';
    if (value < 1000) return `${value} m`;
    return `${(value / 1000).toFixed(1)} km`;
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setMapCenter([lat, lng]);
    setMapZoom(16);
    if (addLandmark) {
      // Use preserved bearing and distance if available, otherwise use random values
      if (preservedBearing !== null && preservedDistance !== null) {
        const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
          lat,
          lng,
          preservedBearing,
          preservedDistance
        );
        setLandmarkPosition([landmarkLat, landmarkLng]);
      } else {
        const [landmarkLat, landmarkLng] = calculateLandmarkLocation(
          lat,
          lng,
          landmarkDistance,
          landmarkDirection
        );
        setLandmarkPosition([landmarkLat, landmarkLng]);
      }
    }
  };

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
        setSelectedPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setMapZoom(16);
        if (addLandmark) {
          // Use preserved bearing and distance if available, otherwise use random values
          if (preservedBearing !== null && preservedDistance !== null) {
            const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
              lat,
              lng,
              preservedBearing,
              preservedDistance
            );
            setLandmarkPosition([landmarkLat, landmarkLng]);
          } else {
            const [landmarkLat, landmarkLng] = calculateLandmarkLocation(
              lat,
              lng,
              landmarkDistance,
              landmarkDirection
            );
            setLandmarkPosition([landmarkLat, landmarkLng]);
          }
        }
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

  const calculateLandmarkLocation = (lat: number, lng: number, distanceMeters: number, direction: string): [number, number] => {
    const R = 6371000;
    
    const directionToBearing: Record<string, number> = {
      'north': 0,
      'northeast': 45,
      'east': 90,
      'southeast': 135,
      'south': 180,
      'southwest': 225,
      'west': 270,
      'northwest': 315,
    };
    
    const bearing = (directionToBearing[direction] || 0) * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);
    const lngRad = lng * (Math.PI / 180);
    
    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distanceMeters / R) +
      Math.cos(latRad) * Math.sin(distanceMeters / R) * Math.cos(bearing)
    );
    
    const newLngRad = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(latRad),
      Math.cos(distanceMeters / R) - Math.sin(latRad) * Math.sin(newLatRad)
    );
    
    const newLat = newLatRad * (180 / Math.PI);
    const newLng = newLngRad * (180 / Math.PI);
    
    return [newLat, newLng];
  };

  const handleSave = () => {
    if (!selectedPosition) {
      alert('Please select a location on the map or search for a place');
      return;
    }

    const locationString = `${selectedPosition[0].toFixed(6)},${selectedPosition[1].toFixed(6)}`;
    
    if (addLandmark && landmarkPosition) {
      const landmarkLocationString = `${landmarkPosition[0].toFixed(6)},${landmarkPosition[1].toFixed(6)}`;
      const actualDistance = Math.round(calculateDistance(
        selectedPosition[0],
        selectedPosition[1],
        landmarkPosition[0],
        landmarkPosition[1]
      ));
      
      onSave(locationString, radius.toString(), landmarkLocationString, actualDistance.toString());
    } else {
      onSave(locationString, radius.toString());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl mobile-modal-content sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            {hasLocationCoordinates(locationField || '') ? 'Edit Location' : 'Add Location'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {showSearchSection && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Location
              </label>
            <div className="relative" ref={searchInputRef}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  onPaste={async (e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (pastedText.includes('http') || /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(pastedText.trim())) {
                      e.preventDefault();
                      setSearchQuery(pastedText);
                      setIsSearching(true);
                      setShowSuggestions(false);
                      try {
                        const result = await parseLocationInput(pastedText);
                        if (result) {
                          setSelectedPosition(result.coords);
                          setMapCenter(result.coords);
                          setMapZoom(16);
                          if (addLandmark) {
                            // Use preserved bearing and distance if available, otherwise use random values
                            if (preservedBearing !== null && preservedDistance !== null) {
                              const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
                                result.coords[0],
                                result.coords[1],
                                preservedBearing,
                                preservedDistance
                              );
                              setLandmarkPosition([landmarkLat, landmarkLng]);
                            } else {
                              const [landmarkLat, landmarkLng] = calculateLandmarkLocation(
                                result.coords[0],
                                result.coords[1],
                                landmarkDistance,
                                landmarkDirection
                              );
                              setLandmarkPosition([landmarkLat, landmarkLng]);
                            }
                          }
                          if (result.displayText) {
                            setSearchQuery(result.displayText);
                          } else {
                            setSearchQuery('');
                          }
                        } else {
                          setSearchQuery(pastedText);
                        }
                      } catch (error) {
                        console.error('Paste error:', error);
                        setSearchQuery(pastedText);
                      } finally {
                        setIsSearching(false);
                      }
                    }
                  }}
                  placeholder="Search for a place, paste coordinates (lat,long), or paste a Google Maps URL"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={`suggestion-${index}-${suggestion.lat}-${suggestion.lon}`}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSuggestionSelect(suggestion);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{suggestion.display_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {isSearching && searchQuery.trim().length >= 2 && !showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Searching...</span>
                  </div>
                </div>
              )}
              {!isSearching && hasSearched && searchQuery.trim().length >= 2 && searchSuggestions.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">No results found for "{searchQuery}"</div>
                  <div className="text-xs text-gray-400">Try clicking on the map or pasting coordinates directly (e.g., 28.7041,77.1025)</div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Search for places, paste coordinates (e.g., 28.7041,77.1025), or paste Google Maps URLs. 
              If search doesn't work, click on the map to select location directly.
            </p>
          </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Click on the map to select location or{' '}
              <button
                type="button"
                onClick={() => setShowSearchSection(!showSearchSection)}
                className="text-blue-600 underline hover:text-blue-700 font-semibold"
              >
                Enter location
              </button>
            </label>
            <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-300">
              {isLoadingCity ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading map...</p>
                  </div>
                </div>
              ) : (
                <>
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    className="h-full w-full"
                    scrollWheelZoom={true}
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
                    <TileLayerSwitcher isSatelliteView={isSatelliteView} />
                    <MapClickHandler onMapClick={handleMapClick} />
                    
                    {selectedPosition && landmarkPosition && (
                      <Polyline
                        positions={[selectedPosition, landmarkPosition]}
                        pathOptions={{
                          color: '#3b82f6',
                          weight: 2,
                          opacity: 0.6,
                          dashArray: '10, 5',
                        }}
                      />
                    )}
                    
                    {selectedPosition && (
                      <>
                        {radius > 0 && (
                          <Circle
                            center={selectedPosition}
                            radius={radius}
                            pathOptions={{
                              color: '#16a34a',
                              fillColor: '#16a34a',
                              fillOpacity: 0.1,
                              weight: 2,
                              opacity: 0.5,
                            }}
                          />
                        )}
                        <Marker
                          position={selectedPosition}
                          draggable={true}
                          eventHandlers={{
                            dragend: (e) => {
                              const marker = e.target;
                              const position = marker.getLatLng();
                              setSelectedPosition([position.lat, position.lng]);
                              setMapCenter([position.lat, position.lng]);
                              if (addLandmark) {
                                // Use preserved bearing and distance if available, otherwise use random values
                                if (preservedBearing !== null && preservedDistance !== null) {
                                  const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
                                    position.lat,
                                    position.lng,
                                    preservedBearing,
                                    preservedDistance
                                  );
                                  setLandmarkPosition([landmarkLat, landmarkLng]);
                                } else {
                                  const [landmarkLat, landmarkLng] = calculateLandmarkLocation(
                                    position.lat,
                                    position.lng,
                                    landmarkDistance,
                                    landmarkDirection
                                  );
                                  setLandmarkPosition([landmarkLat, landmarkLng]);
                                }
                              }
                            },
                          }}
                          icon={L.divIcon({
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
                          })}
                        >
                          <Popup>
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-green-700" />
                              <span className="font-semibold">Exact Location (Private)</span>
                            </div>
                            <div className="mt-1 text-sm">
                              {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                            </div>
                            {radius > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Accuracy: {formatRadius(radius)}
                              </div>
                            )}
                          </Popup>
                        </Marker>
                      </>
                    )}
                    
                    {landmarkPosition && addLandmark && (
                      <Marker
                        position={landmarkPosition}
                        draggable={true}
                        eventHandlers={{
                          dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            setLandmarkPosition([position.lat, position.lng]);
                            // Update preserved bearing and distance when landmark is manually dragged
                            if (selectedPosition) {
                              const bearing = calculateBearing(
                                selectedPosition[0],
                                selectedPosition[1],
                                position.lat,
                                position.lng
                              );
                              const distance = calculateDistance(
                                selectedPosition[0],
                                selectedPosition[1],
                                position.lat,
                                position.lng
                              );
                              setPreservedBearing(bearing);
                              setPreservedDistance(distance);
                            }
                          },
                        }}
                         icon={L.divIcon({
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
                          })}
                      >
                        <Popup>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold">Landmark Location (Public)</span>
                          </div>
                          <div className="text-sm mt-1">
                            {landmarkPosition[0].toFixed(6)}, {landmarkPosition[1].toFixed(6)}
                          </div>
                          {selectedPosition && (
                            <div className="text-xs text-gray-500 mt-1">
                              Distance: {Math.round(calculateDistance(
                                selectedPosition[0],
                                selectedPosition[1],
                                landmarkPosition[0],
                                landmarkPosition[1]
                              ))}m
                            </div>
                          )}
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                  
                  <div className="absolute inset-0 pointer-events-none z-[2]">
                    <button
                      type="button"
                      onClick={() => {
                        const newView = !isSatelliteView;
                        setIsSatelliteView(newView);
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
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {selectedPosition ? (
                <>
                  <span className="font-semibold">Exact Location:</span> {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                  {landmarkPosition && addLandmark && (
                    <>
                   <span className="text-gray-500"> | </span>
                      <span className="font-semibold">Landmark Location:</span> {landmarkPosition[0].toFixed(6)}, {landmarkPosition[1].toFixed(6)}
                      <span className="text-gray-500"> | </span>
                      <span className="font-semibold">Distance:</span> {Math.round(calculateDistance(
                        selectedPosition[0],
                        selectedPosition[1],
                        landmarkPosition[0],
                        landmarkPosition[1]
                      ))}m
                    </>
                  )}
                </>
              ) : (
                <>Click anywhere on the map to set the location. The map is centered on {user?.default_city || property.city || 'Panipat'}.</>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Location Accuracy Radius: {formatRadius(radius)}
            </label>
            <input
              type="range"
              min="0"
              max={radiusSteps.length - 1}
              step="1"
              value={getCurrentStepIndex()}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          
            <p className="text-xs text-gray-500 mt-1.5">
              This radius indicates the accuracy of the exact location. 
            </p>
          </div>

          {selectedPosition && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-200">
              <input
                type="checkbox"
                id="addLandmark"
                checked={addLandmark}
                onChange={(e) => {
                  setAddLandmark(e.target.checked);
                  if (!e.target.checked) {
                    setLandmarkPosition(null);
                  } else if (selectedPosition) {
                    // Use preserved bearing and distance if available, otherwise use random values
                    if (preservedBearing !== null && preservedDistance !== null) {
                      const [landmarkLat, landmarkLng] = calculateLandmarkFromBearing(
                        selectedPosition[0],
                        selectedPosition[1],
                        preservedBearing,
                        preservedDistance
                      );
                      setLandmarkPosition([landmarkLat, landmarkLng]);
                    } else {
                      const [landmarkLat, landmarkLng] = calculateLandmarkLocation(
                        selectedPosition[0],
                        selectedPosition[1],
                        landmarkDistance,
                        landmarkDirection
                      );
                      setLandmarkPosition([landmarkLat, landmarkLng]);
                    }
                  }
                }}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="addLandmark" className="flex-1 text-sm text-gray-700 cursor-pointer">
                Add a landmark {landmarkPosition && addLandmark ? Math.round(calculateDistance(
                  selectedPosition[0],
                  selectedPosition[1],
                  landmarkPosition[0],
                  landmarkPosition[1]
                )) : landmarkDistance} meters away for public view. (Only visible if property is public)
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

