import { Globe, Lock, Ruler, IndianRupee, MapPin, Sparkles, Tag, Star, Building, CornerDownRight, Navigation, Shield, Wifi, CheckCircle, FileText } from 'lucide-react';
import { Property } from '../types/property';
import { getUserSettings } from '../types/userSettings';
import { formatPrice } from '../utils/priceFormatter';

interface PropertyCardProps {
  property: Property;
  isOwned: boolean;
  onViewDetails: (property: Property) => void;
}

// Icon mappings for highlights
const HIGHLIGHT_ICONS: Record<string, any> = {
  'Excellent location': MapPin,
  'Ready to move': CheckCircle,
  'Prime property': Star,
  'Near amenities': Building,
  'Corner plot': CornerDownRight,
  'Main road facing': Navigation,
  'Gated community': Shield,
  'Well connected': Wifi,
};

// Get icon for highlight text
function getIconForHighlight(text: string) {
  const trimmed = text.trim();
  return HIGHLIGHT_ICONS[trimmed] || Sparkles;
}

// Get type-specific styling
function getPropertyTypeStyles(type: string) {
  const typeLower = type.toLowerCase();
  const isPlot = typeLower.includes('plot');
  
  if (isPlot) {
    // Plot - dull color
    return {
      borderColor: 'border-l-gray-300',
      hoverBorderColor: 'hover:border-l-gray-400',
      bgColor: 'bg-gray-50',
      accentColor: 'bg-gray-100',
    };
  } else {
    // Other - orange color
    return {
      borderColor: 'border-l-orange-500',
      hoverBorderColor: 'hover:border-l-orange-600',
      bgColor: 'bg-orange-50',
      accentColor: 'bg-orange-100',
    };
  }
}

export function PropertyCard({
  property,
  isOwned,
  onViewDetails,
}: PropertyCardProps) {
  const typeStyles = getPropertyTypeStyles(property.type);
  const userSettings = getUserSettings();
  const userCity = userSettings.city || '';
  
  // Trim description to 200 characters
  const trimmedDescription = property.description.length > 200 
    ? property.description.substring(0, 200) + '...'
    : property.description;
  
  // Format price
  const priceText = formatPrice(property.price_min, property.price_max);
  
  // Format size
  const sizeText = property.min_size === property.size_max
    ? `${property.min_size} ${property.size_unit}`
    : `${property.min_size}-${property.size_max} ${property.size_unit}`;
  
  // Format location - show city only if it's not the user's city
  const locationText = property.city.toLowerCase() === userCity.toLowerCase()
    ? property.area
    : `${property.area}, ${property.city}`;
  
  // Format created date
  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };
  
  const createdDateText = formatCreatedDate(property.created_on);
  
  return (
    <button
      onClick={() => onViewDetails(property)}
      className={`w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-3 sm:p-4 border-l-4 ${typeStyles.borderColor} border-t border-r border-b border-gray-200 text-left ${typeStyles.hoverBorderColor} relative`}
    >
     <div className="flex items-start gap-2 sm:gap-3 mb-1 sm:mb-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight mb-1">
            {sizeText} {property.type} in {locationText}
          </h3>
        </div>
        <div className="flex-shrink-0">
          <div className="flex items-center gap-0 text-lg sm:text-2xl font-bold text-gray-900">
            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{priceText}</span>
          </div>
        </div>
      </div>
      {property.description && (
        <div className="flex items-start gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed flex-1">{trimmedDescription}</p>
        </div>
      )}

      <div className="space-y-1.5 sm:space-y-2">
        {property.highlights && (
          <div className="flex flex-wrap gap-1">
            {property.highlights.split(',').slice(0, 3).map((highlight, idx) => {
              const Icon = getIconForHighlight(highlight);
              return (
                <span
                  key={idx}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs ${typeStyles.bgColor} ${typeStyles.iconColor} rounded flex items-center gap-1`}
                >
                  <Icon className="w-3 h-3" />
                  {highlight.trim()}
                </span>
              );
            })}
            {property.highlights.split(',').length > 3 && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 text-gray-700 rounded">
                +{property.highlights.split(',').length - 3}
              </span>
            )}
          </div>
        )}

        {isOwned && (
          <div className="flex flex-wrap gap-1">
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium">
              My Property
            </span>
            {property.tags && property.tags.split(',').slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 text-gray-600 rounded flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                {tag.trim()}
              </span>
            ))}
            {property.tags && property.tags.split(',').length > 3 && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-100 text-gray-700 rounded">
                +{property.tags.split(',').length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Created date and Public/Private icon in bottom right */}
      <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex items-center gap-1.5 sm:gap-2">
        <span className={`text-xs ${typeStyles.iconColor} opacity-60`}>
          {createdDateText}
        </span>
        {isOwned && (
          <>
            {property.is_public === 1 ? (
              <div className="p-1 sm:p-1.5 bg-green-100 text-green-700 rounded shadow-sm" title="Public">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            ) : (
              <div className="p-1 sm:p-1.5 bg-blue-100 text-blue-700 rounded shadow-sm" title="Private">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            )}
          </>
        )}
      </div>
    
    </button>
  );
}
