import { useState, useEffect } from 'react';
import { X, Copy, Share2, Eye, EyeOff, Trash2, MessageCircle, Edit2, Plus } from 'lucide-react';
import { Property } from '../types/property';

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
}

const HIGHLIGHT_OPTIONS = [
  'Excellent location',
  'Ready to move',
  'Prime property',
  'Near amenities',
  'Corner plot',
  'Main road facing',
  'Gated community',
  'Well connected',
];

const TAG_OPTIONS = [
  'Corner',
  'Main Road',
  'Near School',
  'Near Hospital',
  'Park View',
  'Market Nearby',
  'Metro Access',
  'Airport Nearby',
];

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
}: PropertyDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>(
    property.highlights ? property.highlights.split(',').map(h => h.trim()).filter(Boolean) : []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    property.tags ? property.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  );

  // Update local state when property changes
  useEffect(() => {
    setSelectedHighlights(
      property.highlights ? property.highlights.split(',').map(h => h.trim()).filter(Boolean) : []
    );
    setSelectedTags(
      property.tags ? property.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    );
  }, [property]);

  const handleCopy = () => {
    const sizeText = property.min_size === property.size_max
      ? `${property.min_size} ${property.size_unit}`
      : `${property.min_size}-${property.size_max} ${property.size_unit}`;
    const priceText = property.price_min === property.price_max
      ? `₹${property.price_min} Lakhs`
      : `₹${property.price_min}-${property.price_max} Lakhs`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[98vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{property.type}</h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 md:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between">
              <span className="text-sm sm:text-base text-gray-600">Size</span>
              <div className="text-right">
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {property.min_size === property.size_max
                    ? property.min_size
                    : `${property.min_size}-${property.size_max}`}
                  <span className="text-sm sm:text-base text-gray-700"> {property.size_unit}</span>
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm sm:text-base text-gray-600">Price</span>
              <div className="text-right">
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {(() => {
                    const minPrice = property.price_min;
                    const maxPrice = property.price_max;
                    const useCrores = minPrice >= 100;
                    
                    if (useCrores) {
                      const minCr = (minPrice / 100).toFixed(2).replace(/\.?0+$/, '');
                      if (minPrice === maxPrice) {
                        return `₹${minCr} cr`;
                      } else {
                        const maxCr = (maxPrice / 100).toFixed(2).replace(/\.?0+$/, '');
                        return `₹${minCr}-${maxCr} cr`;
                      }
                    } else {
                      return minPrice === maxPrice
                        ? `₹${minPrice}L`
                        : `₹${minPrice}-${maxPrice}L`;
                    }
                  })()}
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm sm:text-base text-gray-600">Location</span>
              <div className="text-right">
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {property.area}, {property.city}
                </span>
                {property.location && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">({property.location})</p>
                )}
              </div>
            </div>
          </div>

          {property.description && (
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                {property.description}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Highlights
              </h3>
              {isOwned && (
                <button
                  onClick={() => setShowHighlightModal(true)}
                  className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {selectedHighlights.length > 0 ? (
                    "Manage"
                  ) : (
                    <>
                      <Plus className="w-4 h-4 inline" /> Add
                    </>
                  )}
                </button>
              )}
            </div>
            {selectedHighlights.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedHighlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            ) : (
              isOwned && (
                <p className="text-xs text-gray-500">Add key features of property</p>
              )
            )}
          </div>

          {isOwned && (
            <div className="pt-2 pb-2">
              <button
                onClick={() => onTogglePublic?.(property.id, property.is_public === 0)}
                className={`w-full px-4 py-2.5 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-colors ${
                  property.is_public === 1
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {property.is_public === 1 ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Public - Visible to everyone</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Private - Only visible to you</span>
                  </>
                )}
              </button>
            </div>
          )}

          {isOwned && property.note_private && (
            <div className="pt-3 sm:pt-4 border-t border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                Note <span className="text-xs text-gray-500 normal-case font-normal">(Only for you)</span>
              </h3>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                {property.note_private}
              </p>
            </div>
          )}

          {isOwned && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Tags <span className="text-xs text-gray-500 normal-case font-normal">(Only for you)</span>
                </h3>
                <button
                  onClick={() => setShowTagModal(true)}
                  className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {selectedTags.length > 0 ? (
                    "Manage"
                  ) : (
                    <>
                      <Plus className="w-4 h-4 inline" /> Add
                    </>
                  )}
                </button>
              </div>
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Add tags to help you organize and find properties easily</p>
              )}
            </div>
          )}

     <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Share</p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      onClick={handleCopy}
                      className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => {
                        onShare?.(property);
                        onClose();
                      }}
                      className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Share
                    </button>
                  </div>
                </div>
          <div className="pt-4 sm:pt-6 border-t border-gray-200 space-y-2 sm:space-y-3">
            {isOwned ? (
              <>
                <button
                  onClick={() => onEdit?.(property)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Edit
                </button>
           
                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (confirm('Delete this property?')) {
                        onDelete?.(property.id);
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-red-50 text-red-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Delete
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[98vh] sm:max-h-[80vh] overflow-y-auto animate-slide-up">
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
                placeholder="Add custom highlights"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    toggleHighlight(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />

              <div className="flex flex-wrap gap-2">
                {HIGHLIGHT_OPTIONS.map((highlight) => (
                  <button
                    key={highlight}
                    type="button"
                    onClick={() => toggleHighlight(highlight)}
                    className={`px-4 py-2 rounded-xl transition-colors text-sm ${
                      selectedHighlights.includes(highlight)
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {highlight}
                  </button>
                ))}
              </div>

              {selectedHighlights.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedHighlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        {highlight}
                        <button
                          type="button"
                          onClick={() => toggleHighlight(highlight)}
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[98vh] sm:max-h-[80vh] overflow-y-auto animate-slide-up">
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
                placeholder="Add custom tags"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    toggleTag(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
              />

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

              {selectedTags.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
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
    </div>
  );
}
