import { useState, useEffect, useMemo, useRef } from 'react';
import { X, MapPin, ChevronDown } from 'lucide-react';
import { Property, PropertyFormData } from '../types/property';
import { getUserSettings } from '../types/userSettings';
import {
  AREA_OPTIONS,
  CITY_OPTIONS_WITH_LABELS,
  PROPERTY_TYPE_OPTIONS,
  SIZE_UNIT_OPTIONS,
} from '../utils/filterOptions';

interface PropertyModalProps {
  property?: Property | null;
  onClose: () => void;
  onSubmit: (data: PropertyFormData) => void;
}

const STORAGE_KEY = 'propnetwork_property_form_draft';

export function PropertyModal({ property, onClose, onSubmit }: PropertyModalProps) {
  // Load draft from localStorage if no property (new property) - memoize to prevent re-renders
  const draftData = useMemo(() => {
    if (property) return null; // Don't load draft when editing
    try {
      const draft = localStorage.getItem(STORAGE_KEY);
      if (draft) {
        return JSON.parse(draft);
      }
    } catch {}
    return null;
  }, [property]);

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
      min_size: undefined,
      size_max: undefined,
      size_unit: userSettings.defaultSizeUnit || 'Sqyd',
      price_min: undefined,
      price_max: undefined,
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
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [showSizeUnitDropdown, setShowSizeUnitDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showPropertyTypeDropdown, setShowPropertyTypeDropdown] = useState(false);
  
  const sizeUnitDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const propertyTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Memoize button text to prevent unnecessary re-renders
  const sizeRangeButtonText = useMemo(() => showSizeRange ? 'Hide Range' : 'Show Range', [showSizeRange]);
  const priceRangeButtonText = useMemo(() => showPriceRange ? 'Hide Range' : 'Show Range', [showPriceRange]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sizeUnitDropdownRef.current && !sizeUnitDropdownRef.current.contains(event.target as Node)) {
        setShowSizeUnitDropdown(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
      if (propertyTypeDropdownRef.current && !propertyTypeDropdownRef.current.contains(event.target as Node)) {
        setShowPropertyTypeDropdown(false);
      }
    };

    if (showSizeUnitDropdown || showCityDropdown || showPropertyTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSizeUnitDropdown, showCityDropdown, showPropertyTypeDropdown]);

  const currentSizeUnitLabel = SIZE_UNIT_OPTIONS.find(opt => opt.value === formData.size_unit)?.label || formData.size_unit;
  const currentCityLabel = CITY_OPTIONS_WITH_LABELS.find(opt => opt.value === formData.city)?.label || formData.city;
  const currentPropertyTypeLabel = PROPERTY_TYPE_OPTIONS.find(opt => opt.value === formData.type)?.label || formData.type || 'Select property type';

  // Save draft to localStorage as user types (only for new properties, not edits)
  // Use debounce to prevent excessive re-renders
  useEffect(() => {
    if (!property) {
      // Only save draft for new properties
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...formData,
            showSizeRange,
            showPriceRange,
          }));
        } catch {}
      }, 300); // Debounce by 300ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, showSizeRange, showPriceRange, property]);

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
      // Only update range visibility if it actually changed
      const newShowSizeRange = property.min_size !== property.size_max;
      const newShowPriceRange = property.price_min !== property.price_max;
      setShowSizeRange(prev => prev !== newShowSizeRange ? newShowSizeRange : prev);
      setShowPriceRange(prev => prev !== newShowPriceRange ? newShowPriceRange : prev);
    } else if (draftData) {
      // Restore range visibility from draft (only if explicitly saved)
      // Only update if different to prevent unnecessary re-renders
      if (typeof draftData.showSizeRange === 'boolean') {
        setShowSizeRange(prev => prev !== draftData.showSizeRange ? draftData.showSizeRange : prev);
      }
      if (typeof draftData.showPriceRange === 'boolean') {
        setShowPriceRange(prev => prev !== draftData.showPriceRange ? draftData.showPriceRange : prev);
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
      // Highlights and tags are managed from view screen, not during add/edit
      highlights: property?.highlights || '',
      tags: property?.tags || '',
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
          ? value === '' ? undefined : (isNaN(parseFloat(value)) ? undefined : parseFloat(value))
          : value,
    }));
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[98vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="z-10 sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
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
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4 md:space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                Area/Address
              </label>
              <div className="relative" ref={cityDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 hover:text-gray-900 inline-flex items-center gap-0.5"
                >
                  <span>{currentCityLabel}</span>
                  <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCityDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[120px]">
                    {CITY_OPTIONS_WITH_LABELS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, city: option.value }));
                          setShowCityDropdown(false);
                        }}
                        className={`w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                          formData.city === option.value
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 pr-8 sm:pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
                placeholder="Sector 18"
                required
              />
              <MapPin className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              {showAreaSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {AREA_OPTIONS.filter(area =>
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
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              Property type
            </label>
            <div className="relative" ref={propertyTypeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPropertyTypeDropdown(!showPropertyTypeDropdown)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  !formData.type ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                <span>{currentPropertyTypeLabel}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showPropertyTypeDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showPropertyTypeDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {PROPERTY_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, type: option.value }));
                        setShowPropertyTypeDropdown(false);
                      }}
                      className={`w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                        formData.type === option.value
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                <span>Size (in </span>
                <span className="relative inline-block" ref={sizeUnitDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowSizeUnitDropdown(!showSizeUnitDropdown)}
                    className="text-gray-700 hover:text-gray-900 inline-flex items-center gap-0.5"
                  >
                    <span>{currentSizeUnitLabel}</span>
                    <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${showSizeUnitDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showSizeUnitDropdown && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[120px]">
                      {SIZE_UNIT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, size_unit: option.value as any }));
                            setShowSizeUnitDropdown(false);
                          }}
                          className={`w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                            formData.size_unit === option.value
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
                <span>)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSizeRange(!showSizeRange)}
                className="text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-700"
              >
                {sizeRangeButtonText}
              </button>
            </div>
            {showSizeRange ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <input
                  type="number"
                  name="min_size"
                  value={formData.min_size !== undefined && formData.min_size !== null ? formData.min_size : ''}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
                  placeholder="100"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  name="size_max"
                  value={formData.size_max !== undefined && formData.size_max !== null ? formData.size_max : ''}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
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
                  value={formData.min_size !== undefined && formData.min_size !== null ? formData.min_size : ''}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
                  placeholder="150"
                  step="0.01"
                  required
                />
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                Price (in lakhs)
              </label>
              <button
                type="button"
                onClick={() => setShowPriceRange(!showPriceRange)}
                className="text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-700"
              >
                {priceRangeButtonText}
              </button>
            </div>
            {showPriceRange ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <input
                  type="number"
                  name="price_min"
                  value={formData.price_min !== undefined && formData.price_min !== null ? formData.price_min : ''}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
                  placeholder="20"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  name="price_max"
                  value={formData.price_max !== undefined && formData.price_max !== null ? formData.price_max : ''}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
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
                  value={formData.price_min !== undefined && formData.price_min !== null ? formData.price_min : ''}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400"
                  placeholder="1 Crore = 100 Lakhs"
                  step="0.01"
                  required
                />
            
              </>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400 resize-none"
              placeholder="Add Detailed Property description Here"
            />
            <p className="text-xs text-gray-500 mt-1">like dimensions, built-up age, nearby landmarks, facing direction, etc</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              Private notes <span className="text-xs text-gray-500 normal-case">(Only for you)</span>
            </label>
            <textarea
              name="note_private"
              value={formData.note_private}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400 resize-none"
              placeholder="Personal notes"
            />
            <p className="text-xs text-gray-500 mt-1">Add private details like plot number, deal price, owner info, etc</p>
          </div>

          <div 
            className="flex items-center justify-between w-full py-3 sm:py-4 px-3 sm:px-4 border-2 border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={() => setFormData((prev) => ({ ...prev, is_public: prev.is_public === 1 ? 0 : 1 }))}
          >
            <label 
              className="text-sm sm:text-base font-medium text-gray-900 cursor-pointer"
              onClick={(e) => e.preventDefault()}
            >
              Make this property visible to everyone
            </label>
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public === 1}
              readOnly
              onClick={(e) => {
                e.stopPropagation();
                setFormData((prev) => ({ ...prev, is_public: prev.is_public === 1 ? 0 : 1 }));
              }}
              className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-white border-2 border-gray-500 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer checked:bg-blue-600 checked:border-blue-600 flex-shrink-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={() => {
                // Clear draft when cancelled
                if (!property) {
                  localStorage.removeItem(STORAGE_KEY);
                }
                onClose();
              }}
              className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              {property ? 'Update Property' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
