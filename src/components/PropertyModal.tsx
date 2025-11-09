import { useState, useEffect, useMemo, useRef } from 'react';
import { X, MapPin, ChevronDown, Ruler, IndianRupee, FileText, Lock, Globe } from 'lucide-react';
import { Property, PropertyFormData } from '../types/property';
import { getUserSettings } from '../types/userSettings';
import { useAuth } from '../contexts/AuthContext';
import {
  AREA_OPTIONS,
  CITY_OPTIONS_WITH_LABELS,
  PROPERTY_TYPE_OPTIONS,
  SIZE_UNIT_OPTIONS,
} from '../utils/filterOptions';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface PropertyModalProps {
  property?: Property | null;
  onClose: () => void;
  onSubmit: (data: PropertyFormData) => void;
}

const STORAGE_KEY = 'propnetwork_property_form_draft';
const LAST_AREA_KEY = 'propnetwork_last_area';
const LAST_CITY_KEY = 'propnetwork_last_city';
const LAST_UNIT_KEY = 'propnetwork_last_unit';

export function PropertyModal({ property, onClose, onSubmit }: PropertyModalProps) {
  const [showNoteTooltip, setShowNoteTooltip] = useState(false);
  const { user } = useAuth();
  
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

  // Load last selected area, city, and unit from localStorage
  const getLastSelections = useMemo(() => {
    try {
      return {
        area: localStorage.getItem(LAST_AREA_KEY) || '',
        city: localStorage.getItem(LAST_CITY_KEY) || '',
        unit: localStorage.getItem(LAST_UNIT_KEY) || '',
      };
    } catch {
      return { area: '', city: '', unit: '' };
    }
  }, []);

  // Get user settings for defaults (fallback for size unit)
  const userSettings = getUserSettings();
  
  // Parse user's default values from AuthContext
  // default_area and default_type are stored as comma-separated strings
  const getDefaultArea = (): string => {
    if (user?.default_area) {
      const areas = user.default_area.split(',').map(a => a.trim()).filter(a => a);
      if (areas.length > 0) return areas[0];
    }
    return '';
  };
  
  const getDefaultType = (): string => {
    if (user?.default_type) {
      const types = user.default_type.split(',').map(t => t.trim()).filter(t => t);
      if (types.length > 0) return types[0];
    }
    return '';
  };
  
  const getUserDefaultCity = (): string => {
    return user?.default_city || '';
  };

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
      // Priority: last selections > user defaults > userSettings > fallback
      city: getLastSelections.city || getUserDefaultCity() || userSettings.city || 'Panipat',
      area: getLastSelections.area || getDefaultArea() || (userSettings.preferredAreas.length > 0 ? userSettings.preferredAreas[0] : ''),
      type: getDefaultType() || (userSettings.preferredPropertyTypes.length > 0 ? userSettings.preferredPropertyTypes[0] : ''),
      description: '',
      note_private: '',
      min_size: undefined,
      size_max: undefined,
      size_unit: getLastSelections.unit || userSettings.defaultSizeUnit || 'Gaj',
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

  // Save last selected area, city, and unit to localStorage whenever they change
  useEffect(() => {
    if (!property && formData.area) {
      try {
        localStorage.setItem(LAST_AREA_KEY, formData.area);
      } catch {}
    }
  }, [formData.area, property]);

  useEffect(() => {
    if (!property && formData.city) {
      try {
        localStorage.setItem(LAST_CITY_KEY, formData.city);
      } catch {}
    }
  }, [formData.city, property]);

  useEffect(() => {
    if (!property && formData.size_unit) {
      try {
        localStorage.setItem(LAST_UNIT_KEY, formData.size_unit);
      } catch {}
    }
  }, [formData.size_unit, property]);

  // Update formData when property changes (for editing)
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

  // Update defaults when user object becomes available (for new properties only)
  // This handles the case where user loads after component mounts
  useEffect(() => {
    // Only update for new properties (not editing) and when no draft exists
    if (!property && !draftData && user) {
      setFormData(prev => {
        const updates: Partial<PropertyFormData> = {};
        let hasUpdates = false;

        // Update city if it's using the fallback value or empty
        // Check if current city is the fallback, or if user has a default city that's different
        const currentCity = prev.city || '';
        const fallbackCity = userSettings.city || 'Panipat';
        const userDefaultCity = user.default_city || '';
        
        if (userDefaultCity && (currentCity === fallbackCity || !currentCity)) {
          updates.city = userDefaultCity;
          hasUpdates = true;
        }

        // Update area if empty and user has a default area
        if (!prev.area && user.default_area) {
          const areas = user.default_area.split(',').map(a => a.trim()).filter(a => a);
          if (areas.length > 0) {
            updates.area = areas[0];
            hasUpdates = true;
          }
        }

        // Update type if empty and user has a default type
        if (!prev.type && user.default_type) {
          const types = user.default_type.split(',').map(t => t.trim()).filter(t => t);
          if (types.length > 0) {
            updates.type = types[0];
            hasUpdates = true;
          }
        }

        return hasUpdates ? { ...prev, ...updates } : prev;
      });
    }
  }, [user?.default_city, user?.default_area, user?.default_type, property, draftData, userSettings.city]);

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


  // Lock body scroll when modal is open
  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 mobile-modal-container">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl mobile-modal-content sm:max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="z-10 sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
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
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Area/Address
              </label>
              <div className="relative" ref={cityDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  className="px-2 py-1 text-xs text-gray-700 hover:text-gray-900 inline-flex items-center gap-0.5"
                >
                  <span>{currentCityLabel}</span>
                  <ChevronDown className={`w-2.5 h-2.5 text-gray-500 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
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
                        className={`w-full px-2.5 sm:px-3 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
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
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                placeholder="Sector 18"
                required
              />
              <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
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
                      className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-xs text-gray-700"
                    >
                      {area}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Property type
            </label>
            <div className="relative" ref={propertyTypeDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPropertyTypeDropdown(!showPropertyTypeDropdown)}
                className={`w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  !formData.type ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                <span>{currentPropertyTypeLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showPropertyTypeDropdown ? 'rotate-180' : ''}`} />
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
                      className={`w-full px-2.5 sm:px-3 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Ruler className="w-3 h-3 text-gray-500" />
                <span>Size (in </span>
                <span className="relative inline-block" ref={sizeUnitDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowSizeUnitDropdown(!showSizeUnitDropdown)}
                    className="text-gray-700 hover:text-gray-900 inline-flex items-center gap-0.5"
                  >
                    <span>{currentSizeUnitLabel}</span>
                    <ChevronDown className={`w-2.5 h-2.5 text-gray-500 transition-transform ${showSizeUnitDropdown ? 'rotate-180' : ''}`} />
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
                          className={`w-full px-2.5 sm:px-3 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors ${
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
                className="text-xs font-medium text-gray-600 hover:text-gray-700"
              >
                {sizeRangeButtonText}
              </button>
            </div>
            {showSizeRange ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  name="min_size"
                  value={formData.min_size !== undefined && formData.min_size !== null ? formData.min_size : ''}
                  onChange={handleChange}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                  placeholder="100"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  name="size_max"
                  value={formData.size_max !== undefined && formData.size_max !== null ? formData.size_max : ''}
                  onChange={handleChange}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
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
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                  placeholder="150"
                  step="0.01"
                  required
                />
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <IndianRupee className="w-3 h-3 text-gray-500" />
                Price (in lakhs)
              </label>
              <button
                type="button"
                onClick={() => setShowPriceRange(!showPriceRange)}
                className="text-xs font-medium text-gray-600 hover:text-gray-700"
              >
                {priceRangeButtonText}
              </button>
            </div>
            {showPriceRange ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  name="price_min"
                  value={formData.price_min !== undefined && formData.price_min !== null ? formData.price_min : ''}
                  onChange={handleChange}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                  placeholder="20"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  name="price_max"
                  value={formData.price_max !== undefined && formData.price_max !== null ? formData.price_max : ''}
                  onChange={handleChange}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
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
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                  placeholder="1 Crore = 100 Lakhs"
                  step="0.01"
                  required
                />
            
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-gray-500" />
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 resize-none"
              placeholder="Add Detailed Property description Here"
            />
            <p className="text-xs text-gray-500 mt-0.5">like dimensions, built-up age, nearby landmarks, facing direction, etc</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-gray-500" />
              Private notes{' '}
              <span 
                className="relative inline-flex items-center border-b border-dotted border-gray-400 cursor-help pb-0.5" 
                style={{ borderBottomWidth: '1px' }}
                onMouseEnter={() => setShowNoteTooltip(true)}
                onMouseLeave={() => setShowNoteTooltip(false)}
              >
                <Lock className="w-3 h-3 text-gray-400" />
                {showNoteTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 text-white text-xs rounded z-50 pointer-events-none max-w-[200px] sm:max-w-none text-center">
                    This note is visible only to you even if you share the property to public
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </span>
            </label>
            <textarea
              name="note_private"
              value={formData.note_private}
              onChange={handleChange}
              rows={2}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 resize-none"
              placeholder="Personal notes"
            />
            <p className="text-xs text-gray-500 mt-0.5">Add private details like plot number, deal price, owner info, etc</p>
          </div>

          <div className="pt-1.5 border-t border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <span className="text-xs font-semibold text-gray-900">Privacy</span>
                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                  {formData.is_public === 1 
                    ? 'This property is visible to everyone' 
                    : 'This property is only visible to you'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, is_public: prev.is_public === 1 ? 0 : 1 }))}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  formData.is_public === 1 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                aria-label={formData.is_public === 1 ? 'Make private' : 'Make public'}
              >
                <div className="flex items-center gap-1">
                  {formData.is_public === 1 ? (
                    <>
                      <Globe className="w-3 h-3" />
                      <span className="text-xs font-medium">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span className="text-xs font-medium">Only me</span>
                    </>
                  )}
                </div>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                // Clear draft when cancelled
                if (!property) {
                  localStorage.removeItem(STORAGE_KEY);
                }
                onClose();
              }}
              className="px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              {property ? 'Update Property' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
