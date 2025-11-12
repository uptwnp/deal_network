import { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown, MapPin } from 'lucide-react';
import { FilterOptions } from '../types/property';
import { getUserSettings } from '../types/userSettings';
import { useAuth } from '../contexts/AuthContext';
import {
  STORAGE_KEYS,
  SEARCH_COLUMNS,
  CITY_OPTIONS,
  AREA_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SIZE_UNIT_OPTIONS,
  TAG_OPTIONS,
  HIGHLIGHT_OPTIONS,
  getSearchColumnsSortedByUsage,
  trackColumnUsage,
} from '../utils/filterOptions';
import { getAreaCityData, getCities, getAllAreas, getAreasForCity, fetchAreaCityDataInBackground, updateCacheWithCityArea } from '../utils/areaCityApi';
import { RangeSlider } from './RangeSlider';
import { MultiSelect } from './MultiSelect';

interface SearchFilterProps {
  onSearch: (query: string, column?: string) => void;
  onFilter: (filters: FilterOptions) => void;
}

export function SearchFilter({ onSearch, onFilter }: SearchFilterProps) {
  const { user } = useAuth();
  
  // Load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const savedQuery = localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '';
      const savedColumn = localStorage.getItem(STORAGE_KEYS.SEARCH_COLUMN) || 'general';
      const savedFilters = localStorage.getItem(STORAGE_KEYS.FILTERS);
      const savedArea = localStorage.getItem(STORAGE_KEYS.SELECTED_AREA) || '';
      const userSettings = getUserSettings();
      
      // Use user settings as defaults if no saved filters
      // City should always be selected: saved city, user's default_city, or Panipat as fallback
      let parsedFilters: FilterOptions = {};
      if (savedFilters) {
        parsedFilters = JSON.parse(savedFilters);
        // Convert string arrays back to arrays if they were saved as strings
        if (parsedFilters.type && typeof parsedFilters.type === 'string' && parsedFilters.type.includes(',')) {
          parsedFilters.type = parsedFilters.type.split(',');
        }
        if (parsedFilters.tags && typeof parsedFilters.tags === 'string' && parsedFilters.tags.includes(',')) {
          parsedFilters.tags = parsedFilters.tags.split(',');
        }
        if (parsedFilters.highlights && typeof parsedFilters.highlights === 'string' && parsedFilters.highlights.includes(',')) {
          parsedFilters.highlights = parsedFilters.highlights.split(',');
        }
      }
      
      // Determine default city: saved city, user's default_city from auth context, userSettings.city, or Panipat
      // Note: user might not be loaded yet, so we use fallback to 'Panipat'
      const userCity = user?.default_city || userSettings.city || 'Panipat';
      // Always ensure city is set - use saved city, or default to user's city or Panipat
      const defaultCity = parsedFilters.city || userCity;
      
      // Default price and size ranges
      const defaultPriceMin = parsedFilters.min_price ?? 0;
      const defaultPriceMax = parsedFilters.max_price ?? 1000; // 1000 lakhs (10 crores) max
      const defaultSizeMin = parsedFilters.size_min ?? 0;
      const defaultSizeMax = parsedFilters.max_size ?? 10000; // Max size depends on unit
      
      const defaultFilters: FilterOptions = savedFilters ? {
        ...parsedFilters,
        city: defaultCity, // Always set city - use saved city or default
        min_price: defaultPriceMin,
        max_price: defaultPriceMax,
        size_min: defaultSizeMin,
        max_size: defaultSizeMax,
      } : {
        city: defaultCity, // Always set city by default
        area: '',
        type: [],
        min_price: defaultPriceMin,
        max_price: defaultPriceMax,
        size_min: defaultSizeMin,
        max_size: defaultSizeMax,
        size_unit: userSettings.defaultSizeUnit || 'Gaj',
      };
      
      return {
        query: savedQuery,
        column: savedColumn,
        filters: defaultFilters,
        selectedArea: savedArea || (userSettings.preferredAreas.length > 0 ? userSettings.preferredAreas[0] : ''),
      };
    } catch {
      const userSettings = getUserSettings();
      // City should always be selected: user's default_city from auth context, userSettings.city, or Panipat as fallback
      const userCity = user?.default_city || userSettings.city || 'Panipat';
      return {
        query: '',
        column: 'general',
        filters: {
          city: userCity, // Always set city by default
          area: '',
          type: [],
          min_price: 0,
          max_price: 1000,
          size_min: 0,
          max_size: 10000,
          size_unit: userSettings.defaultSizeUnit || 'Gaj',
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
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false);
  const areaInputRef = useRef<HTMLInputElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const areaDropdownRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FilterOptions>(persistedState.filters);
  const filterDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true); // Track if this is the initial mount
  
  // Mark initial mount as complete after a short delay to allow all effects to skip on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 100); // Short delay to ensure all mount effects have run
    return () => clearTimeout(timer);
  }, []);
  
  // Dynamic city and area options from API
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [cityOptionsWithLabels, setCityOptionsWithLabels] = useState<Array<{value: string; label: string}>>([]);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [filteredAreaOptions, setFilteredAreaOptions] = useState<string[]>([]);
  
  // Range values for sliders
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.min_price ?? 0,
    filters.max_price ?? 1000
  ]);
  const [sizeRange, setSizeRange] = useState<[number, number]>([
    filters.size_min ?? 0,
    filters.max_size ?? 10000
  ]);
  
  // Multi-select values
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    Array.isArray(filters.type) ? filters.type : filters.type ? [filters.type] : []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    Array.isArray(filters.tags) ? filters.tags : filters.tags ? [filters.tags] : []
  );
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>(
    Array.isArray(filters.highlights) ? filters.highlights : filters.highlights ? [filters.highlights] : []
  );

  // Fetch area/city data on mount
  useEffect(() => {
    // Fetch in background
    fetchAreaCityDataInBackground();
    
    // Load cached data immediately
    getAreaCityData().then((data) => {
      if (data) {
        const cities = data.cities.map((c) => c.city);
        setCityOptions(cities);
        setCityOptionsWithLabels(cities.map((city) => ({ value: city, label: city })));
        // Get all areas for fallback (stored in areaOptions, not filteredAreaOptions)
        getAllAreas().then((areas) => {
          setAreaOptions(areas);
        });
      } else {
        // Fallback to static options if API data not available
        setCityOptions([...CITY_OPTIONS]);
        setCityOptionsWithLabels(CITY_OPTIONS.map((city) => ({ value: city, label: city })));
        setAreaOptions([...AREA_OPTIONS]);
      }
    });
  }, []); // Only run on mount

  // Update area options when city filter changes - this is the main handler
  // This runs on mount (when filters.city is set) and whenever city changes
  useEffect(() => {
    if (!filters.city) {
      // No city selected - shouldn't happen, but clear areas
      setFilteredAreaOptions([]);
      return;
    }
    
    // Fetch areas for the selected city
    const fetchCityAreas = async () => {
      try {
        const areas = await getAreasForCity(filters.city!);
        if (areas && areas.length > 0) {
          setFilteredAreaOptions(areas);
        } else {
          // Fallback to all areas if city not found in API data
          try {
            const allAreas = await getAllAreas();
            setFilteredAreaOptions(allAreas.length > 0 ? allAreas : [...AREA_OPTIONS]);
          } catch {
            setFilteredAreaOptions([...AREA_OPTIONS]);
          }
        }
      } catch (error) {
        console.error('Error fetching areas for city:', error);
        // On error, fallback to all areas
        try {
          const allAreas = await getAllAreas();
          setFilteredAreaOptions(allAreas.length > 0 ? allAreas : [...AREA_OPTIONS]);
        } catch (fallbackError) {
          console.error('Error fetching all areas:', fallbackError);
          // Use static options as last resort
          setFilteredAreaOptions([...AREA_OPTIONS]);
        }
      }
    };
    
    // Clear areas first, then fetch
    setFilteredAreaOptions([]);
    fetchCityAreas();
  }, [filters.city]); // Run whenever city changes (including on mount if city is set)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      // Check if click is inside any dropdown - if so, don't close
      if (columnDropdownRef.current?.contains(target)) return;
      if (areaDropdownRef.current?.contains(target)) return;
      // Note: sizeUnitDropdown is now a native select, so no need to handle it here
      
      // Only close if clicking outside all dropdowns
      setShowColumnDropdown(false);
      setShowAreaDropdown(false);
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
    // Skip on initial mount - App component's initial load effect handles applying search from localStorage
    if (isInitialMountRef.current) {
      return;
    }
    
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

  // Sync range states with filters
  useEffect(() => {
    setPriceRange([filters.min_price ?? 0, filters.max_price ?? 1000]);
    setSizeRange([filters.size_min ?? 0, filters.max_size ?? 10000]);
  }, [filters.min_price, filters.max_price, filters.size_min, filters.max_size]);

  // Sync multi-select states with filters
  useEffect(() => {
    if (filters.type) {
      setSelectedTypes(Array.isArray(filters.type) ? filters.type : [filters.type]);
    } else {
      setSelectedTypes([]);
    }
  }, [filters.type]);

  useEffect(() => {
    if (filters.tags) {
      setSelectedTags(Array.isArray(filters.tags) ? filters.tags : [filters.tags]);
    } else {
      setSelectedTags([]);
    }
  }, [filters.tags]);

  useEffect(() => {
    if (filters.highlights) {
      setSelectedHighlights(Array.isArray(filters.highlights) ? filters.highlights : [filters.highlights]);
    } else {
      setSelectedHighlights([]);
    }
  }, [filters.highlights]);

  // Handle city selection - simple and direct
  const handleCitySelect = (cityValue: string) => {
    // Ensure city is never empty - use fallback if empty
    const validCity = cityValue || user?.default_city || 'Panipat';
    
    // Update state using functional update to ensure we have latest state
    setFilters(prevFilters => {
      const cityChanged = validCity !== prevFilters.city;
      const newFilters: FilterOptions = { 
        ...prevFilters, 
        city: validCity 
      };
      
      // Clear area if city changed
      if (cityChanged) {
        newFilters.area = '';
        setSelectedArea('');
        localStorage.removeItem(STORAGE_KEYS.SELECTED_AREA);
        // Note: The useEffect that watches filters.city will handle fetching areas
        // We don't need to manually fetch here to avoid duplicate work
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
      
      // Apply filters
      applyFiltersDebounced(newFilters);
      
      return newFilters;
    });
  };

  // Helper function to clean and apply filters
  const applyFiltersDebounced = (newFilters: FilterOptions) => {
    // Clear existing timer
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current);
    }
    
    // Clean filters: remove empty strings, undefined, empty arrays, and ranges at min/max
    const cleanFilters: FilterOptions = {};
    
    // Check price range - only include if not at both endpoints
    const minPrice = newFilters.min_price ?? 0;
    const maxPrice = newFilters.max_price ?? 1000;
    const isPriceRangeApplied = !(minPrice === 0 && maxPrice === 1000);
    if (isPriceRangeApplied) {
      cleanFilters.min_price = minPrice;
      cleanFilters.max_price = maxPrice;
    }
    
    // Check size range - only include if not at both endpoints
    const minSize = newFilters.size_min ?? 0;
    const maxSize = newFilters.max_size ?? 10000;
    const isSizeRangeApplied = !(minSize === 0 && maxSize === 10000);
    if (isSizeRangeApplied) {
      cleanFilters.size_min = minSize;
      cleanFilters.max_size = maxSize;
    }
    
    // Always include city first (before processing other filters)
    // City should always be set - use user's default_city or Panipat as fallback
    if (newFilters.city) {
      cleanFilters.city = newFilters.city;
    } else {
      // If city is not set, use user's default_city from auth context or Panipat
      cleanFilters.city = user?.default_city || 'Panipat';
    }
    
    // Process other filters
    for (const [key, value] of Object.entries(newFilters)) {
      // Skip price and size range as we've already handled them
      if (['min_price', 'max_price', 'size_min', 'max_size', 'city'].includes(key)) continue;
      
      if (value === undefined || value === '') continue;
      
      // Handle arrays - only include if not empty
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleanFilters[key as keyof FilterOptions] = value as any;
        }
        continue;
      }
      
      cleanFilters[key as keyof FilterOptions] = value;
    }
    
    // Include size_unit if size range is applied (to tell backend what unit the range is in)
    if (isSizeRangeApplied && newFilters.size_unit) {
      cleanFilters.size_unit = newFilters.size_unit;
    }
    
    // filter_size_unit is separate and should be included if set (for filtering by size unit)
    if (newFilters.filter_size_unit) {
      cleanFilters.filter_size_unit = newFilters.filter_size_unit;
    }
    
    // Debounce filter application
    filterDebounceTimerRef.current = setTimeout(() => {
      onFilter(cleanFilters);
    }, 300);
  };
  
  // Ensure city is always set - update when user context loads (after applyFiltersDebounced is defined)
  useEffect(() => {
    const currentCity = filters.city;
    const userCity = user?.default_city;
    
    // Skip on initial mount - App component's initial load effect handles applying filters from localStorage
    if (isInitialMountRef.current) {
      // Still ensure city is set in state (but don't trigger filter API call)
      if (!currentCity) {
        // City is empty - set to user's city or Panipat (just update state, don't call API)
        const defaultCity = userCity || 'Panipat';
        setFilters(prevFilters => {
          const newFilters = { ...prevFilters, city: defaultCity };
          localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
          return newFilters;
        });
      } else if (currentCity === 'Panipat' && userCity && userCity !== 'Panipat') {
        // City is the default 'Panipat', but user has a different default_city - update it (just update state, don't call API)
        setFilters(prevFilters => {
          const newFilters = { ...prevFilters, city: userCity };
          localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
          return newFilters;
        });
      }
      return;
    }
    
    // After initial mount, apply filters when city changes
    // Only update if city is empty and we have a user default_city
    // Or if city is 'Panipat' (the default) and user has a different default_city
    if (!currentCity) {
      // City is empty - set to user's city or Panipat
      const defaultCity = userCity || 'Panipat';
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, city: defaultCity };
        localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
        applyFiltersDebounced(newFilters);
        return newFilters;
      });
    } else if (currentCity === 'Panipat' && userCity && userCity !== 'Panipat') {
      // City is the default 'Panipat', but user has a different default_city - update it
      setFilters(prevFilters => {
        const newFilters = { ...prevFilters, city: userCity };
        localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
        applyFiltersDebounced(newFilters);
        return newFilters;
      });
    }
  }, [user?.default_city, filters.city]); // Run when user's default_city changes or filters.city changes

  const handleFilterChange = (key: keyof FilterOptions, value: string | number | string[] | boolean | undefined) => {
    // If clearing city, set it back to default (city should always be selected)
    // City changes are handled by handleCitySelect function and should apply immediately
    if (key === 'city') {
      // Ensure city is never empty - use user's default_city or Panipat as fallback
      if (typeof value === 'string') {
        const validCity = value || user?.default_city || 'Panipat';
        handleCitySelect(validCity);
      } else {
        // If value is empty/undefined, use default
        const defaultCity = user?.default_city || 'Panipat';
        handleCitySelect(defaultCity);
      }
      return;
    }
    
    // For all other filters, only update local state - don't apply immediately
    // If clearing sortby, also clear order
    if (key === 'sortby' && (value === '' || value === undefined)) {
      const newFilters: FilterOptions = { ...filters, sortby: undefined, order: undefined };
      setFilters(newFilters);
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
      // Don't apply filters immediately - wait for Apply button
      return;
    }
    
    // If setting sortby and order is not set, default to DESC
    if (key === 'sortby' && typeof value === 'string' && value && !filters.order) {
      const newFilters: FilterOptions = { 
        ...filters, 
        sortby: value as FilterOptions['sortby'], 
        order: 'DESC' 
      };
      setFilters(newFilters);
      localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
      // Don't apply filters immediately - wait for Apply button
      return;
    }
    
    const newFilters: FilterOptions = { ...filters, [key]: value as any };
    setFilters(newFilters);
    // Auto-save to localStorage
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    // Don't apply filters immediately - wait for Apply button
  };

  // Function to apply all pending filters
  const applyFilters = () => {
    applyFiltersDebounced(filters);
    setShowFilters(false); // Close the filter modal after applying
  };

  // Handle price range change - only update local state, don't apply filters
  const handlePriceRangeChange = (range: [number, number]) => {
    setPriceRange(range);
    const newFilters = { 
      ...filters, 
      min_price: range[0],
      max_price: range[1]
    };
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    // Don't apply filters immediately - wait for Apply button
  };

  // Handle size range change - only update local state, don't apply filters
  const handleSizeRangeChange = (range: [number, number]) => {
    setSizeRange(range);
    const newFilters = { 
      ...filters, 
      size_min: range[0],
      max_size: range[1]
    };
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    // Don't apply filters immediately - wait for Apply button
  };

  // Handle type multi-select - only update local state, don't apply filters
  const handleTypeChange = (types: string[]) => {
    setSelectedTypes(types);
    const newFilters = { 
      ...filters, 
      type: types.length > 0 ? types : undefined
    };
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    // Don't apply filters immediately - wait for Apply button
  };

  // Handle tags multi-select - only update local state, don't apply filters
  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    const newFilters = { 
      ...filters, 
      tags: tags.length > 0 ? tags : undefined
    };
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    // Don't apply filters immediately - wait for Apply button
  };

  // Handle highlights multi-select - only update local state, don't apply filters
  const handleHighlightsChange = (highlights: string[]) => {
    setSelectedHighlights(highlights);
    const newFilters = { 
      ...filters, 
      highlights: highlights.length > 0 ? highlights : undefined
    };
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    // Don't apply filters immediately - wait for Apply button
  };


  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    const newFilters = { ...filters, area };
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    localStorage.setItem(STORAGE_KEYS.SELECTED_AREA, area);
    // Auto-apply area filter immediately (this is the separate area filter, not inside main filters modal)
    applyFiltersDebounced(newFilters);
    setShowAreaDropdown(false);
  };

  const handleAreaClear = () => {
    setSelectedArea('');
    const newFilters = { ...filters, area: '' };
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(newFilters));
    localStorage.removeItem(STORAGE_KEYS.SELECTED_AREA);
    // Auto-apply area filter immediately (this is the separate area filter, not inside main filters modal)
    applyFiltersDebounced(newFilters);
  };

  const clearFilters = () => {
    const userSettings = getUserSettings();
    // City should always remain selected (user's city or Panipat)
    const defaultCity = userSettings.city || 'Panipat';
    const emptyFilters: FilterOptions = {
      city: defaultCity, // Keep city selected even when clearing filters
      area: '',
      type: [],
      min_price: 0,
      max_price: 1000,
      size_min: 0,
      max_size: 10000,
      size_unit: userSettings.defaultSizeUnit || 'Gaj',
      filter_size_unit: undefined,
      tags: [],
      highlights: [],
      has_location: undefined,
      has_landmark: undefined,
      sortby: undefined,
      order: undefined,
    };
    setFilters(emptyFilters);
    setSelectedArea('');
    setPriceRange([0, 1000]);
    setSizeRange([0, 10000]);
    setSelectedTypes([]);
    setSelectedTags([]);
    setSelectedHighlights([]);
    // Save filters with city to localStorage
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(emptyFilters));
    localStorage.removeItem(STORAGE_KEYS.SELECTED_AREA);
    // Apply filter with only city (ranges at min/max won't be applied due to cleaning logic)
    onFilter({ city: defaultCity });
  };

  // Count active filters excluding city (city is always selected, so it doesn't count as a filter)
  const activeFilterCount = (() => {
    let count = 0;
    
    // Check price range
    const minPrice = filters.min_price ?? 0;
    const maxPrice = filters.max_price ?? 1000;
    if (!(minPrice === 0 && maxPrice === 1000)) {
      count++; // Count price range as one filter
    }
    
    // Check size range
    const minSize = filters.size_min ?? 0;
    const maxSize = filters.max_size ?? 10000;
    if (!(minSize === 0 && maxSize === 10000)) {
      count++; // Count size range as one filter
    }
    
    // Count other filters
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'city') continue;
      // Skip range filters as we've already counted them
      if (['min_price', 'max_price', 'size_min', 'max_size'].includes(key)) continue;
      
      if (value === '' || value === undefined) continue;
      
      // Handle arrays
      if (Array.isArray(value)) {
        if (value.length > 0) count++;
        continue;
      }
      
      count++;
    }
    return count;
  })();

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
              {(filters.city && filteredAreaOptions.length > 0 
                ? filteredAreaOptions 
                : filters.city 
                  ? [] // City selected but no areas yet - show empty until loaded
                  : AREA_OPTIONS).map((area, idx) => (
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
              <div className="sticky top-0 z-[60] bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* City and Area Section - Default Open */}
                <div className="space-y-3">
                  {/* Area label with City dropdown on right */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Area/Address
                      </label>
                      <select
                        value={filters.city || user?.default_city || 'Panipat'}
                        onChange={(e) => {
                          handleCitySelect(e.target.value);
                        }}
                        className="px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        {(cityOptionsWithLabels.length > 0 ? cityOptionsWithLabels : CITY_OPTIONS.map(c => ({value: c, label: c}))).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Area Input */}
                    <div className="relative">
                      <input
                        ref={areaInputRef}
                        type="text"
                        value={filters.area || ''}
                        onChange={(e) => handleFilterChange('area', e.target.value)}
                        onFocus={() => setShowAreaSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 200)}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                        placeholder="Sector 18"
                      />
                      <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      {showAreaSuggestions && (
                        <div className="absolute z-[70] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {(filters.city && filteredAreaOptions.length > 0 
                            ? filteredAreaOptions 
                            : filters.city 
                              ? [] // City selected but no areas yet - show empty until loaded
                              : AREA_OPTIONS).filter(area =>
                            area.toLowerCase().includes((filters.area || '').toLowerCase())
                          ).map((area, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleFilterChange('area', area);
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

                  {/* Type - Multi-select */}
                  <MultiSelect
                    options={[...PROPERTY_TYPE_OPTIONS]}
                    value={selectedTypes}
                    onChange={handleTypeChange}
                    placeholder="Select property types"
                    label="Type"
                  />

                  {/* Price Range - Slider */}
                  <RangeSlider
                    min={0}
                    max={1000}
                    step={5}
                    value={priceRange}
                    onChange={handlePriceRangeChange}
                    formatValue={(v) => `${v} Lakhs`}
                    label="Price Range (Lakhs)"
                  />

                  {/* Size Range with Inline Size Unit - Slider */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-2 flex-wrap">
                      <span>Size Range (in </span>
                      {/* Use native select for better mobile UX */}
                      <select
                        value={filters.size_unit || 'Gaj'}
                        onChange={(e) => handleFilterChange('size_unit', e.target.value)}
                        className="text-gray-700 text-xs font-medium border border-gray-300 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {SIZE_UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span>)</span>
                    </label>
                    <RangeSlider
                      min={0}
                      max={10000}
                      step={50}
                      value={sizeRange}
                      onChange={handleSizeRangeChange}
                      formatValue={(v) => v.toString()}
                    />
                  </div>
                </div>

                {/* Additional Section - Collapsible */}
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-900"
                  >
                    <span>Additional</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showAdditionalFilters ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showAdditionalFilters && (
                    <div className="space-y-3 pt-2">
                      {/* Tags - Multi-select */}
                      <MultiSelect
                        options={[...TAG_OPTIONS]}
                        value={selectedTags}
                        onChange={handleTagsChange}
                        placeholder="Select tags"
                        label="Tags"
                      />

                      {/* Highlights - Multi-select */}
                      <MultiSelect
                        options={[...HIGHLIGHT_OPTIONS]}
                        value={selectedHighlights}
                        onChange={handleHighlightsChange}
                        placeholder="Select highlights"
                        label="Highlights"
                      />

                      {/* Location and Landmark */}
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Location Filters</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="has_location_mobile"
                            checked={filters.has_location === true}
                            onChange={(e) => handleFilterChange('has_location', e.target.checked ? true : undefined)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="has_location_mobile" className="text-sm text-gray-700">
                            Has Location
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="has_landmark_mobile"
                            checked={filters.has_landmark === true}
                            onChange={(e) => handleFilterChange('has_landmark', e.target.checked ? true : undefined)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="has_landmark_mobile" className="text-sm text-gray-700">
                            Has Landmark
                          </label>
                        </div>
                      </div>

                      {/* Filter by Size Unit */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Size Unit</label>
                        <select
                          value={filters.filter_size_unit || ''}
                          onChange={(e) => handleFilterChange('filter_size_unit', e.target.value || undefined)}
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
                  )}
                </div>

                {/* Sort By - Directly (not in collapsible) */}
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={filters.sortby || ''}
                      onChange={(e) => handleFilterChange('sortby', e.target.value || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Default (ID)</option>
                      <option value="id">ID</option>
                      <option value="price">Price</option>
                      <option value="size">Size</option>
                      <option value="created_on">Created Date</option>
                      <option value="updated_on">Updated Date</option>
                    </select>
                  </div>

                  {filters.sortby && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
                      <select
                        value={filters.order || 'DESC'}
                        onChange={(e) => handleFilterChange('order', e.target.value as 'ASC' | 'DESC')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="DESC">Descending</option>
                        <option value="ASC">Ascending</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Inline filters */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded-lg p-4 space-y-4 shadow-lg z-[60]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Filters</h3>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* City and Area Section - Default Open */}
            <div className="space-y-3">
              {/* Area label with City dropdown on right */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Area/Address
                  </label>
                    <select
                      value={filters.city || user?.default_city || 'Panipat'}
                      onChange={(e) => {
                        handleCitySelect(e.target.value);
                      }}
                      className="px-2 py-1 text-xs text-gray-700 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {(cityOptionsWithLabels.length > 0 ? cityOptionsWithLabels : CITY_OPTIONS.map(c => ({value: c, label: c}))).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                </div>
                {/* Area Input */}
                <div className="relative">
                  <input
                    ref={areaInputRef}
                    type="text"
                    value={filters.area || ''}
                    onChange={(e) => handleFilterChange('area', e.target.value)}
                    onFocus={() => setShowAreaSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 200)}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                    placeholder="Sector 18"
                  />
                  <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  {showAreaSuggestions && (
                    <div className="absolute z-[70] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {(filters.city && filteredAreaOptions.length > 0 
                        ? filteredAreaOptions 
                        : filters.city 
                          ? [] // City selected but no areas yet - show empty until loaded
                          : AREA_OPTIONS).filter(area =>
                        area.toLowerCase().includes((filters.area || '').toLowerCase())
                      ).map((area, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleFilterChange('area', area);
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

              {/* Type - Multi-select - Full width */}
              <MultiSelect
                options={[...PROPERTY_TYPE_OPTIONS]}
                value={selectedTypes}
                onChange={handleTypeChange}
                placeholder="Select property types"
                label="Type"
              />

              {/* Price Range - Slider - Full width */}
              <RangeSlider
                min={0}
                max={1000}
                step={5}
                value={priceRange}
                onChange={handlePriceRangeChange}
                formatValue={(v) => `${v} Lakhs`}
                label="Price Range (Lakhs)"
              />

              {/* Size Range with Inline Size Unit - Slider - Full width */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-2 flex-wrap">
                  <span>Size Range (in </span>
                  {/* Desktop: Use native select for consistent UX */}
                  <select
                    value={filters.size_unit || 'Gaj'}
                    onChange={(e) => handleFilterChange('size_unit', e.target.value)}
                    className="text-gray-700 text-xs font-medium border border-gray-300 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {SIZE_UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span>)</span>
                </label>
                <RangeSlider
                  min={0}
                  max={10000}
                  step={50}
                  value={sizeRange}
                  onChange={handleSizeRangeChange}
                  formatValue={(v) => v.toString()}
                />
              </div>
            </div>

            {/* Additional Section - Collapsible */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900"
              >
                <span>Additional</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showAdditionalFilters ? 'rotate-180' : ''}`} />
              </button>
              
              {showAdditionalFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Tags - Multi-select */}
                  <MultiSelect
                    options={[...TAG_OPTIONS]}
                    value={selectedTags}
                    onChange={handleTagsChange}
                    placeholder="Select tags"
                    label="Tags"
                  />

                  {/* Highlights - Multi-select */}
                  <MultiSelect
                    options={[...HIGHLIGHT_OPTIONS]}
                    value={selectedHighlights}
                    onChange={handleHighlightsChange}
                    placeholder="Select highlights"
                    label="Highlights"
                  />

                  {/* Location and Landmark */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-700">Location Filters</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="has_location_desktop"
                        checked={filters.has_location === true}
                        onChange={(e) => handleFilterChange('has_location', e.target.checked ? true : undefined)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="has_location_desktop" className="text-sm text-gray-700">
                        Has Location
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="has_landmark_desktop"
                        checked={filters.has_landmark === true}
                        onChange={(e) => handleFilterChange('has_landmark', e.target.checked ? true : undefined)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="has_landmark_desktop" className="text-sm text-gray-700">
                        Has Landmark
                      </label>
                    </div>
                  </div>

                  {/* Filter by Size Unit */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Size Unit</label>
                    <select
                      value={filters.filter_size_unit || ''}
                      onChange={(e) => handleFilterChange('filter_size_unit', e.target.value || undefined)}
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
              )}
            </div>

            {/* Sort By - Directly (not in collapsible) */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Sort By</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={filters.sortby || ''}
                    onChange={(e) => handleFilterChange('sortby', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Default (ID)</option>
                    <option value="id">ID</option>
                    <option value="price">Price</option>
                    <option value="size">Size</option>
                    <option value="created_on">Created Date</option>
                    <option value="updated_on">Updated Date</option>
                  </select>
                </div>

                {filters.sortby && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
                    <select
                      value={filters.order || 'DESC'}
                      onChange={(e) => handleFilterChange('order', e.target.value as 'ASC' | 'DESC')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="DESC">Descending</option>
                      <option value="ASC">Ascending</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
