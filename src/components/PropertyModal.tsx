import { useState, useEffect } from 'react';
import { X, MapPin, Plus } from 'lucide-react';
import { Property, PropertyFormData } from '../types/property';
import { getUserSettings } from '../types/userSettings';

interface PropertyModalProps {
  property?: Property | null;
  onClose: () => void;
  onSubmit: (data: PropertyFormData) => void;
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

const STORAGE_KEY = 'propnetwork_property_form_draft';

const AREA_SUGGESTIONS = [
  'Sector 15',
  'Sector 16',
  'Sector 17',
  'Sector 18',
  'Sector 19',
  'Sector 20',
  'Sector 21',
  'Sector 22',
  'Sector 23',
  'Sector 24',
  'Sector 25',
  'Model Town',
  'Civil Lines',
  'GT Road',
  'Huda Sector',
  'Industrial Area',
];

export function PropertyModal({ property, onClose, onSubmit }: PropertyModalProps) {
  // Load draft from localStorage if no property (new property)
  const loadDraft = (): PropertyFormData | null => {
    if (property) return null; // Don't load draft when editing
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        return JSON.parse(draft);
      }
    } catch {}
    return null;
  };

  const draftData = loadDraft();

  // Get user settings for defaults
  const userSettings = getUserSettings();

  const [formData, setFormData] = useState<PropertyFormData>(
    property ? {
      city: property.city,
      area: property.area,
      type: property.type,
      description: property.description,
      note_private: property.note_private || '',
      min_size: property.min_size,
      size_max: property.size_max,
      size_unit: property.size_unit,
      price_min: property.price_min,
      price_max: property.price_max,
      location: property.location,
      location_accuracy: property.location_accuracy || 'Medium',
      is_public: property.is_public,
      tags: property.tags || '',
      highlights: property.highlights || '',
      public_rating: property.public_rating || 0,
      my_rating: property.my_rating || 0,
    } : (draftData || {
      city: userSettings.city || 'Panipat',
      area: userSettings.preferredAreas.length > 0 ? userSettings.preferredAreas[0] : '',
      type: userSettings.preferredPropertyTypes.length > 0 ? userSettings.preferredPropertyTypes[0] : '',
      description: '',
      note_private: '',
      min_size: 0,
      size_max: 0,
      size_unit: userSettings.defaultSizeUnit || 'Sqyd',
      price_min: userSettings.defaultPriceMin || 0,
      price_max: userSettings.defaultPriceMax || 0,
      location: '',
      location_accuracy: 'Medium',
      is_public: 0,
      tags: '',
      highlights: '',
      public_rating: 0,
      my_rating: 0,
    })
  );

  const [showSizeRange, setShowSizeRange] = useState(false);
  const [showPriceRange, setShowPriceRange] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>(
    property 
      ? (property.highlights ? property.highlights.split(',').map(h => h.trim()) : [])
      : (draftData?.highlights ? draftData.highlights.split(',').map(h => h.trim()).filter(Boolean) : [])
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    property
      ? (property.tags ? property.tags.split(',').map(t => t.trim()) : [])
      : (draftData?.tags ? draftData.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
  );
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);

  // Save draft to localStorage as user types (only for new properties, not edits)
  useEffect(() => {
    if (!property) {
      // Only save draft for new properties
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...formData,
          highlights: selectedHighlights.join(', '),
          tags: selectedTags.join(', '),
          showSizeRange,
          showPriceRange,
        }));
      } catch {}
    }
  }, [formData, selectedHighlights, selectedTags, showSizeRange, showPriceRange, property]);

  useEffect(() => {
    if (property) {
      setFormData({
        city: property.city,
        area: property.area,
        type: property.type,
        description: property.description,
        note_private: property.note_private || '',
        min_size: property.min_size,
        size_max: property.size_max,
        size_unit: property.size_unit,
        price_min: property.price_min,
        price_max: property.price_max,
        location: property.location,
        location_accuracy: property.location_accuracy || 'Medium',
        is_public: property.is_public,
        tags: property.tags || '',
        highlights: property.highlights || '',
        public_rating: property.public_rating || 0,
        my_rating: property.my_rating || 0,
      });
      setSelectedHighlights(property.highlights ? property.highlights.split(',').map(h => h.trim()) : []);
      setSelectedTags(property.tags ? property.tags.split(',').map(t => t.trim()) : []);
      setShowSizeRange(property.min_size !== property.size_max);
      setShowPriceRange(property.price_min !== property.price_max);
    } else if (draftData) {
      // Restore range visibility from draft (only if explicitly saved)
      if (typeof draftData.showSizeRange === 'boolean') {
        setShowSizeRange(draftData.showSizeRange);
      }
      if (typeof draftData.showPriceRange === 'boolean') {
        setShowPriceRange(draftData.showPriceRange);
      }
    }
  }, [property, draftData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.city || !formData.area || !formData.type) {
      alert('Please fill in all required fields');
      return;
    }

    const finalData = {
      ...formData,
      size_max: showSizeRange ? formData.size_max : formData.min_size,
      price_max: showPriceRange ? formData.price_max : formData.price_min,
      highlights: selectedHighlights.join(', '),
      tags: selectedTags.join(', '),
    };

    // Clear draft on successful submit
    if (!property) {
      localStorage.removeItem(STORAGE_KEY);
    }

    onSubmit(finalData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? parseFloat(value) || 0
          : value,
    }));
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="z-10 sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {property ? 'Edit Property' : 'Add Property'}
          </h2>
          <button
            onClick={() => {
              // Clear draft when closed
              if (!property) {
                localStorage.removeItem(STORAGE_KEY);
              }
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                Area/Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={(e) => {
                    handleChange(e);
                    setShowAreaSuggestions(true);
                  }}
                  onFocus={() => setShowAreaSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 200)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Sector 18"
                  required
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              {showAreaSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {AREA_SUGGESTIONS.filter(area =>
                    area.toLowerCase().includes(formData.area.toLowerCase())
                  ).map((area, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, area }));
                        setShowAreaSuggestions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm text-gray-700"
                    >
                      {area}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                City
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none bg-white"
                required
              >
                <option value="Panipat">Panipat</option>
                <option value="Delhi">Delhi</option>
                <option value="Gurgaon">Gurgaon</option>
                <option value="Noida">Noida</option>
                <option value="Faridabad">Faridabad</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Property Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 appearance-none bg-white"
              required
            >
              <option value="">Select property type</option>
              <option value="Residential Plot">Residential Plot</option>
              <option value="Commercial Plot">Commercial Plot</option>
              <option value="House">House</option>
              <option value="Apartment">Apartment</option>
              <option value="Agriculture Land">Agriculture Land</option>
              <option value="Industrial Plot">Industrial Plot</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Size
              </label>
              <div className="flex items-center gap-3">
                <select
                  name="size_unit"
                  value={formData.size_unit}
                  onChange={handleChange}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Sqyd">Sq. Yard</option>
                  <option value="Sqft">Sq. Ft</option>
                  <option value="Acre">Acre</option>
                  <option value="Marla">Marla</option>
                  <option value="Kanal">Kanal</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowSizeRange(!showSizeRange)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Show Range
                </button>
              </div>
            </div>
            {showSizeRange ? (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="min_size"
                  value={formData.min_size || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="100"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  name="size_max"
                  value={formData.size_max || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="200"
                  step="0.01"
                  required
                />
              </div>
            ) : (
              <>
                <input
                  type="number"
                  name="min_size"
                  value={formData.min_size || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="150"
                  step="0.01"
                  required
                />
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Price (In Lakhs)
              </label>
              <button
                type="button"
                onClick={() => setShowPriceRange(!showPriceRange)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Show Range
              </button>
            </div>
            {showPriceRange ? (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  name="price_min"
                  value={formData.price_min || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="20"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  name="price_max"
                  value={formData.price_max || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="30"
                  step="0.01"
                  required
                />
              </div>
            ) : (
              <>
                <input
                  type="number"
                  name="price_min"
                  value={formData.price_min || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="25"
                  step="0.01"
                  required
                />
            
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
              placeholder="Add Detailed Property description Here"
            />
            <p className="text-xs text-gray-500 mt-1">like dimensions, built-up age, nearby landmarks, facing direction, etc</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Private Notes <span className="text-xs text-gray-500 normal-case">(Only for you)</span>
            </label>
            <textarea
              name="note_private"
              value={formData.note_private}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
              placeholder="Personal notes"
            />
            <p className="text-xs text-gray-500 mt-1">Add private details like plot number, deal price, owner info, etc</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Highlights
              </label>
              <button
                type="button"
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
              
            </div>
          {selectedHighlights.length < 1 ? (
  <p className="text-xs text-gray-500">Add key features of property</p>
) : null}

            {selectedHighlights.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedHighlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Tags <span className="text-xs text-gray-500 normal-case">(Only for you)</span>
              </label>
              <button
                type="button"
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
              {selectedTags.length < 1 ? (
 <p className="text-xs text-gray-500">Add tags to help you organize and find properties easily</p>) : null}
            
           
            {selectedTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 py-4">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public === 1}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_public: e.target.checked ? 1 : 0 }))
              }
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-base font-medium text-gray-900">
              Make this property visible to everyone
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4">
            <button
              type="submit"
              className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              {property ? 'Update Property' : 'Add Property'}
            </button>
            <button
              type="button"
              onClick={() => {
                // Clear draft when cancelled
                if (!property) {
                  localStorage.removeItem(STORAGE_KEY);
                }
                onClose();
              }}
              className="px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {showHighlightModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[80vh] overflow-y-auto animate-slide-up">
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
                placeholder="Add select highlights"
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
                  onClick={() => setShowHighlightModal(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Done
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[80vh] overflow-y-auto animate-slide-up">
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
                  onClick={() => setShowTagModal(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Done
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
