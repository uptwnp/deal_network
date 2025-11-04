import { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown, MapPin } from 'lucide-react';
import { FilterOptions } from '../types/property';

interface SearchFilterProps {
  onSearch: (query: string, column?: string) => void;
  onFilter: (filters: FilterOptions) => void;
}

const STORAGE_KEYS = {
  SEARCH_QUERY: 'propnetwork_search_query',
  SEARCH_COLUMN: 'propnetwork_search_column',
  FILTERS: 'propnetwork_filters',
  SELECTED_AREA: 'propnetwork_selected_area',
};

const SEARCH_COLUMNS = [
  { value: '', label: 'All Info' },
  { value: 'general', label: 'All General' },
  { value: 'area', label: 'Area' },
  { value: 'heading', label: 'Heading' },
  { value: 'description', label: 'Description' },
  { value: 'size', label: 'Size' },
  { value: 'price', label: 'Price' },
  { value: 'highlights', label: 'Highlight' },
  { value: 'tags', label: 'Tags' },
  { value: 'note_private', label: 'Private info' },
  { value: 'city', label: 'City' },
  { value: 'type', label: 'Property type' },
];

const CITY_OPTIONS = ['Panipat', 'Delhi', 'Gurgaon', 'Noida', 'Faridabad'];
const AREA_OPTIONS = [
  'Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5',
  'Sector 6', 'Sector 7', 'Sector 8', 'Sector 9', 'Sector 10',
  'Sector 12', 'Sector 13', 'Sector 14', 'Sector 15', 'Sector 16',
  'Sector 17', 'Sector 18', 'Sector 19', 'Sector 20', 'Sector 21',
  'Sector 22', 'Sector 23', 'Sector 24', 'Sector 25', 'Model Town',
  'Civil Lines', 'GT Road', 'Huda Sector', 'Industrial Area'
];

export function SearchFilter({ onSearch, onFilter }: SearchFilterProps) {
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const savedQuery = localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '';
      const savedColumn = localStorage.getItem(STORAGE_KEYS.SEARCH_COLUMN) || '';
      const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      const savedArea = localStorage.getItem(STORAGE_KEYS.SELECTED_AREA) || '';
      
      return {
        query: savedQuery,
        column: savedColumn,
        filters: savedFilters ? JSON.parse(savedFilters) : {
          city: '',
          area: '',
          type: '',
          min_price: undefined,
          max_price: undefined,
        },
        selectedArea: savedArea,
      };
    } catch {
      return {
        query: '',
        column: '',
        filters: {
          city: '',
          area: '',
          type: '',
          min_price: undefined,
          max_price: undefined,
        },
        selectedArea: '',
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
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const areaInputRef = useRef<HTMLInputElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const areaDropdownRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FilterOptions>(persistedState.filters);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(event.target as Node)) {
        setShowAreaDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // Apply filters on initial load if they exist
  useEffect(() => {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
    );
    if (Object.keys(activeFilters).length > 0) {
      onFilter(activeFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery, searchColumn || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchColumn, onSearch]);

  useEffect(() => {
    setSelectedArea(filters.area || '');
  }, [filters.area]);

  const handleFilterChange = (key: keyof FilterOptions, value: string | number | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // Auto-save to localStorage
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
  };

  const applyFilters = () => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
    );
    onFilter(cleanFilters);
    setShowFilters(false);
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    const newFilters = { ...filters, area };
    setFilters(newFilters);
    const cleanFilters = Object.fromEntries(
      Object.entries({ ...newFilters }).filter(([_, v]) => v !== '' && v !== undefined)
    );
    onFilter(cleanFilters);
    setShowAreaDropdown(false);
  };

  const handleAreaClear = () => {
    setSelectedArea('');
    const newFilters = { ...filters, area: '' };
    setFilters(newFilters);
    const cleanFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, v]) => v !== '' && v !== undefined)
    );
    onFilter(cleanFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      city: '',
      area: '',
      type: '',
      min_price: undefined,
      max_price: undefined,
    };
    setFilters(emptyFilters);
    setSelectedArea('');
    // Clear from localStorage when manually cleared
    localStorage.removeItem(STORAGE_KEYS.FILTERS);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_AREA);
    onFilter({});
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== '' && v !== undefined).length;

  const selectedColumnLabel = SEARCH_COLUMNS.find(col => col.value === searchColumn)?.label || 'All Info';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1 flex">
          <div className="relative" ref={columnDropdownRef}>
            <button
              type="button"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="h-10 px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              <span className="truncate max-w-[120px] sm:max-w-none">{selectedColumnLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${showColumnDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showColumnDropdown && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-64 overflow-y-auto">
                {SEARCH_COLUMNS.map((column) => (
                  <button
                    key={column.value}
                    type="button"
                    onClick={() => {
                      setSearchColumn(column.value);
                      localStorage.setItem(STORAGE_KEYS.SEARCH_COLUMN, column.value);
                      setShowColumnDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
              type="text"
              placeholder={`Search in ${selectedColumnLabel.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Auto-save to localStorage
                localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, e.target.value);
              }}
              className="w-full h-10 pl-10 pr-4 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="relative px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowAreaSection(!showAreaSection)}
          className="relative px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <MapPin className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">Area</span>
          {selectedArea && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              1
            </span>
          )}
        </button>
      </div>

      {showAreaSection && (
        <div className="flex gap-2 w-full">
          <div className="relative flex-1" ref={areaDropdownRef}>
          <button
            type="button"
            onClick={() => setShowAreaDropdown(!showAreaDropdown)}
            className="w-full h-10 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between text-sm font-medium text-gray-700"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <span>{selectedArea || 'Select Area'}</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedArea && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAreaClear();
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showAreaDropdown ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showAreaDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
              {AREA_OPTIONS.map((area, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAreaSelect(area)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
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
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                ref={cityInputRef}
                type="text"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                onFocus={() => setShowCitySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Panipat"
              />
              {showCitySuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {CITY_OPTIONS.filter(city =>
                    city.toLowerCase().includes(filters.city.toLowerCase())
                  ).map((city, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleFilterChange('city', city);
                        setShowCitySuggestions(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm text-gray-700"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Sector 18"
              />
              {showAreaSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {AREA_OPTIONS.filter(area =>
                    area.toLowerCase().includes(filters.area.toLowerCase())
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="Residential Plot">Residential Plot</option>
                <option value="Commercial Plot">Commercial Plot</option>
                <option value="House">House</option>
                <option value="Apartment">Apartment</option>
                <option value="Agriculture Land">Agriculture Land</option>
                <option value="Industrial Plot">Industrial Plot</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.max_price || ''}
                  onChange={(e) =>
                    handleFilterChange('max_price', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
      )}
    </div>
  );
}
