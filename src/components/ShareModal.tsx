import { useState, useEffect } from 'react';
import { X, Copy, Share2, Check } from 'lucide-react';
import { Property } from '../types/property';
import { formatPriceWithLabel } from '../utils/priceFormatter';
import { formatSize } from '../utils/sizeFormatter';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface ShareModalProps {
  property: Property;
  isOwned: boolean;
  onClose: () => void;
}

// Helper function to check if location has lat/long format
function hasLocationCoordinates(location: string | undefined): boolean {
  if (!location) return false;
  const latLongPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
  return latLongPattern.test(location.trim());
}

// Parse location coordinates
function parseLocation(location: string | undefined): { lat: number; lng: number } | null {
  if (!hasLocationCoordinates(location || '')) return null;
  const parts = (location || '').split(',');
  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

export function ShareModal({ property, isOwned, onClose }: ShareModalProps) {
  const [selectedFields, setSelectedFields] = useState({
    id: true,
    heading: true,
    price: true,
    description: true,
    note: false, // unchecked by default
    locationLink: false,
    landmarkLink: false,
    link: false,
  });
  const [copied, setCopied] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  const locationCoords = parseLocation(property.location);
  const hasLocation = hasLocationCoordinates(property.location);
  const landmarkCoords = parseLocation(property.landmark_location);
  const hasLandmarkLocation = hasLocationCoordinates(property.landmark_location);
  const shareUrl = property.is_public === 1 
    ? `${window.location.origin}/property/${property.id}`
    : undefined;

  const toggleField = (field: keyof typeof selectedFields) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const buildShareText = (): string => {
    const parts: string[] = [];

    // Heading (no label)
    if (selectedFields.heading) {
      const sizeText = formatSize(property.size_min, property.size_max, property.size_unit);
      const headingParts: string[] = [];
      if (sizeText) {
        headingParts.push(sizeText);
      }
      headingParts.push(property.type);
      if (property.area && property.city) {
        headingParts.push(`in ${property.area}, ${property.city}`);
      } else if (property.area) {
        headingParts.push(`in ${property.area}`);
      } else if (property.city) {
        headingParts.push(`in ${property.city}`);
      }
      parts.push(headingParts.join(' '));
    }

    // Price
    if (selectedFields.price) {
      const priceText = formatPriceWithLabel(property.price_min, property.price_max);
      if (priceText) {
        parts.push(`Price: ${priceText}`);
      }
    }

    // Description (with "Descrption - " prefix - note the misspelling)
    if (selectedFields.description && property.description) {
      parts.push(`Descrption - ${property.description}`);
    }

    // Note
    if (selectedFields.note && property.note_private) {
      parts.push(`Note: ${property.note_private}`);
    }

    // Location
    if (selectedFields.locationLink && hasLocation && locationCoords) {
      const googleMapsUrl = `https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}`;
      const locationText = property.location_accuracy
        ? `Location: ${googleMapsUrl} (Accuracy: ${property.location_accuracy})`
        : `Location: ${googleMapsUrl}`;
      parts.push(locationText);
    }

    // Landmark
    if (selectedFields.landmarkLink && property.landmark_location) {
      if (hasLandmarkLocation && landmarkCoords) {
        // If landmark has coordinates, create Google Maps link
        const googleMapsUrl = `https://www.google.com/maps?q=${landmarkCoords.lat},${landmarkCoords.lng}`;
        const landmarkText = property.landmark_location_distance
          ? `Landmark: ${googleMapsUrl} (${property.landmark_location_distance} away)`
          : `Landmark: ${googleMapsUrl}`;
        parts.push(landmarkText);
      } else {
        // If landmark is just text, create a search link
        const searchQuery = encodeURIComponent(property.landmark_location);
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
        const landmarkText = property.landmark_location_distance
          ? `Landmark: ${googleMapsUrl} (${property.landmark_location_distance} away)`
          : `Landmark: ${googleMapsUrl}`;
        parts.push(landmarkText);
      }
    }

    // Separator and View Link
    if (selectedFields.link && shareUrl) {
      parts.push('---');
      parts.push(`View Here: ${shareUrl}`);
    }

    // ID at the end
    if (selectedFields.id) {
      parts.push(`Id : ${property.id}`);
    }

    return parts.join('\n');
  };

  const handleCopy = () => {
    const text = buildShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = buildShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.type} - ${property.area}`,
          text: text,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          // Fallback to copy if share fails
          handleCopy();
        }
      }
    } else {
      // Fallback to copy if share API not available
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md mobile-modal-content sm:max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Share Property</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-xs text-gray-600 mb-3">Select fields to include:</p>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={selectedFields.id}
                  onChange={() => toggleField('id')}
                  className="sr-only"
                />
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                  selectedFields.id ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {selectedFields.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-xs font-medium text-gray-900">ID</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={selectedFields.heading}
                  onChange={() => toggleField('heading')}
                  className="sr-only"
                />
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                  selectedFields.heading ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {selectedFields.heading && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-xs font-medium text-gray-900">Heading</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={selectedFields.price}
                  onChange={() => toggleField('price')}
                  className="sr-only"
                />
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                  selectedFields.price ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {selectedFields.price && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-xs font-medium text-gray-900">Price</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={selectedFields.description}
                  onChange={() => toggleField('description')}
                  className="sr-only"
                />
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                  selectedFields.description ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {selectedFields.description && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-xs font-medium text-gray-900">Description</span>
            </label>

            {isOwned && property.note_private && (
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedFields.note}
                    onChange={() => toggleField('note')}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                    selectedFields.note ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedFields.note && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-900">Note</span>
              </label>
            )}

            {hasLocation && isOwned && (
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedFields.locationLink}
                    onChange={() => toggleField('locationLink')}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                    selectedFields.locationLink ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedFields.locationLink && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-900">Location</span>
              </label>
            )}

            {property.landmark_location && (
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedFields.landmarkLink}
                    onChange={() => toggleField('landmarkLink')}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                    selectedFields.landmarkLink ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedFields.landmarkLink && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-900">Landmark</span>
              </label>
            )}

            {shareUrl && (
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedFields.link}
                    onChange={() => toggleField('link')}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                    selectedFields.link ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedFields.link && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-900">View Link</span>
              </label>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleShare}
              className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

