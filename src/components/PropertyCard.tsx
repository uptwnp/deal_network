import {
  Globe, Lock, Clock, Tag, Heart, MessageSquare,
  Navigation, Flame, Compass, TreeDeciduous, Map
} from 'lucide-react';
import { Property } from '../types/property';
import { getUserSettings } from '../types/userSettings';
import { formatPrice } from '../utils/priceFormatter';
import { formatSize } from '../utils/sizeFormatter';
import { formatRatePerUnit } from '../utils/rateFormatter';
import { propertyTypeDefinitions } from '../utils/leafletIcons';
import { formatTextForReadability } from '../utils/textFormatter';
import { ClickableText } from './ClickableText';

interface PropertyCardProps {
  property: Property;
  isOwned: boolean;
  onViewDetails: (property: Property) => void;
  isSelected?: boolean;
}

// Get property icon SVG from the exact same definitions used in the map
function getPropertyTypeIconSVG(type: string): { color: string; path: string } | null {
  return propertyTypeDefinitions[type] || null;
}

// Get highlight icon
function getHighlightIcon(text: string) {
  const textLower = text.toLowerCase();
  if (textLower.includes('corner')) return Navigation;
  if (textLower.includes('park')) return TreeDeciduous;
  if (textLower.includes('urgent')) return Flame;
  if (textLower.includes('road') || textLower.includes('meter')) return Navigation;
  if (textLower.includes('facing')) return Compass;
  if (textLower.includes('plot')) return Map;
  return null;
}

export function PropertyCard({
  property,
  isOwned,
  onViewDetails,
  isSelected,
}: PropertyCardProps) {
  const userSettings = getUserSettings();
  const userCity = userSettings.city || '';

  // Trim description to 150 characters (after formatting for readability)
  const formattedDescription = formatTextForReadability(property.description || '');
  const trimmedDescription = formattedDescription && formattedDescription.length > 150
    ? formattedDescription.substring(0, 150) + '...'
    : formattedDescription;

  // Format price
  const priceText = formatPrice(property.price_min, property.price_max);

  // Format size
  const sizeText = formatSize(property.size_min, property.size_max, property.size_unit);

  // Calculate rate per unit
  const calculateRatePerUnit = () => {
    const avgPrice = property.price_min > 0 && property.price_max > 0
      ? (property.price_min + property.price_max) / 2
      : property.price_min > 0
        ? property.price_min
        : property.price_max > 0
          ? property.price_max
          : 0;

    const avgSize = property.size_min > 0 && property.size_max > 0
      ? (property.size_min + property.size_max) / 2
      : property.size_min > 0
        ? property.size_min
        : property.size_max > 0
          ? property.size_max
          : 0;

    if (avgPrice > 0 && avgSize > 0) {
      const priceInRupees = avgPrice * 100000;
      const ratePerUnit = priceInRupees / avgSize;
      return formatRatePerUnit(ratePerUnit);
    }
    return null;
  };

  const ratePerUnitText = calculateRatePerUnit();

  // Format location
  const locationText = property.city.toLowerCase() === userCity.toLowerCase()
    ? property.area
    : `${property.area}, ${property.city}`;

  // Format created date
  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'min' : 'mins'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} Days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };

  const createdDateText = formatCreatedDate(property.created_on);

  // Get the exact icon definition from the map
  const iconDef = getPropertyTypeIconSVG(property.type);

  // Combine highlights and tags
  const allTags: { text: string; Icon?: any; type: 'highlight' | 'tag' }[] = [];

  // Add highlights
  if (property.highlights) {
    property.highlights.split(',').forEach((highlight) => {
      const trimmed = highlight.trim();
      if (trimmed) {
        const Icon = getHighlightIcon(trimmed);
        allTags.push({ text: trimmed, Icon: Icon || undefined, type: 'highlight' });
      }
    });
  }

  // Add "My Property" tag if owned
  if (isOwned) {
    allTags.push({ text: 'My Property', type: 'tag' });

    // Add "Location Pending" tag if property is owned but has no location
    if (!property.location || property.location.trim() === '') {
      allTags.push({ text: 'Location Pending', Icon: Map, type: 'tag' });
    }
  }

  // Note: Public/Private status is now shown as an icon next to timestamp, not as a tag

  // Add other custom tags (limit to 2)
  if (property.tags) {
    property.tags.split(',').slice(0, 2).forEach((tag) => {
      const trimmed = tag.trim();
      if (trimmed) {
        const Icon = getHighlightIcon(trimmed);
        allTags.push({ text: trimmed, Icon: Icon || Tag, type: 'tag' });
      }
    });
  }

  // Add user note if it exists
  if (property.user_note && property.user_note.trim()) {
    allTags.push({ text: `Note: ${property.user_note.trim()}`, Icon: MessageSquare, type: 'tag' });
  }

  return (
    <button
      onClick={() => onViewDetails(property)}
      className={`c2_property-card relative bg-white rounded-lg sm:rounded-xl md:rounded-xl p-2.5 sm:p-3 md:p-3.5 border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg shadow-md w-full text-left
        ${isSelected ? 'ring-2 ring-blue-500 shadow-xl' : ''}
      `}
    >
      {/* Decorative Background */}
      <div className="c2_card-bg-gradient"></div>
      <div className="c2_card-bg-orb"></div>

      {/* Card Content */}
      <div className="relative z-0">
        {/* Card Header with Icon, Title & Price */}
        <header className="flex flex-row justify-between items-start gap-2 sm:gap-2.5 md:gap-2.5 mb-2 sm:mb-2.5 md:mb-2.5">
          <div className="flex gap-2 sm:gap-2.5 md:gap-2.5 items-start flex-1 min-w-0">
            {/* Icon - Using exact SVG from map, more compact on desktop */}
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border border-opacity-30 flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: iconDef ? `${iconDef.color}15` : '#dbeafe',
                borderColor: iconDef ? iconDef.color : '#3b82f6'
              }}
            >
              {iconDef && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={iconDef.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4"
                  dangerouslySetInnerHTML={{ __html: iconDef.path }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {/* Title - More compact on desktop */}
              <h3 className="text-sm sm:text-sm md:text-sm font-semibold text-gray-900 mb-0.5 sm:mb-1 md:mb-0.5 flex items-center flex-wrap gap-1">
                {sizeText} | {locationText}
              </h3>
              {/* Subtitle */}
              <p className="text-xs sm:text-xs md:text-xs text-gray-500">{property.type} - #{property.id}</p>
            </div>
          </div>
          {/* Price Section */}
          <div className="text-right">
            <p className="text-sm sm:text-sm md:text-sm font-bold text-blue-600 mb-0.5 sm:mb-1 md:mb-0.5 whitespace-nowrap">
              ₹ {priceText}
            </p>
            {ratePerUnitText && (
              <p className="text-xs sm:text-xs md:text-xs text-gray-500 whitespace-nowrap">
                {ratePerUnitText} <span className="text-gray-400">/{property.size_unit}</span>
              </p>
            )}
          </div>
        </header>

        {trimmedDescription && (
          <div className="text-sm sm:text-sm md:text-sm text-gray-700 leading-relaxed mb-2 sm:mb-2.5 md:mb-2 line-clamp-2">
            <ClickableText text={trimmedDescription} />
          </div>
        )}

        {/* Card Footer with Tags & Timestamp */}
        <footer className="c2_footer pt-2 sm:pt-2.5 md:pt-2.5 border-t border-gray-200">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-1.5">
            {allTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 py-0.5 px-1.5 sm:py-1 sm:px-2 md:py-0.5 md:px-2 rounded-full text-xs sm:text-xs md:text-xs font-normal bg-gray-50 text-gray-700 border border-gray-200 whitespace-nowrap transition-all duration-200 hover:bg-gray-100"
              >
                {tag.Icon && <tag.Icon className="text-gray-500 text-[8px] sm:text-[9px] md:text-[9px] w-3 h-3" />}
                {tag.text}
              </span>
            ))}
          </div>

          {/* Timestamp with Public/Private icon and Favorite icon */}
          <div className="text-right flex items-center justify-end gap-1">
            <span className="inline-flex items-center gap-1 text-xs sm:text-xs md:text-xs text-gray-500 whitespace-nowrap">
              <Clock className="text-[8px] sm:text-[9px] md:text-[9px] w-3 h-3" /> {createdDateText}
            </span>
            {/* Favorite/Saved Icon */}
            {property.is_favourite === 1 && (
              <span className="inline-flex items-center" title="Saved">
                <Heart className="text-red-500 fill-red-500 text-[8px] sm:text-[9px] md:text-[9px] w-3 h-3" />
              </span>
            )}
            {/* Public/Private Icon */}
            {isOwned && (
              <span className="inline-flex items-center">
                {property.is_public === 1 ? (
                  <Globe className="text-gray-500 text-[8px] sm:text-[9px] md:text-[9px] w-3 h-3" />
                ) : (
                  <Lock className="text-gray-500 text-[8px] sm:text-[9px] md:text-[9px] w-3 h-3" />
                )}
              </span>
            )}
          </div>
        </footer>
      </div>
    </button>
  );
}
