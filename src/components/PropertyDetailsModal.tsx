import { useState, useEffect } from 'react';
import { X, Copy, Share2, Trash2, MessageCircle, Edit2, Plus, Ruler, IndianRupee, MapPin, FileText, Sparkles, Tag, Lock, Globe, ChevronDown, Star, Building, CornerDownRight, Navigation, Shield, Wifi, Calendar, AlertCircle, TreePine, Home, TrendingUp, DollarSign, Info } from 'lucide-react';
import { Property } from '../types/property';
import { formatPrice, formatPriceWithLabel } from '../utils/priceFormatter';
import { HIGHLIGHT_OPTIONS, TAG_OPTIONS } from '../utils/filterOptions';
import { LocationModal } from './LocationModal';
import { LocationViewModal } from './LocationViewModal';

interface PropertyDetailsModalProps {
  property: Property;
  isOwned: boolean;
  onClose: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (id: number) => void;
  onTogglePublic?: (id: number, isPublic: boolean) => void;
  onShare?: (property: Property) => void;
  onAskQuestion?: (property: Property) => void;
  onUpdateHighlightsAndTags?: (id: number, highlights: string, tags: string) => void;
  onUpdateLocation?: (id: number, location: string, locationAccuracy: string) => void;
  onUpdateLandmarkLocation?: (id: number, landmarkLocation: string, landmarkLocationDistance: string) => void;
}

// Map highlight text to icons
const getHighlightIcon = (highlight: string) => {
  const iconMap: Record<string, any> = {
    'Corner': CornerDownRight,
    'Urgent Sale': AlertCircle,
    'On 12 Meter': Navigation,
    'On 18 Meter': Navigation,
    'On 24 Meter': Navigation,
    'On Wide Road': Navigation,
    'Prime Location': MapPin,
    'Two Side Open': CornerDownRight,
    'Park Facing': TreePine,
    'East Facing': Navigation,
    'South Facing': Navigation,
    '3 Side Open': CornerDownRight,
    'Gated Society': Shield,
    'Good Connectivity': Wifi,
    'Multipurpose': Building,
    'Green Belt': TreePine,
    'Extra Space': Home,
    'Luxury Builtup': Star,
    'Very Less Price': DollarSign,
    'Great Investment': TrendingUp,
  };
  return iconMap[highlight] || Sparkles;
};

// Convert highlight options to format with icons
const HIGHLIGHT_OPTIONS_WITH_ICONS = HIGHLIGHT_OPTIONS.map(text => ({
  text,
  icon: getHighlightIcon(text),
}));

// Helper function to check if location has lat/long format
function hasLocationCoordinates(location: string | undefined): boolean {
  if (!location) return false;
  // Check if location is in "lat,long" format (e.g., "28.7041,77.1025")
  const latLongPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
  return latLongPattern.test(location.trim());
}

// Get type-specific styling for highlights
function getHighlightStyles(type: string) {
  const typeLower = type.toLowerCase();
  const isPlot = typeLower.includes('plot');
  
  if (isPlot) {
    // Plot - gray color
    return {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
    };
  } else {
    // Other - orange color
    return {
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
    };
  }
}

export function PropertyDetailsModal({
  property,
  isOwned,
  onClose,
  onEdit,
  onDelete,
  onTogglePublic,
  onShare,
  onAskQuestion,
  onUpdateHighlightsAndTags,
  onUpdateLocation,
  onUpdateLandmarkLocation,
}: PropertyDetailsModalProps) {
  const highlightStyles = getHighlightStyles(property.type);
  const [copied, setCopied] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationViewModal, setShowLocationViewModal] = useState(false);
  const [showNoteTooltip, setShowNoteTooltip] = useState(false);
  const [showPrivacyInfoTooltip, setShowPrivacyInfoTooltip] = useState(false);
  const [showLocationInfoTooltip, setShowLocationInfoTooltip] = useState(false);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>(
    property.highlights ? property.highlights.split(',').map(h => h.trim()).filter(Boolean) : []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    property.tags ? property.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  );
  const [highlightSearchQuery, setHighlightSearchQuery] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Parse location coordinates
  const parseLocation = (location: string | undefined): { lat: number; lng: number } | null => {
    if (!hasLocationCoordinates(location || '')) return null;
    const parts = (location || '').split(',');
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  };

  const locationCoords = parseLocation(property.location);
  const hasLocation = hasLocationCoordinates(property.location);

  // Open location in Google Maps
  const handleOpenInGoogleMaps = () => {
    if (!locationCoords) return;
    const { lat, lng } = locationCoords;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Copy location Google Maps link
  const handleCopyLocation = () => {
    if (!locationCoords) return;
    const { lat, lng } = locationCoords;
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    navigator.clipboard.writeText(googleMapsUrl);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };


  // Update local state when property changes
  useEffect(() => {
    setSelectedHighlights(
      property.highlights ? property.highlights.split(',').map(h => h.trim()).filter(Boolean) : []
    );
    setSelectedTags(
      property.tags ? property.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    );
  }, [property]);

  // Reset search queries when modals close
  useEffect(() => {
    if (!showHighlightModal) {
      setHighlightSearchQuery('');
    }
  }, [showHighlightModal]);

  useEffect(() => {
    if (!showTagModal) {
      setTagSearchQuery('');
    }
  }, [showTagModal]);

  const handleCopy = () => {
    const sizeText = property.min_size === property.size_max
      ? `${property.min_size} ${property.size_unit}`
      : `${property.min_size}-${property.size_max} ${property.size_unit}`;
    const priceText = formatPriceWithLabel(property.price_min, property.price_max);
    const text = `${property.type} in ${property.area}, ${property.city}\n${property.description}\nSize: ${sizeText}\nPrice: ${priceText}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleHighlight = (highlight: string) => {
    setSelectedHighlights(prev =>
      prev.includes(highlight)
        ? prev.filter(h => h !== highlight)
        : [...prev, highlight]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSaveHighlights = () => {
    if (onUpdateHighlightsAndTags) {
      // Use current selectedTags state (which may have been updated) instead of property.tags
      onUpdateHighlightsAndTags(
        property.id,
        selectedHighlights.join(', '),
        selectedTags.join(', ')
      );
    }
    setShowHighlightModal(false);
  };

  const handleSaveTags = () => {
    if (onUpdateHighlightsAndTags) {
      // Use current selectedHighlights state (which may have been updated) instead of property.highlights
      onUpdateHighlightsAndTags(
        property.id,
        selectedHighlights.join(', '),
        selectedTags.join(', ')
      );
    }
    setShowTagModal(false);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl mobile-modal-content sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{property.type} #{property.id}</h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-gray-500" />
                <span className="text-sm sm:text-base text-gray-600">Size</span>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {property.min_size === property.size_max
                    ? property.min_size
                    : `${property.min_size}-${property.size_max}`}
                  <span className="text-sm sm:text-base text-gray-700"> {property.size_unit}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-gray-500" />
                <span className="text-sm sm:text-base text-gray-600">Price</span>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {formatPrice(property.price_min, property.price_max, true)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                <span className="text-sm sm:text-base text-gray-600" >Area</span>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {property.area}, {property.city}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm sm:text-base text-gray-600" >Location</span>
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowLocationInfoTooltip(true)}
                    onMouseLeave={() => setShowLocationInfoTooltip(false)}
                    onClick={() => setShowLocationInfoTooltip(!showLocationInfoTooltip)}
                    className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {showLocationInfoTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded z-50 pointer-events-none min-w-[200px] sm:min-w-[250px] max-w-[280px] sm:max-w-[320px]">
                      {hasLocation 
                        ? 'Exact location will not be shown to public even if you share the property to public. only the landmark location will be shown.' 
                        : 'Exact location will not be shown to public even if you share the property to public. only the landmark location will be shown.'}
                      <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right flex items-center gap-2 flex-wrap justify-end">
                {hasLocation ? (
                  <>
                    <button
                      onClick={() => {
                        if (locationCoords) {
                          setShowLocationViewModal(true);
                        }
                      }}
                      className="text-sm sm:text-base font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Navigation className="w-4 h-4" />
                      Open
                    </button>
                    {isOwned && (
                      <button
                        onClick={() => setShowLocationModal(true)}
                        className="text-sm sm:text-base font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {isOwned && (
                      <button
                        onClick={() => setShowLocationModal(true)}
                        className="text-sm sm:text-base font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Location
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm sm:text-base text-gray-600" >Created on</span>
              </div>
              <div className="text-right">
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {new Date(property.created_on).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>

          {property.description && (
            <div>
              <h3 className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                Description
              </h3>
              <p className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed">
                {property.description}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                Highlights
              </h3>
              {isOwned && (
                <button
                  onClick={() => setShowHighlightModal(true)}
                  className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {selectedHighlights.length > 0 ? (
                    "Manage"
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 inline" /> Add
                    </>
                  )}
                </button>
              )}
            </div>
            {selectedHighlights.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedHighlights.map((highlight, idx) => {
                  const Icon = getHighlightIcon(highlight);
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 ${highlightStyles.bgColor} ${highlightStyles.textColor} rounded-lg text-xs font-medium flex items-center gap-1.5`}
                    >
                      <Icon className="w-3 h-3" />
                      {highlight}
                    </span>
                  );
                })}
              </div>
            ) : (
              isOwned && (
                <p className="text-xs text-gray-500">Add key features of property</p>
              )
            )}
          </div>

          {isOwned && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">Privacy</span>
                    <div className="relative">
                      <button
                        onMouseEnter={() => setShowPrivacyInfoTooltip(true)}
                        onMouseLeave={() => setShowPrivacyInfoTooltip(false)}
                        onClick={() => setShowPrivacyInfoTooltip(!showPrivacyInfoTooltip)}
                        className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      {showPrivacyInfoTooltip && (
                        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded z-50 pointer-events-none min-w-[200px] sm:min-w-[250px] max-w-[280px] sm:max-w-[320px]">
                          {property.is_public === 1 
                            ? 'Public properties can be viewed by anyone and shared via link. Private properties are only visible to you.' 
                            : 'Private properties are only visible to you. Make it public to allow others to view and share it.'}
                          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                    {property.is_public === 1 
                      ? 'This property is visible to everyone' 
                      : 'This property is only visible to you'}
                  </p>
                </div>
                <button
                  onClick={() => onTogglePublic?.(property.id, property.is_public === 0)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    property.is_public === 1 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label={property.is_public === 1 ? 'Make private' : 'Make public'}
                >
                  <div className="flex items-center gap-1">
                    {property.is_public === 1 ? (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Only me</span>
                      </>
                    )}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {isOwned && property.note_private && (
            <div className="pt-2 sm:pt-2 border-t border-gray-200">
              <h3 className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                Note{' '}
                <span 
                  className="relative inline-flex items-center border-b border-dotted border-gray-400 cursor-help pb-0.5" 
                  style={{ borderBottomWidth: '1px' }}
                  onMouseEnter={() => setShowNoteTooltip(true)}
                  onMouseLeave={() => setShowNoteTooltip(false)}
                >
                  <Lock className="w-3 h-3 text-gray-400" />
                  {showNoteTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded z-50 pointer-events-none min-w-[200px] sm:min-w-[250px] max-w-[280px] sm:max-w-[320px]">
                      This note is visible only to you even if you share the property to public
                      <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </span>
              </h3>
              <p className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed">
                {property.note_private}
              </p>
            </div>
          )}

          {isOwned && selectedTags.length > 0 && (
            <div className="pt-1">
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => setShowTagModal(true)}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

     <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Share</p>
                  <div className={`grid gap-2 sm:gap-3 ${hasLocation ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <button
                      onClick={handleCopy}
                      className="px-2 sm:px-3 py-2 sm:py-3 flex items-center justify-center gap-1 sm:gap-1.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    {hasLocation && (
                      <button
                        onClick={handleCopyLocation}
                        className="px-2 sm:px-3 py-2 sm:py-3 flex items-center justify-center gap-1 sm:gap-1.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                        title="Copy location coordinates"
                      >
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{copiedLocation ? 'Copied' : 'Location'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onShare?.(property);
                        onClose();
                      }}
                      className="px-2 sm:px-3 py-2 sm:py-3 flex items-center justify-center gap-1 sm:gap-1.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>
          <div className="pt-4 sm:pt-6 border-t border-gray-200 space-y-2 sm:space-y-3">
            {isOwned ? (
              <>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      if (confirm('Delete this property?')) {
                        onDelete?.(property.id);
                      }
                    }}
                    className="px-2 sm:px-3 py-2 sm:py-3 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200 flex-shrink-0"
                    title="Delete property"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => onEdit?.(property)}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowTagModal(true)}
                    className="px-2 sm:px-3 py-2 sm:py-3 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                    title={selectedTags.length > 0 ? "Manage tags" : "Add tags"}
                  >
                    <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onAskQuestion?.(property);
                  }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-green-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Ask a Question
                </button>
              
              </>
            )}
          </div>
        </div>
      </div>

      {showHighlightModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md mobile-modal-content sm:max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Select Highlights</h3>
              <button
                onClick={() => setShowHighlightModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <input
                type="text"
                placeholder="Search or add custom highlights"
                value={highlightSearchQuery}
                onChange={(e) => setHighlightSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const value = e.currentTarget.value.trim();
                    if (!selectedHighlights.includes(value)) {
                      toggleHighlight(value);
                    }
                    setHighlightSearchQuery('');
                  }
                }}
              />

              <div className="h-[280px] overflow-y-auto">
                {(() => {
                  const searchLower = highlightSearchQuery.toLowerCase().trim();
                  const filteredHighlights = HIGHLIGHT_OPTIONS_WITH_ICONS.filter(highlight =>
                    highlight.text.toLowerCase().includes(searchLower)
                  );
                  const exactMatch = HIGHLIGHT_OPTIONS.some(opt => 
                    opt.toLowerCase() === searchLower
                  );
                  const showAddNew = searchLower.length > 0 && !exactMatch && !selectedHighlights.includes(highlightSearchQuery.trim());

                  return (
                    <>
                      {highlightSearchQuery.length === 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {HIGHLIGHT_OPTIONS_WITH_ICONS.map((highlight) => {
                            const Icon = highlight.icon;
                            return (
                              <button
                                key={highlight.text}
                                type="button"
                                onClick={() => toggleHighlight(highlight.text)}
                                className={`px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2 ${
                                  selectedHighlights.includes(highlight.text)
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                                {highlight.text}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          {filteredHighlights.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {filteredHighlights.map((highlight) => {
                                const Icon = highlight.icon;
                                return (
                                  <button
                                    key={highlight.text}
                                    type="button"
                                    onClick={() => toggleHighlight(highlight.text)}
                                    className={`px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2 ${
                                      selectedHighlights.includes(highlight.text)
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                    {highlight.text}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {showAddNew && (
                            <button
                              type="button"
                              onClick={() => {
                                const value = highlightSearchQuery.trim();
                                if (!selectedHighlights.includes(value)) {
                                  toggleHighlight(value);
                                }
                                setHighlightSearchQuery('');
                              }}
                              className="w-full mt-2 px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 font-medium border border-green-200"
                            >
                              <Plus className="w-4 h-4" />
                              Add new: {highlightSearchQuery.trim()}
                            </button>
                          )}
                          {filteredHighlights.length === 0 && !showAddNew && (
                            <p className="text-sm text-gray-500 text-center py-4">No highlights found</p>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {selectedHighlights.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedHighlights.map((highlight) => {
                      const Icon = getHighlightIcon(highlight);
                      return (
                        <span
                          key={highlight}
                          className={`px-3 py-1.5 ${highlightStyles.bgColor} ${highlightStyles.textColor} rounded-lg text-sm font-medium flex items-center gap-2`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {highlight}
                          <button
                            type="button"
                            onClick={() => toggleHighlight(highlight)}
                            className={`hover:opacity-80 rounded-full p-0.5`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSaveHighlights}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowHighlightModal(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md mobile-modal-content sm:max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Select Tags</h3>
              <button
                onClick={() => setShowTagModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <input
                type="text"
                placeholder="Search or add custom tags"
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const value = e.currentTarget.value.trim();
                    if (!selectedTags.includes(value)) {
                      toggleTag(value);
                    }
                    setTagSearchQuery('');
                  }
                }}
              />

              <div className="h-[200px] overflow-y-auto">
                {(() => {
                  const searchLower = tagSearchQuery.toLowerCase().trim();
                  const filteredTags = TAG_OPTIONS.filter(tag =>
                    tag.toLowerCase().includes(searchLower)
                  );
                  const exactMatch = TAG_OPTIONS.some(opt => 
                    opt.toLowerCase() === searchLower
                  );
                  const showAddNew = searchLower.length > 0 && !exactMatch && !selectedTags.includes(tagSearchQuery.trim());

                  return (
                    <>
                      {tagSearchQuery.length === 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {TAG_OPTIONS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`px-4 py-2 rounded-xl transition-colors text-sm ${
                                selectedTags.includes(tag)
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <>
                          {filteredTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {filteredTags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleTag(tag)}
                                  className={`px-4 py-2 rounded-xl transition-colors text-sm ${
                                    selectedTags.includes(tag)
                                      ? 'bg-blue-50 text-blue-700 font-medium'
                                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                          {showAddNew && (
                            <button
                              type="button"
                              onClick={() => {
                                const value = tagSearchQuery.trim();
                                if (!selectedTags.includes(value)) {
                                  toggleTag(value);
                                }
                                setTagSearchQuery('');
                              }}
                              className="w-full mt-2 px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 font-medium border border-green-200"
                            >
                              <Plus className="w-4 h-4" />
                              Add new: {tagSearchQuery.trim()}
                            </button>
                          )}
                          {filteredTags.length === 0 && !showAddNew && (
                            <p className="text-sm text-gray-500 text-center py-4">No tags found</p>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {selectedTags.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="hover:bg-blue-100 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSaveTags}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLocationModal && (
        <LocationModal
          property={property}
          onClose={() => setShowLocationModal(false)}
          onSave={(location, locationAccuracy, landmarkLocation, landmarkDistance) => {
            if (onUpdateLocation) {
              onUpdateLocation(property.id, location, locationAccuracy);
            }
            // If landmark location is provided, also save it
            if (landmarkLocation && landmarkDistance && onUpdateLandmarkLocation) {
              onUpdateLandmarkLocation(property.id, landmarkLocation, landmarkDistance);
            }
            setShowLocationModal(false);
          }}
        />
      )}

      {showLocationViewModal && locationCoords && (
        <LocationViewModal
          propertyLocation={locationCoords}
          property={property}
          onClose={() => setShowLocationViewModal(false)}
          onOpenInGoogleMaps={handleOpenInGoogleMaps}
        />
      )}

    </div>
  );
}
