import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Property } from '../types/property';
import { formatPrice } from '../utils/priceFormatter';
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
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function PropertyMap({ properties, center = [29.3909, 76.9635] }: PropertyMapProps) {
  const propertiesWithCoords = properties.filter(
    (p) => p.location && p.location.includes(',')
  );

  return (
    <div className="h-full w-full relative  z-[8]">
      <div className="absolute top-4 left-4 z-[10] bg-white px-3 py-2 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">
          Live View ({propertiesWithCoords.length})
        </p>
      </div>
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full rounded-lg"
        scrollWheelZoom={true}
      >
        <MapUpdater center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {propertiesWithCoords.map((property) => {
          const coords = property.location.split(',').map((c) => parseFloat(c.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            return (
              <Marker key={property.id} position={[coords[0], coords[1]]}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">{property.type}</h3>
                    <p className="text-xs text-gray-600 mb-2">
                      {property.area}, {property.city}
                    </p>
                    <p className="text-xs font-medium text-blue-600">
                      {formatPrice(property.price_min, property.price_max, true)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {property.min_size}-{property.size_max} {property.size_unit}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
}
