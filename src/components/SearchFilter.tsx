import { useState, useEffect, useRef } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { FilterOptions } from '../types/property';

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: FilterOptions) => void;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const areaInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    city: '',
    area: '',
    type: '',
    min_price: undefined,
    max_price: undefined,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleFilterChange = (key: keyof FilterOptions, value: string | number | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
    );
    onFilter(cleanFilters);
    setShowFilters(false);
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
    onFilter({});
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== '' && v !== undefined).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
      </div>

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
