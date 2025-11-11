import { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown, MapPin } from 'lucide-react';
import { FilterOptions } from '../types/property';
import { getUserSettings } from '../types/userSettings';
import {
  STORAGE_KEYS,
  SEARCH_COLUMNS,
  CITY_OPTIONS,
  AREA_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SIZE_UNIT_OPTIONS,
  getSearchColumnsSortedByUsage,
  trackColumnUsage,
} from '../utils/filterOptions';
import { getAreaCityData, getCities, getAllAreas, getAreasForCity, fetchAreaCityDataInBackground } from '../utils/areaCityApi';

interface SearchFilterProps {
  onSearch: (query: string, column?: string) => void;
  onFilter: (filters: FilterOptions) => void;
}

export function SearchFilter({ onSearch, onFilter }: SearchFilterProps) {
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const savedQuery = localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '';
      const savedColumn = localStorage.getItem(STORAGE_KEYS.SEARCH_COLUMN) || 'general';
      const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      const savedArea = localStorage.getItem(STORAGE_KEYS.SELECTED_AREA) || '';
      const userSettings = getUserSettings();
      
      // Use user settings as defaults if no saved filters
      // City should always be selected: user's city, last selected, or Panipat as fallback
      let parsedFilters: FilterOptions = {};
      if (savedFilters) {
        parsedFilters = JSON.parse(savedFilters);
      }
      
      // Determine default city: saved city, user city, or Panipat
      const defaultCity = parsedFilters.city || userSettings.city || 'Panipat';
      
      const defaultFilters: FilterOptions = savedFilters ? {
        ...parsedFilters,
        city: parsedFilters.city || defaultCity, // Ensure city is always set
      } : {
        city: defaultCity, // Always set city by default
        area: userSettings.preferredAreas.length > 0 ? userSettings.preferredAreas[0] : '',
        type: userSettings.preferredPropertyTypes.length > 0 ? userSettings.preferredPropertyTypes[0] : '',
        min_price: userSettings.defaultPriceMin,
        max_price: userSettings.defaultPriceMax,
      };
      
      return {
        query: savedQuery,
        column: savedColumn,
        filters: defaultFilters,
        selectedArea: savedArea || (userSettings.preferredAreas.length > 0 ? userSettings.preferredAreas[0] : ''),
      };
    } catch {
      const userSettings = getUserSettings();
      // City should always be selected: user's city or Panipat as fallback
      const defaultCity = userSettings.city || 'Panipat';
      return {
        query: '',
        column: 'general',
        filters: {
          city: defaultCity, // Always set city by default
          area: userSettings.preferredAreas.length > 0 ? userSettings.preferredAreas[0] : '',
          type: userSettings.preferredPropertyTypes.length > 0 ? userSettings.preferredPropertyTypes[0] : '',
          min_price: userSettings.defaultPriceMin,
          max_price: userSettings.defaultPriceMax,
        },
        selectedArea: userSettings.preferredAreas.length > 0 ? userSettings.preferredAreas[0] : '',
      };
    }
  };

  const persistedState = loadPersistedState();

  const [searchQuery, setSearchQuery] = useState(persistedState.query);
  const [searchColumn, setSearchColumn] = useState(persistedState.column);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAreaSection, setShowAreaSection] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>(persistedState.selectedArea);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const areaInputRef = useRef<HTMLInputElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const areaDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FilterOptions>(persistedState.filters);
  const filterDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dynamic city and area options from API
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [filteredAreaOptions, setFilteredAreaOptions] = useState<string[]>([]);

  // Fetch area/city data on mount
  useEffect(() => {
    // Fetch in background
    fetchAreaCityDataInBackground();
    
    // Load cached data immediately
    getAreaCityData().then((data) => {
      if (data) {
        const cities = data.cities.map((c) => c.city);
        setCityOptions(cities);
        // Get all areas for initial area dropdown
        getAllAreas().then((areas) => {
          setAreaOptions(areas);
          setFilteredAreaOptions(areas);
        });
      } else {
        // Fallback to static options if API data not available
        setCityOptions([...CITY_OPTIONS]);
        setAreaOptions([...AREA_OPTIONS]);
        setFilteredAreaOptions([...AREA_OPTIONS]);
      }
    });
  }, []);

  // Update area options when city filter changes
  useEffect(() => {
    if (filters.city) {
      getAreasForCity(filters.city).then((areas) => {
        if (areas.length > 0) {
          setFilteredAreaOptions(areas);
        } else {
          // Fallback to all areas if city not found in API data
          getAllAreas().then((allAreas) => {
            setFilteredAreaOptions(allAreas);
          });
        }
      });
    } else {
      // No city selected, show all areas
      getAllAreas().then((allAreas) => {
        setFilteredAreaOptions(allAreas);
      });
    }
  }, [filters.city]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(event.target as Node)) {
        setShowAreaDropdown(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Save search query and column to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, searchQuery);
    localStorage.setItem(STORAGE_KEYS.SEARCH_COLUMN, searchColumn);
  }, [searchQuery, searchColumn]);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
  }, [filters]);

  // Save selected area to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_AREA, selectedArea);
  }, [selectedArea]);

  // Note: Removed initial filter application on mount
  // The App component's initial load effect handles applying filters from localStorage
  // This prevents duplicate filter requests on page load
  // Filters will only be applied when user actually changes them via handleFilterChange

  // Debounced search - triggers after user stops typing for 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery, searchColumn || undefined);
      // Track column usage when search is performed (only if there's a query)
      if (searchQuery.trim()) {
        trackColumnUsage(searchColumn);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchColumn]); // Removed onSearch from deps to prevent infinite loops

  useEffect(() => {
    setSelectedArea(filters.area || '');
  }, [filters.area]);

  const handleFilterChange = (key: keyof FilterOptions, value: string | number | undefined) => {
    // If clearing city, set it back to default (city should always be selected)
    if (key === 'city' && (value === '' || value === undefined)) {
      const userSettings = getUserSettings();
      const defaultCity = userSettings.city || 'Panipat';
      value = defaultCity;
    }
    
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // Auto-save to localStorage
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    
    // Debounce filter application to prevent too many rapid API calls
    // Clear existing timer
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current);
    }
    
    // Apply filters after a short delay (user stops changing filters)
    filterDebounceTimerRef.current = setTimeout(() => {
      const cleanFilters = Object.fromEntries(
        Object.entries(newFilters).filter(([_, v]) => v !== '' && v !== undefined)
      );
      onFilter(cleanFilters);
    }, 300); // 300ms debounce
  };

  const applyFilters = () => {
    // Clear any pending debounced filter calls
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current);
      filterDebounceTimerRef.current = null;
    }
    
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
    );
    onFilter(cleanFilters);
    setShowFilters(false);
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    handleFilterChange('area', area);
    setShowAreaDropdown(false);
  };

  const handleAreaClear = () => {
    setSelectedArea('');
    handleFilterChange('area', '');
  };

  const clearFilters = () => {
    const userSettings = getUserSettings();
    // City should always remain selected (user's city or Panipat)
    const defaultCity = userSettings.city || 'Panipat';
    const emptyFilters = {
      city: defaultCity, // Keep city selected even when clearing filters
      area: '',
      type: '',
      min_price: undefined,
      max_price: undefined,
      size_min: undefined,
      max_size: undefined,
      size_unit: undefined,
    };
    setFilters(emptyFilters);
    setSelectedArea('');
    // Save filters with city to localStorage
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(emptyFilters));
    localStorage.removeItem(STORAGE_KEYS.SELECTED_AREA);
    // Apply filter with only city
    onFilter({ city: defaultCity });
  };

  // Count active filters excluding city (city is always selected, so it doesn't count as a filter)
  const activeFilterCount = Object.entries(filters)
    .filter(([key, value]) => key !== 'city' && value !== '' && value !== undefined)
    .length;

  // Get search columns sorted by usage
  const sortedSearchColumns = getSearchColumnsSortedByUsage();
  const selectedColumnLabel = sortedSearchColumns.find(col => col.value === searchColumn)?.label || 'All Info';

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    // Immediately trigger search on Enter or form submit
    onSearch(searchQuery, searchColumn || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <form onSubmit={handleSearchSubmit} className="flex gap-1.5 sm:gap-2">
        <div className="relative flex-1 flex">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
              type="text"
              placeholder={`Search in ${selectedColumnLabel.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Auto-save to localStorage
                localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className="w-full h-9 sm:h-10 pl-8 sm:pl-10 pr-3 sm:pr-4 border border-r-0 border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="relative flex-shrink-0" ref={columnDropdownRef}>
            <button
              type="button"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="h-9 sm:h-10 px-2 sm:px-3 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              <span className="truncate max-w-[100px] sm:max-w-[120px] md:max-w-none">{selectedColumnLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${showColumnDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showColumnDropdown && (
              <div className="absolute right-0 top-full mt-1 w-44 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-64 overflow-y-auto">
                {sortedSearchColumns.map((column) => (
                  <button
                    key={column.value}
                    type="button"
                    onClick={() => {
                      setSearchColumn(column.value);
                      localStorage.setItem(STORAGE_KEYS.SEARCH_COLUMN, column.value);
                      trackColumnUsage(column.value); // Track usage when column is selected
                      setShowColumnDropdown(false);
                    }}
                    className={`w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm transition-colors ${
                      searchColumn === column.value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {column.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="relative p-2 sm:p-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          title="Filter"
        >
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-blue-600 text-white text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowAreaSection(!showAreaSection)}
          className="relative p-2 sm:p-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          title="Area"
        >
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          {selectedArea && (
            <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-blue-600 text-white text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
              1
            </span>
          )}
        </button>
      </form>

      {showAreaSection && (
        <div className="flex gap-1.5 sm:gap-2 w-full">
          <div className="relative flex-1" ref={areaDropdownRef}>
          <button
            type="button"
            onClick={() => setShowAreaDropdown(!showAreaDropdown)}
            className="w-full h-9 sm:h-10 px-3 sm:px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-xs sm:text-sm font-medium text-gray-700"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <span>{selectedArea || 'Select Area'}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {selectedArea && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAreaClear();
                  }}
                  className="p-0.5 sm:p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                </button>
              )}
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showAreaDropdown ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showAreaDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
              {(filteredAreaOptions.length > 0 ? filteredAreaOptions : AREA_OPTIONS).map((area, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAreaSelect(area)}
                  className={`w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm transition-colors ${
                    selectedArea === area
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {showFilters && (
        <>
          {/* Mobile: Full-screen modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/50 p-0">
            <div className="bg-white rounded-t-2xl shadow-2xl w-full max-h-[98vh] overflow-y-auto animate-slide-up">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="relative" ref={cityDropdownRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowCityDropdown(!showCityDropdown);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowCityDropdown(!showCityDropdown);
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-sm text-left"
                    >
                      <span className={filters.city ? 'text-gray-900' : 'text-gray-400'}>
                        {filters.city || 'Select City'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* City cannot be cleared - it's always selected */}
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {showCityDropdown && (
                      <div 
                        className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {/* Removed "All Cities" option since city should always be selected */}
                        {(cityOptions.length > 0 ? cityOptions : CITY_OPTIONS).map((city, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFilterChange('city', city);
                              setShowCityDropdown(false);
                            }}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFilterChange('city', city);
                              setShowCityDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              filters.city === city
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                    <input
                      ref={areaInputRef}
                      type="text"
                      value={filters.area}
                      onChange={(e) => handleFilterChange('area', e.target.value)}
                      onFocus={() => setShowAreaSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 200)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="e.g., Sector 18"
                    />
                    {showAreaSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {(filteredAreaOptions.length > 0 ? filteredAreaOptions : AREA_OPTIONS).filter(area =>
                          area.toLowerCase().includes((filters.area || '').toLowerCase())
                        ).map((area, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              handleFilterChange('area', area);
                              setShowAreaSuggestions(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm text-gray-700"
                          >
                            {area}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">All Types</option>
                      {PROPERTY_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Range (Lakhs)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.min_price || ''}
                        onChange={(e) =>
                          handleFilterChange('min_price', e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.max_price || ''}
                        onChange={(e) =>
                          handleFilterChange('max_price', e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Size Range
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min Size"
                        value={filters.size_min || ''}
                        onChange={(e) =>
                          handleFilterChange('size_min', e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max Size"
                        value={filters.max_size || ''}
                        onChange={(e) =>
                          handleFilterChange('max_size', e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size Unit</label>
                    <select
                      value={filters.size_unit || ''}
                      onChange={(e) => handleFilterChange('size_unit', e.target.value || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">All Units</option>
                      {SIZE_UNIT_OPTIONS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={clearFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Inline filters */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="relative" ref={cityDropdownRef}>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">City</label>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCityDropdown(!showCityDropdown);
                }}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-sm text-left"
              >
                <span className={filters.city ? 'text-gray-900' : 'text-gray-400'}>
                  {filters.city || 'Select City'}
                </span>
                <div className="flex items-center gap-1.5">
                  {/* City cannot be cleared - it's always selected */}
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {showCityDropdown && (
                <div 
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Removed "All Cities" option since city should always be selected */}
                  {(cityOptions.length > 0 ? cityOptions : CITY_OPTIONS).map((city, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFilterChange('city', city);
                        setShowCityDropdown(false);
                      }}
                      className={`w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm transition-colors ${
                        filters.city === city
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Area</label>
              <input
                ref={areaInputRef}
                type="text"
                value={filters.area}
                onChange={(e) => handleFilterChange('area', e.target.value)}
                onFocus={() => setShowAreaSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 200)}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="e.g., Sector 18"
              />
              {showAreaSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {(filteredAreaOptions.length > 0 ? filteredAreaOptions : AREA_OPTIONS).filter(area =>
                    area.toLowerCase().includes((filters.area || '').toLowerCase())
                  ).map((area, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleFilterChange('area', area);
                        setShowAreaSuggestions(false);
                      }}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-blue-50 text-xs sm:text-sm text-gray-700"
                    >
                      {area}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Types</option>
                {PROPERTY_TYPE_OPTIONS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Price Range (Lakhs)
              </label>
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.min_price || ''}
                  onChange={(e) =>
                    handleFilterChange('min_price', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.max_price || ''}
                  onChange={(e) =>
                    handleFilterChange('max_price', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Size Range
              </label>
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="number"
                  placeholder="Min Size"
                  value={filters.size_min || ''}
                  onChange={(e) =>
                    handleFilterChange('size_min', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="number"
                  placeholder="Max Size"
                  value={filters.max_size || ''}
                  onChange={(e) =>
                    handleFilterChange('max_size', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Size Unit</label>
              <select
                value={filters.size_unit || ''}
                onChange={(e) => handleFilterChange('size_unit', e.target.value || undefined)}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Units</option>
                {SIZE_UNIT_OPTIONS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={clearFilters}
                className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
