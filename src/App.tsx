import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Home, Globe, ChevronDown, User, MapPin, List, X } from 'lucide-react';
import { PropertyCard } from './components/PropertyCard';
import { PropertyCardSkeleton } from './components/PropertyCardSkeleton';
import { SearchFilter } from './components/SearchFilter';
import { Toast } from './components/Toast';
import { InstallPromptCard } from './components/InstallPrompt';
import { useAuth } from './contexts/AuthContext';
import { propertyApi } from './services/api';
import { Property, PropertyFormData, FilterOptions } from './types/property';
import { logoutUser, getCurrentUser } from './types/user';
import { authApi } from './services/authApi';
import { STORAGE_KEYS } from './utils/filterOptions';
import { formatPriceWithLabel } from './utils/priceFormatter';
import { formatSize } from './utils/sizeFormatter';

// Lazy load heavy components
const PropertyModal = lazy(() => import('./components/PropertyModal').then(m => ({ default: m.PropertyModal })));
const PropertyDetailsModal = lazy(() => import('./components/PropertyDetailsModal').then(m => ({ default: m.PropertyDetailsModal })));
const ContactModal = lazy(() => import('./components/ContactModal').then(m => ({ default: m.ContactModal })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HomePage = lazy(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicPropertyPage = lazy(() => import('./components/PublicPropertyPage').then(m => ({ default: m.PublicPropertyPage })));
const PropertyMap = lazy(() => import('./components/PropertyMap').then(m => ({ default: m.PropertyMap })));

type FilterType = 'all' | 'my' | 'public';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

function App() {
  const { ownerId, setOwnerId, isAuthenticated, setUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => {
    try {
      const hasVisited = localStorage.getItem('has_visited_app');
      // Show landing page if user hasn't visited, or if explicitly set to show
      return hasVisited !== 'true';
    } catch {
      // If localStorage fails, default to showing landing page
      return true;
    }
  });
  
  // Load persisted activeFilter from localStorage
  const loadPersistedFilter = (): FilterType => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILTER);
      if (saved && (saved === 'all' || saved === 'my' || saved === 'public')) {
        return saved as FilterType;
      }
    } catch {}
    return 'all';
  };

  // Load persisted search column from localStorage
  const loadPersistedSearchColumn = (): string => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEARCH_COLUMN);
      return saved || 'general';
    } catch {}
    return 'general';
  };

  // Load persisted filters from localStorage
  const loadPersistedFilters = (): FilterOptions => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTERS);
      if (saved) {
        const filters = JSON.parse(saved);
        // Clean empty values
        return Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
        ) as FilterOptions;
      }
    } catch {}
    return {};
  };

  // Load persisted search query from localStorage
  const loadPersistedSearchQuery = (): string => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '';
    } catch {}
    return '';
  };

  const [activeFilter, setActiveFilter] = useState<FilterType>(loadPersistedFilter());
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [publicProperties, setPublicProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const loadedDataRef = useRef<{ ownerId: number; my: boolean; public: boolean } | null>(null);
  const isRefreshingRef = useRef(false);
  const refreshInProgressRef = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchQuery, setSearchQuery] = useState(loadPersistedSearchQuery());
  const [searchColumn, setSearchColumn] = useState<string>(loadPersistedSearchColumn());
  const [activeFilters, setActiveFilters] = useState<FilterOptions>(loadPersistedFilters());
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [searchFilterKey, setSearchFilterKey] = useState(0); // Key to force SearchFilter reset
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const loadMyProperties = useCallback(async () => {
    if (!ownerId || ownerId <= 0) return;
    try {
      const data = await propertyApi.getUserProperties(ownerId);
      setMyProperties(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load properties';
      showToast(errorMessage, 'error');
    }
  }, [ownerId]);

  const loadPublicProperties = useCallback(async () => {
    if (!ownerId || ownerId <= 0) return;
    try {
      const data = await propertyApi.getPublicProperties(ownerId);
      setPublicProperties(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load public properties';
      showToast(errorMessage, 'error');
    }
  }, [ownerId]);


  useEffect(() => {
    // Don't load properties if we're on the public property page
    if (location.pathname.startsWith('/property/')) {
      return;
    }
    
    // Only load properties if user is authenticated and has a valid ownerId
    if (!isAuthenticated || !ownerId || ownerId <= 0) {
      loadedDataRef.current = null;
      return;
    }
    
    // Reset loaded data if ownerId changed
    if (loadedDataRef.current && loadedDataRef.current.ownerId !== ownerId) {
      loadedDataRef.current = null;
      setMyProperties([]);
      setPublicProperties([]);
    }
    
    // Prevent duplicate requests
    if (loadingRef.current) return;
    
    // If filters or search are active, skip loading all properties
    // The filter/search API will handle loading the filtered results
    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    const hasActiveSearch = searchQuery.trim().length > 0;
    
    if (hasActiveFilters || hasActiveSearch) {
      // Don't load properties here - let handleFilter or handleSearch handle it
      // They will use the filter/search API directly
      return;
    }
    
    // Check if we already have the data we need
    const needsMy = activeFilter === 'my' || activeFilter === 'all';
    const needsPublic = activeFilter === 'public' || activeFilter === 'all';
    
    // Check what we've already loaded for this ownerId
    const hasMy = loadedDataRef.current?.ownerId === ownerId && loadedDataRef.current.my;
    const hasPublic = loadedDataRef.current?.ownerId === ownerId && loadedDataRef.current.public;
    
    // If we have all the data we need, don't load
    if (needsMy && needsPublic && hasMy && hasPublic) return;
    if (needsMy && !needsPublic && hasMy) return;
    if (!needsMy && needsPublic && hasPublic) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    // Initialize loaded data ref if needed
    if (!loadedDataRef.current || loadedDataRef.current.ownerId !== ownerId) {
      loadedDataRef.current = { ownerId, my: false, public: false };
    }
    
    // Only load the properties needed based on the active filter
    const loadPromises: Promise<void>[] = [];
    
    if (needsMy && !hasMy) {
      loadPromises.push(
        loadMyProperties().then(() => {
          if (loadedDataRef.current) loadedDataRef.current.my = true;
        })
      );
    }
    if (needsPublic && !hasPublic) {
      loadPromises.push(
        loadPublicProperties().then(() => {
          if (loadedDataRef.current) loadedDataRef.current.public = true;
        })
      );
    }
    
    if (loadPromises.length === 0) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }
    
    Promise.all(loadPromises).then(() => {
      loadingRef.current = false;
      setLoading(false);
    }).catch(() => {
      loadingRef.current = false;
      setLoading(false);
    });
  }, [ownerId, location.pathname, isAuthenticated, activeFilter, loadMyProperties, loadPublicProperties, activeFilters, searchQuery]);

  useEffect(() => {
    // Only set default properties if there's no active search or filters
    if (!searchQuery.trim() && Object.keys(activeFilters).length === 0) {
      let propertiesToDisplay: Property[] = [];

      if (activeFilter === 'all') {
        // Combine my and public properties for 'all' view
        propertiesToDisplay = [...myProperties, ...publicProperties];
      } else if (activeFilter === 'my') {
        propertiesToDisplay = myProperties;
      } else if (activeFilter === 'public') {
        propertiesToDisplay = publicProperties;
      }

      // Always update filteredProperties when there's no active search/filter
      // This ensures it stays in sync with the base properties
      setFilteredProperties(propertiesToDisplay);
    }
  }, [activeFilter, myProperties, publicProperties, searchQuery, activeFilters]);

  // Apply filters/search on initial load if they exist (before properties are loaded)
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    // Only run once on mount when authenticated and ownerId is available
    if (initialLoadDoneRef.current || !isAuthenticated || !ownerId || ownerId <= 0) {
      return;
    }
    
    // Don't run on public property page
    if (location.pathname.startsWith('/property/')) {
      return;
    }
    
    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    const hasActiveSearch = searchQuery.trim().length > 0;
    
    // If filters or search exist, apply them immediately using API
    // This avoids loading all properties first, then filtering
    if (hasActiveFilters || hasActiveSearch) {
      initialLoadDoneRef.current = true;
      if (hasActiveSearch) {
        handleSearch(searchQuery, searchColumn);
      } else if (hasActiveFilters) {
        handleFilter(activeFilters);
      }
    } else {
      initialLoadDoneRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, ownerId, location.pathname]); // Only run once when authenticated

  // Handle property links for logged-in users - open in modal instead of public page
  useEffect(() => {
    const handlePropertyLink = async () => {
      // Only handle if user is authenticated and on property route
      if (!isAuthenticated || !ownerId || !location.pathname.startsWith('/property/')) {
        return;
      }

      const propertyIdMatch = location.pathname.match(/^\/property\/(\d+)$/);
      if (!propertyIdMatch) return;

      const propertyId = parseInt(propertyIdMatch[1]);
      if (isNaN(propertyId)) return;

      try {
        // Fetch the property
        const property = await propertyApi.getPropertyById(propertyId);
        
        if (property && property.is_public === 1) {
          // Set property and open modal
          setSelectedProperty(property);
          setShowDetailsModal(true);
          // Navigate to home to show the modal in the main app context
          navigate('/home', { replace: true });
        }
      } catch (error) {
        console.error('Failed to load property for logged-in user:', error);
        // If error, let it fall through to show public page
      }
    };

    handlePropertyLink();
  }, [isAuthenticated, ownerId, location.pathname, navigate]);

  // Re-apply filters after properties are loaded (fixes issue where filters applied before properties load)
  // NOTE: This is now mostly redundant since we handle filters/search on initial load
  // Keeping it as a safety net but with stricter guards to prevent duplicate calls
  const filtersReappliedRef = useRef<string>('');
  const lastFilterCallRef = useRef<number>(0);
  
  useEffect(() => {
    // Skip if we're currently refreshing (refreshPropertiesAndFilters handles filter application)
    if (isRefreshingRef.current) {
      return;
    }
    
    // Skip if we already handled initial load with filters/search
    if (!initialLoadDoneRef.current) {
      return;
    }
    
    // Prevent rapid duplicate calls - debounce by 500ms
    const now = Date.now();
    if (now - lastFilterCallRef.current < 500) {
      return;
    }
    
    // Only re-apply if we have active filters and properties have been loaded
    // AND we're not in a filtered state (if filteredProperties has data, filters were already applied)
    const hasProperties = (activeFilter === 'all' && (myProperties.length > 0 || publicProperties.length > 0)) ||
                          (activeFilter === 'my' && myProperties.length > 0) ||
                          (activeFilter === 'public' && publicProperties.length > 0);
    
    // If filteredProperties already has data and filters are active, don't re-apply
    // This means filters were already applied via API
    if (filteredProperties.length > 0 && Object.keys(activeFilters).length > 0) {
      return;
    }
    
    // Create a key from activeFilters to track if we've already re-applied for these specific filters
    const filtersKey = JSON.stringify(activeFilters);
    
    // Check if filters were applied before properties loaded
    // Only re-apply if: filters exist, properties are loaded, no search query, and we haven't re-applied for these filters yet
    const shouldReapply = Object.keys(activeFilters).length > 0 && 
                         hasProperties && 
                         !searchQuery.trim() &&
                         filtersReappliedRef.current !== filtersKey;
    
    if (shouldReapply) {
      filtersReappliedRef.current = filtersKey;
      lastFilterCallRef.current = now;
      // Re-apply filters after properties are loaded
      handleFilter(activeFilters);
    }
    
    // Reset flag when filters are cleared
    if (Object.keys(activeFilters).length === 0) {
      filtersReappliedRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProperties, publicProperties, activeFilter, activeFilters, searchQuery, filteredProperties]); // Only re-run when properties change

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Helper function to apply filters client-side (for combining search + filters)
  const applyClientSideFilters = useCallback((properties: Property[], filters: FilterOptions): Property[] => {
    return properties.filter(property => {
      if (filters.city && property.city !== filters.city) return false;
      if (filters.area && property.area !== filters.area) return false;
      if (filters.type && property.type !== filters.type) return false;
      if (filters.min_price !== undefined && property.price_min < filters.min_price) return false;
      if (filters.max_price !== undefined && property.price_max > filters.max_price) return false;
      if (filters.min_size !== undefined && property.min_size < filters.min_size) return false;
      if (filters.max_size !== undefined && property.size_max > filters.max_size) return false;
      if (filters.size_unit && property.size_unit !== filters.size_unit) return false;
      if (filters.description && !property.description.toLowerCase().includes(filters.description.toLowerCase())) return false;
      if (filters.location && !property.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.tags && !property.tags?.toLowerCase().includes(filters.tags.toLowerCase())) return false;
      if (filters.highlights && !property.highlights?.toLowerCase().includes(filters.highlights.toLowerCase())) return false;
      return true;
    });
  }, []);

  // Helper function to refresh all properties and re-apply filters
  const refreshPropertiesAndFilters = useCallback(async (updateSelectedProperty?: boolean) => {
    // Prevent multiple simultaneous refresh calls
    if (refreshInProgressRef.current) {
      return;
    }
    refreshInProgressRef.current = true;
    
    // Set refreshing flag to prevent useEffect from triggering duplicate filter calls
    isRefreshingRef.current = true;
    
    // Map activeFilter to API list parameter
    const listParam: 'mine' | 'public' | 'both' = 
      activeFilter === 'my' ? 'mine' : 
      activeFilter === 'public' ? 'public' : 
      'both';
    
    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    const hasActiveSearch = searchQuery.trim().length > 0;
    
    // If filters or search are active, use filter/search API directly instead of loading all properties
    // This avoids making multiple requests (load all + filter)
    if (hasActiveFilters || hasActiveSearch) {
      try {
        if (hasActiveSearch) {
          // Use search API
          const searchResults = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn);
          let filtered = searchResults;
          // Apply additional filters client-side if any
          if (hasActiveFilters) {
            filtered = applyClientSideFilters(searchResults, activeFilters);
          }
          setFilteredProperties(filtered);
          
          // Update selectedProperty if needed
          if (updateSelectedProperty && selectedProperty) {
            const updatedProperty = filtered.find(p => p.id === selectedProperty.id);
            if (updatedProperty) {
              setSelectedProperty(updatedProperty);
            }
          }
        } else if (hasActiveFilters) {
          // Use filter API directly - single request instead of loading all + filtering
          const filtered = await propertyApi.filterProperties(ownerId, listParam, activeFilters);
          setFilteredProperties(filtered);
          
          // Update selectedProperty if needed
          if (updateSelectedProperty && selectedProperty) {
            const updatedProperty = filtered.find(p => p.id === selectedProperty.id);
            if (updatedProperty) {
              setSelectedProperty(updatedProperty);
            }
          }
        }
      } catch (error) {
        showToast('Failed to refresh properties', 'error');
        setFilteredProperties([]);
      } finally {
        // Clear refreshing flags
        refreshInProgressRef.current = false;
        setTimeout(() => {
          isRefreshingRef.current = false;
        }, 100);
      }
      return; // Exit early - no need to load all properties
    }
    
    // No filters/search - load properties normally
    // Refresh property lists based on active filter (only load what's needed)
    const loadPromises: Promise<Property[]>[] = [];
    
    if (activeFilter === 'my') {
      loadPromises.push(propertyApi.getUserProperties(ownerId));
    } else if (activeFilter === 'public') {
      loadPromises.push(propertyApi.getPublicProperties(ownerId));
    } else if (activeFilter === 'all') {
      // For 'all', load both lists
      loadPromises.push(propertyApi.getUserProperties(ownerId), propertyApi.getPublicProperties(ownerId));
    }
    
    const loadedResults = await Promise.all(loadPromises);
    
    // Update state based on what was loaded
    let myProps: Property[] = [];
    let publicProps: Property[] = [];
    
    if (activeFilter === 'my') {
      myProps = loadedResults[0];
      setMyProperties(myProps);
      if (loadedDataRef.current) loadedDataRef.current.my = true;
    } else if (activeFilter === 'public') {
      publicProps = loadedResults[0];
      setPublicProperties(publicProps);
      if (loadedDataRef.current) loadedDataRef.current.public = true;
    } else if (activeFilter === 'all') {
      myProps = loadedResults[0];
      publicProps = loadedResults[1];
      setMyProperties(myProps);
      setPublicProperties(publicProps);
      if (loadedDataRef.current) {
        loadedDataRef.current.my = true;
        loadedDataRef.current.public = true;
      }
    }
    
    // Get all properties for current filter
    const allLoadedProperties = activeFilter === 'all' 
      ? [...myProps, ...publicProps] 
      : activeFilter === 'my' 
        ? myProps 
        : publicProps;
    
    // Update selectedProperty if modal is open and updateSelectedProperty is true
    if (updateSelectedProperty && selectedProperty) {
      const updatedProperty = allLoadedProperties.find(p => p.id === selectedProperty.id);
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
    }
    
    // No filters/search - use fresh data directly
    setFilteredProperties(allLoadedProperties);
    
    // Clear refreshing flags after a short delay to allow state updates to complete
    refreshInProgressRef.current = false;
    setTimeout(() => {
      isRefreshingRef.current = false;
    }, 100);
  }, [ownerId, searchQuery, searchColumn, activeFilter, activeFilters, applyClientSideFilters, selectedProperty, showToast]);

  const handleAddProperty = async (data: PropertyFormData) => {
    try {
      const response = await propertyApi.addProperty(ownerId, data);
      const newPropertyId = response.id;
      
      // Update cache with new city/area only on successful add
      const { updateCacheWithCityArea } = await import('./utils/areaCityApi');
      if (data.city && data.area) {
        updateCacheWithCityArea(data.city.trim(), data.area.trim());
      }
      
      showToast('Property added successfully', 'success');
      setShowModal(false);
      
      // Fetch the newly added property directly since we know it will be in user's properties
      // This is more reliable than waiting for state updates
      try {
        const myProps = await propertyApi.getUserProperties(ownerId);
        const newProperty = myProps.find(p => p.id === newPropertyId);
        
        if (newProperty) {
          // Update state with refreshed properties
          setMyProperties(myProps);
          
          // Clear any active filters/search so the new property is visible
          setSearchQuery('');
          setActiveFilters({});
          
          // Switch to 'my' filter if not already, so the property is visible in the list
          if (activeFilter !== 'my') {
            setActiveFilter('my');
            // Update filtered properties for 'my' filter
            setFilteredProperties(myProps);
          } else {
            // Already on 'my' filter, just update the filtered properties
            setFilteredProperties(myProps);
          }
          
          // Set the newly added property as selected and open detail modal
          setSelectedProperty(newProperty);
          setShowDetailsModal(true);
        } else {
          // Property not found (shouldn't happen), just refresh normally
          await refreshPropertiesAndFilters();
        }
      } catch (error) {
        console.error('Failed to fetch newly added property:', error);
        // Fallback: just refresh properties normally
        await refreshPropertiesAndFilters();
      }
    } catch (error) {
      showToast('Failed to add property', 'error');
    }
  };

  const handleEditProperty = async (data: PropertyFormData) => {
    if (!editingProperty) return;
    try {
      await propertyApi.updateProperty(editingProperty.id, ownerId, data);
      
      // Update cache with new city/area only on successful update
      const { updateCacheWithCityArea } = await import('./utils/areaCityApi');
      if (data.city && data.area) {
        updateCacheWithCityArea(data.city.trim(), data.area.trim());
      }
      
      showToast('Property updated successfully', 'success');
      setShowModal(false);
      setEditingProperty(null);
      setShowDetailsModal(false);
      await refreshPropertiesAndFilters();
    } catch (error) {
      showToast('Failed to update property', 'error');
    }
  };

  const handleDeleteProperty = async (id: number) => {
    try {
      await propertyApi.deleteProperty(id, ownerId);
      showToast('Property deleted successfully', 'success');
      setShowDetailsModal(false);
      setSelectedProperty(null);
      await refreshPropertiesAndFilters();
    } catch (error) {
      showToast('Failed to delete property', 'error');
    }
  };

  const handleTogglePublic = async (id: number, isPublic: boolean) => {
    try {
      await propertyApi.updateProperty(id, ownerId, { is_public: isPublic ? 1 : 0 });
      showToast(`Property made ${isPublic ? 'public' : 'private'}`, 'success');
      await refreshPropertiesAndFilters(true);
    } catch (error) {
      showToast('Failed to update property', 'error');
    }
  };

  const handleUpdateHighlightsAndTags = async (id: number, highlights: string, tags: string) => {
    try {
      await propertyApi.updateProperty(id, ownerId, { highlights, tags });
      showToast('Highlights and tags updated successfully', 'success');
      await refreshPropertiesAndFilters(true);
    } catch (error) {
      showToast('Failed to update highlights and tags', 'error');
    }
  };

  const handleUpdateLocation = async (id: number, location: string, locationAccuracy: string) => {
    try {
      await propertyApi.updateProperty(id, ownerId, { location, location_accuracy: locationAccuracy });
      showToast('Location updated successfully', 'success');
      await refreshPropertiesAndFilters(true);
    } catch (error) {
      showToast('Failed to update location', 'error');
    }
  };

  const handleUpdateLandmarkLocation = async (id: number, landmarkLocation: string, landmarkLocationDistance: string) => {
    try {
      await propertyApi.updateProperty(id, ownerId, { landmark_location: landmarkLocation, landmark_location_distance: landmarkLocationDistance });
      showToast('Landmark location updated successfully', 'success');
      await refreshPropertiesAndFilters(true);
    } catch (error) {
      showToast('Failed to update landmark location', 'error');
    }
  };

  const handleShare = async (property: Property) => {
    const sizeText = formatSize(property.min_size, property.size_max, property.size_unit);
    const priceText = formatPriceWithLabel(property.price_min, property.price_max);
    const shareUrl = property.is_public === 1 
      ? `${window.location.origin}/property/${property.id}`
      : undefined;
    // For navigator.share, don't include URL in text (it's passed separately)
    // For clipboard fallback, include URL in text
    const textForShare = `${property.type} in ${property.area}, ${property.city}\n${property.description}\nSize: ${sizeText}\nPrice: ${priceText}`;
    const textForClipboard = `${textForShare}${shareUrl ? `\n\nView: ${shareUrl}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.type} - ${property.area}`,
          text: textForShare,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          showToast('Failed to share', 'error');
        }
      }
    } else {
      navigator.clipboard.writeText(textForClipboard);
      showToast('Property details copied to clipboard', 'success');
    }
  };

  const handleSearch = useCallback(
    async (query: string, column?: string) => {
      setSearchQuery(query);
      if (column !== undefined) {
        setSearchColumn(column);
      }
      
      // Map activeFilter to API list parameter
      const listParam: 'mine' | 'public' | 'both' = 
        activeFilter === 'my' ? 'mine' : 
        activeFilter === 'public' ? 'public' : 
        'both';

      // Use the current search column if column parameter is not provided
      const currentColumn = column !== undefined ? column : searchColumn;

      // If no query and no active filters, show default list
      if (!query.trim() && Object.keys(activeFilters).length === 0) {
        if (activeFilter === 'all') {
          setFilteredProperties([...myProperties, ...publicProperties]);
        } else if (activeFilter === 'my') {
          setFilteredProperties(myProperties);
        } else if (activeFilter === 'public') {
          setFilteredProperties(publicProperties);
        }
        return;
      }

      // Set loading state
      setLoading(true);

      try {
        // If there's a search query, use search API
        if (query.trim()) {
          const results = await propertyApi.searchProperties(ownerId, listParam, query, currentColumn);
          // Apply additional filters if any
          let filtered = results;
          if (Object.keys(activeFilters).length > 0) {
            filtered = applyClientSideFilters(results, activeFilters);
          }
          // Always set filteredProperties, even if empty (to show "no results")
          setFilteredProperties(filtered);
        } else if (Object.keys(activeFilters).length > 0) {
          // If only filters (no search), use filter API directly
          // This avoids loading all properties first, then filtering
          const results = await propertyApi.filterProperties(ownerId, listParam, activeFilters);
          // Always set filteredProperties, even if empty (to show "no results")
          setFilteredProperties(results);
        }
      } catch (error) {
        showToast('Search failed', 'error');
        // On error, set empty array to show "no results" instead of falling back to base properties
        setFilteredProperties([]);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, myProperties, publicProperties, ownerId, activeFilters, applyClientSideFilters, searchColumn, showToast]
  );

  const handleFilter = useCallback(
    async (filters: FilterOptions) => {
      // Update activeFilters immediately
      setActiveFilters(filters);
      
      // Map activeFilter to API list parameter
      const listParam: 'mine' | 'public' | 'both' = 
        activeFilter === 'my' ? 'mine' : 
        activeFilter === 'public' ? 'public' : 
        'both';

      // If no filters and no search query, show default list
      if (Object.keys(filters).length === 0 && !searchQuery.trim()) {
        // Clear filters - load properties normally
        if (activeFilter === 'all') {
          setFilteredProperties([...myProperties, ...publicProperties]);
        } else if (activeFilter === 'my') {
          setFilteredProperties(myProperties);
        } else if (activeFilter === 'public') {
          setFilteredProperties(publicProperties);
        }
        return;
      }

      // Set loading state
      setLoading(true);
      
      try {
        // If there's a search query, use search API and apply filters client-side
        if (searchQuery.trim()) {
          const results = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn);
          const filtered = applyClientSideFilters(results, filters);
          setFilteredProperties(filtered);
        } else {
          // If only filters (no search), use filter API directly
          // This avoids loading all properties first, then filtering
          const results = await propertyApi.filterProperties(ownerId, listParam, filters);
          // Always set filteredProperties, even if empty (to show "no results")
          setFilteredProperties(results);
        }
      } catch (error) {
        showToast('Filter failed', 'error');
        // On error, set empty array to show "no results" instead of falling back to base properties
        setFilteredProperties([]);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, myProperties, publicProperties, ownerId, searchQuery, searchColumn, applyClientSideFilters, showToast]
  );

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.ACTIVE_FILTER, filter);
    setShowFilterMenu(false);
    
    // Re-apply current search/filters with new list scope
    if (searchQuery.trim()) {
      handleSearch(searchQuery, searchColumn);
    } else if (Object.keys(activeFilters).length > 0) {
      handleFilter(activeFilters);
    }
  };

  const handleClearSearchAndFilters = useCallback(() => {
    // Clear from localStorage first
    localStorage.removeItem(STORAGE_KEYS.SEARCH_QUERY);
    localStorage.removeItem(STORAGE_KEYS.FILTERS);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_AREA);
    
    // Clear state - this will trigger the useEffect to reset filteredProperties
    setSearchQuery('');
    setActiveFilters({});
    
    // Force SearchFilter to reset by changing key - this will cause it to remount
    setSearchFilterKey(prev => prev + 1);
    
    // Reset filteredProperties immediately based on current filter
    // This ensures properties show up immediately after clearing
    if (activeFilter === 'all') {
      setFilteredProperties([...myProperties, ...publicProperties]);
    } else if (activeFilter === 'my') {
      setFilteredProperties(myProperties);
    } else {
      setFilteredProperties(publicProperties);
    }
  }, [activeFilter, myProperties, publicProperties]);

  const handleUserIdChange = () => {
    const newId = prompt('Enter Owner ID:', ownerId.toString());
    if (newId && !isNaN(parseInt(newId))) {
      setOwnerId(parseInt(newId));
      showToast(`Switched to user ${newId}`, 'success');
    }
  };

  const handleAskQuestion = (property: Property) => {
    if (!property.owner_phone) {
      showToast('Owner phone number not available', 'error');
      return;
    }
    setSelectedProperty(property);
    setShowContactModal(true);
  };

  const handleContactSubmit = async (_message: string, _phone: string) => {
    showToast('Question sent via WhatsApp!', 'success');
  };

  const handleLogin = (userId: number) => {
    // Refresh user from localStorage (set by loginUser function)
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setOwnerId(userId);
    // Show login success message
    showToast('Login successful!', 'success');
    // After login, check if user has visited before
    try {
      const hasVisited = localStorage.getItem('has_visited_app');
      if (hasVisited !== 'true') {
        setShowLandingPage(true);
      } else {
        setShowLandingPage(false);
      }
    } catch {
      setShowLandingPage(true);
    }
  };

  const handleGetStarted = () => {
    try {
      localStorage.setItem('has_visited_app', 'true');
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
    setShowLandingPage(false);
    // Navigate based on authentication status
    if (isAuthenticated) {
      navigate('/home');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    authApi.logout(); // Clear token from storage
    logoutUser(); // Clear user from local storage
    setUser(null);
    setShowLandingPage(true);
    try {
      localStorage.removeItem('has_visited_app');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Handle property view - always open modal in main app
  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  // Show minimal loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Property Page - Always accessible */}
      <Route path="/property/:id" element={
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        }>
          <PublicPropertyPage />
        </Suspense>
      } />
      
      {/* Landing Page */}
      <Route path="/" element={
        showLandingPage || !isAuthenticated ? (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            <HomePage 
              onGetStarted={handleGetStarted}
              isAuthenticated={isAuthenticated}
              onGoToLogin={() => {
                authApi.logout();
                logoutUser();
                setUser(null);
                setShowLandingPage(false);
                navigate('/login');
              }}
              onGoToApp={() => {
                try {
                  localStorage.setItem('has_visited_app', 'true');
                } catch {}
                setShowLandingPage(false);
                if (isAuthenticated) {
                  navigate('/home');
                } else {
                  navigate('/login');
                }
              }}
            />
          </Suspense>
        ) : isAuthenticated ? (
          <MainAppContent
            ownerId={ownerId}
            navigate={navigate}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            myProperties={myProperties}
            publicProperties={publicProperties}
            filteredProperties={filteredProperties}
            loading={loading}
            showModal={showModal}
            setShowModal={setShowModal}
            showFilterMenu={showFilterMenu}
            setShowFilterMenu={setShowFilterMenu}
            editingProperty={editingProperty}
            setEditingProperty={setEditingProperty}
            toast={toast}
            setToast={setToast}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
            showDetailsModal={showDetailsModal}
            setShowDetailsModal={setShowDetailsModal}
            showContactModal={showContactModal}
            setShowContactModal={setShowContactModal}
            filterMenuRef={filterMenuRef}
            handleFilterChange={handleFilterChange}
            handleSearch={handleSearch}
            handleFilter={handleFilter}
            handleViewProperty={handleViewProperty}
            handleAddProperty={handleAddProperty}
            handleEditProperty={handleEditProperty}
            handleDeleteProperty={handleDeleteProperty}
            handleTogglePublic={handleTogglePublic}
            handleShare={handleShare}
            handleAskQuestion={handleAskQuestion}
            handleContactSubmit={handleContactSubmit}
            handleUpdateHighlightsAndTags={handleUpdateHighlightsAndTags}
            handleUpdateLocation={handleUpdateLocation}
            handleUpdateLandmarkLocation={handleUpdateLandmarkLocation}
            handleClearSearchAndFilters={handleClearSearchAndFilters}
            showToast={showToast}
            searchFilterKey={searchFilterKey}
          />
        ) : (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            <AuthPage 
              onLogin={handleLogin}
              onGoToHome={() => navigate('/')}
            />
          </Suspense>
        )
      } />
      
      {/* Auth Page */}
      <Route path="/login" element={
        isAuthenticated ? (
          <MainAppContent
            ownerId={ownerId}
            navigate={navigate}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            myProperties={myProperties}
            publicProperties={publicProperties}
            filteredProperties={filteredProperties}
            loading={loading}
            showModal={showModal}
            setShowModal={setShowModal}
            showFilterMenu={showFilterMenu}
            setShowFilterMenu={setShowFilterMenu}
            editingProperty={editingProperty}
            setEditingProperty={setEditingProperty}
            toast={toast}
            setToast={setToast}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
            showDetailsModal={showDetailsModal}
            setShowDetailsModal={setShowDetailsModal}
            showContactModal={showContactModal}
            setShowContactModal={setShowContactModal}
            filterMenuRef={filterMenuRef}
            handleFilterChange={handleFilterChange}
            handleSearch={handleSearch}
            handleFilter={handleFilter}
            handleViewProperty={handleViewProperty}
            handleAddProperty={handleAddProperty}
            handleEditProperty={handleEditProperty}
            handleDeleteProperty={handleDeleteProperty}
            handleTogglePublic={handleTogglePublic}
            handleShare={handleShare}
            handleAskQuestion={handleAskQuestion}
            handleContactSubmit={handleContactSubmit}
            handleUpdateHighlightsAndTags={handleUpdateHighlightsAndTags}
            handleUpdateLocation={handleUpdateLocation}
            handleUpdateLandmarkLocation={handleUpdateLandmarkLocation}
            handleClearSearchAndFilters={handleClearSearchAndFilters}
            showToast={showToast}
            searchFilterKey={searchFilterKey}
          />
        ) : (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            <AuthPage 
              onLogin={handleLogin}
              onGoToHome={() => navigate('/')}
            />
          </Suspense>
        )
      } />
      
      {/* Authenticated Routes */}
      <Route path="/home" element={
        isAuthenticated ? (
          <MainAppContent
            ownerId={ownerId}
            navigate={navigate}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            myProperties={myProperties}
            publicProperties={publicProperties}
            filteredProperties={filteredProperties}
            loading={loading}
            showModal={showModal}
            setShowModal={setShowModal}
            showFilterMenu={showFilterMenu}
            setShowFilterMenu={setShowFilterMenu}
            editingProperty={editingProperty}
            setEditingProperty={setEditingProperty}
            toast={toast}
            setToast={setToast}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchColumn={searchColumn}
            setSearchColumn={setSearchColumn}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
            showDetailsModal={showDetailsModal}
            setShowDetailsModal={setShowDetailsModal}
            showContactModal={showContactModal}
            setShowContactModal={setShowContactModal}
            filterMenuRef={filterMenuRef}
            handleFilterChange={handleFilterChange}
            handleSearch={handleSearch}
            handleFilter={handleFilter}
            handleViewProperty={handleViewProperty}
            handleAddProperty={handleAddProperty}
            handleEditProperty={handleEditProperty}
            handleDeleteProperty={handleDeleteProperty}
            handleTogglePublic={handleTogglePublic}
            handleShare={handleShare}
            handleAskQuestion={handleAskQuestion}
            handleContactSubmit={handleContactSubmit}
            handleUpdateHighlightsAndTags={handleUpdateHighlightsAndTags}
            handleUpdateLocation={handleUpdateLocation}
            handleUpdateLandmarkLocation={handleUpdateLandmarkLocation}
            handleClearSearchAndFilters={handleClearSearchAndFilters}
            showToast={showToast}
            searchFilterKey={searchFilterKey}
          />
        ) : (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            <AuthPage 
              onLogin={handleLogin}
              onGoToHome={() => navigate('/')}
            />
          </Suspense>
        )
      } />
      <Route path="/profile" element={
        isAuthenticated ? (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            <ProfilePage 
              onBack={() => navigate('/home')}
              onLogout={() => {
                handleLogout();
                showToast('Logged out', 'success');
                navigate('/login');
              }}
            />
          </Suspense>
        ) : (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            <AuthPage 
              onLogin={handleLogin}
              onGoToHome={() => navigate('/')}
            />
          </Suspense>
        )
      } />
    </Routes>
  );
}

// Main App Content Component
interface MainAppContentProps {
  ownerId: number;
  navigate: any;
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
  myProperties: Property[];
  publicProperties: Property[];
  filteredProperties: Property[];
  loading: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  showFilterMenu: boolean;
  setShowFilterMenu: (show: boolean) => void;
  editingProperty: Property | null;
  setEditingProperty: (property: Property | null) => void;
  toast: ToastState | null;
  setToast: (toast: ToastState | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchColumn: string;
  setSearchColumn: (column: string) => void;
  activeFilters: FilterOptions;
  setActiveFilters: (filters: FilterOptions) => void;
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  showDetailsModal: boolean;
  setShowDetailsModal: (show: boolean) => void;
  showContactModal: boolean;
  setShowContactModal: (show: boolean) => void;
  filterMenuRef: React.RefObject<HTMLDivElement>;
  handleFilterChange: (filter: FilterType) => void;
  handleSearch: (query: string, column?: string) => void;
  handleFilter: (filters: FilterOptions) => void;
  handleViewProperty: (property: Property) => void;
  handleAddProperty: (data: PropertyFormData) => Promise<void>;
  handleEditProperty: (data: PropertyFormData) => Promise<void>;
  handleDeleteProperty: (id: number) => Promise<void>;
  handleTogglePublic: (id: number, isPublic: boolean) => Promise<void>;
  handleShare: (property: Property) => void;
  handleAskQuestion: (property: Property) => void;
  handleContactSubmit: (message: string, phone: string) => Promise<void>;
  handleUpdateHighlightsAndTags: (id: number, highlights: string, tags: string) => Promise<void>;
  handleUpdateLocation: (id: number, location: string, locationAccuracy: string) => Promise<void>;
  handleUpdateLandmarkLocation: (id: number, landmarkLocation: string, landmarkLocationDistance: string) => Promise<void>;
  handleClearSearchAndFilters: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  searchFilterKey: number;
}

function MainAppContent({
  ownerId,
  navigate,
  activeFilter,
  setActiveFilter,
  myProperties,
  publicProperties,
  filteredProperties,
  loading,
  showModal,
  setShowModal,
  showFilterMenu,
  setShowFilterMenu,
  editingProperty,
  setEditingProperty,
  toast,
  setToast,
  searchQuery,
  setSearchQuery,
  searchColumn,
  setSearchColumn,
  activeFilters,
  setActiveFilters,
  selectedProperty,
  setSelectedProperty,
  showDetailsModal,
  setShowDetailsModal,
  showContactModal,
  setShowContactModal,
  filterMenuRef,
  handleFilterChange,
  handleSearch,
  handleFilter,
  handleViewProperty,
  handleAddProperty,
  handleEditProperty,
  handleDeleteProperty,
  handleTogglePublic,
  handleShare,
  handleAskQuestion,
  handleContactSubmit,
  handleUpdateHighlightsAndTags,
  handleUpdateLocation,
  handleUpdateLandmarkLocation,
  handleClearSearchAndFilters,
  showToast,
  searchFilterKey,
}: MainAppContentProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Check if search or filters are active
  const hasActiveSearchOrFilter = searchQuery.trim().length > 0 || Object.keys(activeFilters).length > 0;
  
  // Get the base properties based on active filter
  const getBaseProperties = () => {
    if (activeFilter === 'all') {
      return [...myProperties, ...publicProperties];
    } else if (activeFilter === 'my') {
      return myProperties;
    } else {
      return publicProperties;
    }
  };
  
  const baseProperties = getBaseProperties();
  
  // If search/filter is active, always use filteredProperties (even if empty - shows "no results")
  // Only fall back to base properties if there's no active search/filter
  const currentProperties = hasActiveSearchOrFilter
    ? filteredProperties 
    : baseProperties;

  const getFilterLabel = () => {
    if (activeFilter === 'all') return 'All Properties';
    if (activeFilter === 'my') return 'My Properties';
    return 'Public Properties';
  };

  // Calculate map center from properties with coordinates
  const getMapCenter = (): [number, number] => {
    const propertiesWithCoords = currentProperties.filter(
      (p) => p.location && p.location.includes(',')
    );
    
    if (propertiesWithCoords.length === 0) {
      return [29.3909, 76.9635]; // Default: Panipat
    }
    
    // Calculate average center of all properties
    let totalLat = 0;
    let totalLng = 0;
    let count = 0;
    
    propertiesWithCoords.forEach((property) => {
      const coords = property.location.split(',').map((c) => parseFloat(c.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        totalLat += coords[0];
        totalLng += coords[1];
        count++;
      }
    });
    
    if (count > 0) {
      return [totalLat / count, totalLng / count];
    }
    
    return [29.3909, 76.9635]; // Default: Panipat
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Dealer Network</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Profile"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className={`p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                  viewMode === 'map' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
                title={viewMode === 'list' ? 'Switch to Map View' : 'Switch to List View'}
              >
                {viewMode === 'list' ? (
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <List className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <div className="relative" ref={filterMenuRef}>
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm"
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">{getFilterLabel()}</span>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                </button>

                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-48 sm:w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => handleFilterChange('all')}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors ${
                        activeFilter === 'all'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>All Properties</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleFilterChange('my')}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors ${
                        activeFilter === 'my'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>My Properties</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleFilterChange('public')}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors ${
                        activeFilter === 'public'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Public Properties</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <SearchFilter
          key={searchFilterKey}
          onSearch={handleSearch}
          onFilter={handleFilter}
        />

        <div className="mt-4 sm:mt-6">
          {loading ? (
            viewMode === 'list' ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(3)].map((_, index) => (
                  <PropertyCardSkeleton key={index} noTopBorder={index === 0} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )
          ) : viewMode === 'map' ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
              {currentProperties.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm sm:text-base text-gray-500 mb-3">
                      {hasActiveSearchOrFilter 
                        ? 'No properties found matching your search or filters.' 
                        : activeFilter === 'my' 
                          ? 'No properties yet. Add your first property!' 
                          : 'No properties available'}
                    </p>
                    {hasActiveSearchOrFilter && (
                      <button
                        onClick={handleClearSearchAndFilters}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Clear Search & Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <Suspense fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Loading map...</p>
                    </div>
                  </div>
                }>
                  <PropertyMap 
                    properties={currentProperties} 
                    center={getMapCenter()}
                    onMarkerClick={handleViewProperty}
                  />
                </Suspense>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <InstallPromptCard />
              {currentProperties.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
                  <p className="text-sm sm:text-base text-gray-500 mb-4">
                    {hasActiveSearchOrFilter 
                      ? 'No properties found matching your search or filters.' 
                      : activeFilter === 'my' 
                        ? 'No properties yet. Add your first property!' 
                        : 'No properties available'}
                  </p>
                  {hasActiveSearchOrFilter && (
                    <button
                      onClick={handleClearSearchAndFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear Search & Filters
                    </button>
                  )}
                </div>
              ) : (
                currentProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isOwned={property.owner_id === ownerId}
                    onViewDetails={handleViewProperty}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm text-white">Loading...</p>
            </div>
          </div>
        }>
          <PropertyModal
            property={editingProperty}
            onClose={() => {
              setShowModal(false);
              setEditingProperty(null);
            }}
            onSubmit={editingProperty ? handleEditProperty : handleAddProperty}
          />
        </Suspense>
      )}

      {showDetailsModal && selectedProperty && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm text-white">Loading...</p>
            </div>
          </div>
        }>
          <PropertyDetailsModal
            property={selectedProperty}
            isOwned={selectedProperty.owner_id === ownerId}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedProperty(null);
            }}
            onEdit={(p) => {
              setEditingProperty(p);
              setShowDetailsModal(false);
              setShowModal(true);
            }}
            onDelete={handleDeleteProperty}
            onTogglePublic={handleTogglePublic}
            onShare={handleShare}
            onAskQuestion={handleAskQuestion}
            onUpdateHighlightsAndTags={handleUpdateHighlightsAndTags}
            onUpdateLocation={handleUpdateLocation}
            onUpdateLandmarkLocation={handleUpdateLandmarkLocation}
          />
        </Suspense>
      )}

      {showContactModal && selectedProperty && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm text-white">Loading...</p>
            </div>
          </div>
        }>
          <ContactModal
            property={selectedProperty}
            ownerPhone={selectedProperty.owner_phone || ''}
            senderId={ownerId}
            onClose={() => {
              setShowContactModal(false);
              setSelectedProperty(null);
            }}
            onSubmit={handleContactSubmit}
          />
        </Suspense>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <button
        onClick={() => {
          setEditingProperty(null);
          setShowModal(true);
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-6 md:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center z-40 hover:scale-110 duration-200"
        title="Add Property"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

    </div>
  );
}

export default App;
