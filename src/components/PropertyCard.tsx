import { MapPin, Globe, Lock, Home, Building2, Building, Trees, Factory } from 'lucide-react';
import { Property } from '../types/property';

interface PropertyCardProps {
  property: Property;
  isOwned: boolean;
  onViewDetails: (property: Property) => void;
}

// Get type-specific styling
function getPropertyTypeStyles(type: string) {
  const typeLower = type.toLowerCase();
  
  if (typeLower.includes('residential plot')) {
    return {
      borderColor: 'border-l-blue-500',
      hoverBorderColor: 'hover:border-l-blue-600',
      icon: Home,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      accentColor: 'bg-blue-100',
    };
  } else if (typeLower.includes('commercial plot')) {
    return {
      borderColor: 'border-l-purple-500',
      hoverBorderColor: 'hover:border-l-purple-600',
      icon: Building2,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      accentColor: 'bg-purple-100',
    };
  } else if (typeLower.includes('house')) {
    return {
      borderColor: 'border-l-green-500',
      hoverBorderColor: 'hover:border-l-green-600',
      icon: Home,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      accentColor: 'bg-green-100',
    };
  } else if (typeLower.includes('apartment')) {
    return {
      borderColor: 'border-l-orange-500',
      hoverBorderColor: 'hover:border-l-orange-600',
      icon: Building,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      accentColor: 'bg-orange-100',
    };
  } else if (typeLower.includes('agriculture')) {
    return {
      borderColor: 'border-l-teal-500',
      hoverBorderColor: 'hover:border-l-teal-600',
      icon: Trees,
      iconColor: 'text-teal-600',
      bgColor: 'bg-teal-50',
      accentColor: 'bg-teal-100',
    };
  } else if (typeLower.includes('industrial')) {
    return {
      borderColor: 'border-l-red-500',
      hoverBorderColor: 'hover:border-l-red-600',
      icon: Factory,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      accentColor: 'bg-red-100',
    };
  }
  
  // Default styling
  return {
    borderColor: 'border-l-gray-500',
    hoverBorderColor: 'hover:border-l-gray-600',
    icon: Home,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    accentColor: 'bg-gray-100',
  };
}

export function PropertyCard({
  property,
  isOwned,
  onViewDetails,
}: PropertyCardProps) {
  const typeStyles = getPropertyTypeStyles(property.type);
  const TypeIcon = typeStyles.icon;
  
  return (
    <button
      onClick={() => onViewDetails(property)}
      className={`w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-3 border-l-4 ${typeStyles.borderColor} border-t border-r border-b border-gray-200 text-left ${typeStyles.hoverBorderColor}`}
    >
     <div className="flex items-start gap-2 mb-2">
  {isOwned && (
    <div className="flex-shrink-0 mt-0.5">
      <div
        className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold"
        title="My Property"
      >
        My
      </div>
    </div>
  )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <TypeIcon className={`w-4 h-4 ${typeStyles.iconColor} flex-shrink-0`} />
            <h3 className="text-base font-semibold text-gray-900">{property.type}</h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {property.area}, {property.city}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {property.is_public === 1 ? (
            <div className="p-1.5 bg-green-100 text-green-700 rounded" title="Public">
              <Globe className="w-3.5 h-3.5" />
            </div>
          ) : isOwned ? (
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded" title="Only Me">
              <Lock className="w-3.5 h-3.5" />
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-gray-700 mb-2 line-clamp-2">{property.description}</p>

      <div className="flex items-center gap-4 mb-2 text-xs text-gray-600">
        <span>
          {property.min_size === property.size_max
            ? `${property.min_size} ${property.size_unit}`
            : `${property.min_size}-${property.size_max} ${property.size_unit}`}
        </span>
        <span className="text-gray-400">•</span>
        <span>
          {property.price_min === property.price_max
            ? `₹${property.price_min}L`
            : `₹${property.price_min}-${property.price_max}L`}
        </span>
      </div>

      <div className="space-y-1.5">
        {property.highlights && (
          <div className="flex flex-wrap gap-1">
            {property.highlights.split(',').slice(0, 3).map((highlight, idx) => (
              <span
                key={idx}
                className={`px-1.5 py-0.5 text-xs ${typeStyles.bgColor} ${typeStyles.iconColor} rounded`}
              >
                {highlight.trim()}
              </span>
            ))}
            {property.highlights.split(',').length > 3 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                +{property.highlights.split(',').length - 3}
              </span>
            )}
          </div>
        )}

        {isOwned && property.tags && (
          <div className="flex flex-wrap gap-1">
            {property.tags.split(',').slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag.trim()}
              </span>
            ))}
            {property.tags.split(',').length > 3 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                +{property.tags.split(',').length - 3}
              </span>
            )}
          </div>
        )}
      </div>

    
    </button>
  );
}
