import { useState } from 'react';
import { X, Copy, Share2, Eye, EyeOff, Trash2, MessageCircle, Edit2 } from 'lucide-react';
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
}: PropertyDetailsModalProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up">
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
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Location
            </h3>
            <p className="text-lg text-gray-900">
              {property.area}, {property.city}
            </p>
            {property.location && (
              <p className="text-sm text-gray-600 mt-1">{property.location}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Size</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900">
                {property.min_size === property.size_max
                  ? property.min_size
                  : `${property.min_size}-${property.size_max}`}
                      <span className="text-xs sm:text-sm text-gray-700"> {property.size_unit}</span>
              </p>
        
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Price</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900">
                {property.price_min === property.price_max
                  ? `₹${property.price_min}L`
                  : `₹${property.price_min}-${property.price_max}L`}
              </p>
            </div>
          </div>

          {property.highlights && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Highlights
              </h3>
              <div className="flex flex-wrap gap-2">
                {property.highlights.split(',').map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
                  >
                    {highlight.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {property.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Description
              </h3>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </div>
          )}

          {isOwned && property.note_private && (

       <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Note <span className="text-xs text-gray-500 normal-case font-normal">(Only for you)</span>
              </h3>
              <p className="text-gray-700 leading-relaxed">{property.note_private}</p>
            </div>
          )}

          {isOwned && property.tags && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Tags <span className="text-xs text-gray-500 normal-case font-normal">(Only for you)</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {property.tags.split(',').map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isOwned && property.is_public === 1 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Eye className="w-4 h-4 text-green-700" />
              <span className="text-sm font-medium text-green-800">This property is visible to everyone</span>
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
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => onEdit?.(property)}
                    className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => onTogglePublic?.(property.id, property.is_public === 0)}
                    className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {property.is_public === 1 ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Make Private</span>
                        <span className="sm:hidden">Private</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Make Public</span>
                        <span className="sm:hidden">Public</span>
                      </>
                    )}
                  </button>
                </div>
           
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
    </div>
  );
}
