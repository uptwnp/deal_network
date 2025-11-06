import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Ruler, IndianRupee, Home, Share2, MessageCircle, Building, Navigation, Calendar, Tag, Globe, Star, TrendingUp, TreePine, CornerDownRight, Shield, Wifi, CheckCircle, AlertCircle } from 'lucide-react';
import { Property } from '../types/property';
import { propertyApi } from '../services/api';
import { formatPrice, formatPriceWithLabel } from '../utils/priceFormatter';
import { HIGHLIGHT_OPTIONS } from '../utils/filterOptions';

export function PublicPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const fetchProperty = async () => {
      if (!id) {
        setError('Invalid property ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const propertyId = parseInt(id);
        if (isNaN(propertyId)) {
          setError('Invalid property ID');
          setLoading(false);
          return;
        }
        
        // Get property using the public endpoint (single API request)
        // The API function now has built-in request deduplication
        const foundProperty = await propertyApi.getPropertyById(propertyId);
        
        if (foundProperty && foundProperty.is_public === 1) {
          setProperty(foundProperty);
        } else {
          setError('Property not found or not publicly available. The property may be private or the link may be invalid.');
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError' || err.message === 'canceled') {
          return;
        }
        console.error('Failed to fetch property:', err);
        setError('Failed to load property. It may not be publicly available or the server may be unreachable.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
    
    // Cleanup: abort request if component unmounts or id changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  const handleShare = () => {
    if (navigator.share && property) {
      const sizeText = property.min_size === property.size_max
        ? `${property.min_size} ${property.size_unit}`
        : `${property.min_size}-${property.size_max} ${property.size_unit}`;
      const priceText = formatPriceWithLabel(property.price_min, property.price_max);
      const text = `${property.type} in ${property.area}, ${property.city}\n${property.description}\nSize: ${sizeText}\nPrice: ${priceText}`;

      navigator.share({
        title: `${property.type} - ${property.area}`,
        text,
        url: window.location.href,
      }).catch(() => {});
    } else if (property) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleContact = () => {
    if (property) {
      const phone = '919710858000'; // Default contact
      const message = `Hi, I'm interested in this property: ${property.type} in ${property.area}, ${property.city}`;
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const parseLocation = (location: string | undefined): { lat: number; lng: number } | null => {
    if (!location) return null;
    const parts = location.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  };

  const locationCoords = property ? parseLocation(property.location) : null;

  const handleOpenInMap = () => {
    if (!locationCoords) return;
    const { lat, lng } = locationCoords;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const highlights = property?.highlights ? property.highlights.split(',').map(h => h.trim()).filter(Boolean) : [];
  const tags = property?.tags ? property.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Property Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'This property is not available or has been removed.'}</p>
          <p className="text-sm text-gray-500 mb-6">
            Note: Public property pages require the property to be marked as public and may require authentication to view.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </Link>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Login to View
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">PropNetwork</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Property Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-blue-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-5 h-5" />
                  <h2 className="text-2xl font-bold">{property.type}</h2>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <MapPin className="w-4 h-4" />
                  <span className="text-lg">{property.area}, {property.city}</span>
                </div>
              </div>
              {property.is_public === 1 && (
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">Public</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Ruler className="w-4 h-4" />
                  <span className="text-xs font-medium">Size</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {property.min_size === property.size_max
                    ? `${property.min_size} ${property.size_unit}`
                    : `${property.min_size}-${property.size_max} ${property.size_unit}`}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <IndianRupee className="w-4 h-4" />
                  <span className="text-xs font-medium">Price</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPriceWithLabel(property.price_min, property.price_max)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-medium">Area</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{property.area}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Building className="w-4 h-4" />
                  <span className="text-xs font-medium">City</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{property.city}</p>
              </div>
            </div>

            {/* Highlights */}
            {highlights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Highlights</h3>
                <div className="flex flex-wrap gap-2">
                  {highlights.map((highlight, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {locationCoords && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                <button
                  onClick={handleOpenInMap}
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-blue-700 font-medium"
                >
                  <Navigation className="w-5 h-5" />
                  Open in Google Maps
                </button>
                {property.location_accuracy && (
                  <p className="text-sm text-gray-600 mt-2">Accuracy: {property.location_accuracy}</p>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={handleContact}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Contact via WhatsApp
              </button>
              <Link
                to="/login"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
              >
                Join PropNetwork to See More Properties
              </Link>
            </div>
          </div>
        </div>

        {/* Marketing Section */}
        <div className="bg-blue-600 rounded-lg p-6 text-white mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Join PropNetwork Today! 🚀</h3>
              <p className="text-blue-100 mb-4">
                Connect with property dealers, discover exclusive listings, and grow your real estate network.
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

