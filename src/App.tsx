import { useState, useEffect, useCallback, useRef, Suspense, lazy, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Home, Globe, ChevronDown, User, Map, List, X, Users, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { PropertyCard } from './components/PropertyCard';
import { PropertyCardSkeleton } from './components/PropertyCardSkeleton';
import { SearchFilter } from './components/SearchFilter';
import { Toast } from './components/Toast';
import { InstallPromptCard } from './components/InstallPrompt';
import { useAuth } from './contexts/AuthContext';
import { propertyApi, PaginationOptions, PaginationMeta } from './services/api';
import { Property, PropertyFormData, FilterOptions } from './types/property';
import { logoutUser, getCurrentUser } from './types/user';
import { authApi } from './services/authApi';
import { STORAGE_KEYS } from './utils/filterOptions';
import { formatPriceWithLabel } from './utils/priceFormatter';
import { formatSize } from './utils/sizeFormatter';

// Lazy load heavy components
const PropertyModal = lazy(() => import('./components/PropertyModal').then(m => ({ default: m.PropertyModal })));
const PropertyDetailsModal = lazy(() => import('./components/PropertyDetailsModal').then(m => ({ default: m.PropertyDetailsModal })));
const PropertyDetailsContent = lazy(() => import('./components/PropertyDetailsContent').then(m => ({ default: m.PropertyDetailsContent })));
const ContactModal = lazy(() => import('./components/ContactModal').then(m => ({ default: m.ContactModal })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HomePage = lazy(() => import('./components/HomePage').then(m => ({ default: m.HomePage })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicPropertyPage = lazy(() => import('./components/PublicPropertyPage').then(m => ({ default: m.PublicPropertyPage })));
const PropertyMap = lazy(() => import('./components/PropertyMap').then(m => ({ default: m.PropertyMap })));
import { MapFocusPoint } from './components/PropertyMap';
const ResetPinPage = lazy(() => import('./components/ResetPinPage').then(m => ({ default: m.ResetPinPage })));
const ResetPage = lazy(() => import('./components/ResetPage').then(m => ({ default: m.ResetPage })));

type FilterType = 'all' | 'my' | 'public' | 'saved';

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
      if (saved && (saved === 'all' || saved === 'my' || saved === 'public' || saved === 'saved')) {
        return saved as FilterType;
      }
    } catch { }
    return 'all';
  };

  // Load persisted search column from localStorage
  const loadPersistedSearchColumn = (): string => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEARCH_COLUMN);
      return saved || 'general';
    } catch { }
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
    } catch { }
    return {};
  };

  // Load persisted search query from localStorage
  const loadPersistedSearchQuery = (): string => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '';
    } catch { }
    return '';
  };

  const [activeFilter, setActiveFilter] = useState<FilterType>(loadPersistedFilter());
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [publicProperties, setPublicProperties] = useState<Property[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationOptions>({ page: 1, per_page: 40 });
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const loadingRef = useRef(false);
  const loadedDataRef = useRef<{ ownerId: number; my: boolean; public: boolean; saved: boolean; page?: number; per_page?: number } | null>(null);
  const forceReloadRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const refreshInProgressRef = useRef(false);
  const requestIdRef = useRef(0); // Track request IDs to prevent duplicates
  const pendingRequestRef = useRef<{ ownerId: number; activeFilter: FilterType; page: number; per_page: number } | null>(null);
  const pendingFilterRequestRef = useRef<string | null>(null); // Track pending filter/search requests to prevent duplicates
  const filterRequestIdRef = useRef(0); // Track filter/search request IDs to prevent duplicates
  const filterLoadingRef = useRef(false); // Track if a filter/search request is currently loading
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
  const [mapFocus, setMapFocus] = useState<MapFocusPoint | null>(null);

  // Persist current route to localStorage
  useEffect(() => {
    // Only persist routes for authenticated users
    if (isAuthenticated && location.pathname !== '/') {
      try {
        // Don't persist public property routes or login/reset-pin routes
        if (!location.pathname.startsWith('/property/') &&
          location.pathname !== '/login' &&
          location.pathname !== '/reset-pin') {
          localStorage.setItem('last_route', location.pathname);
        }
      } catch (error) {
        console.error('Failed to save route:', error);
      }
    }
  }, [location.pathname, isAuthenticated]);

  // Restore last route on app load for authenticated users
  useEffect(() => {
    // Only run once when authentication is ready
    if (!authLoading && isAuthenticated && location.pathname === '/') {
      try {
        const lastRoute = localStorage.getItem('last_route');
        // If we have a saved route and user is on root path, restore the last route
        if (lastRoute && lastRoute !== '/' && lastRoute !== '/login') {
          navigate(lastRoute, { replace: true });
        } else {
          // No saved route, go to /home by default for authenticated users
          navigate('/home', { replace: true });
        }
      } catch (error) {
        console.error('Failed to restore route:', error);
        // Fallback to /home on error
        navigate('/home', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, location.pathname, navigate]);

  const loadMyProperties = useCallback(async (paginationOptions?: PaginationOptions) => {
    if (!ownerId || ownerId <= 0) return;
    try {
      const paginationParams = paginationOptions || pagination;
      const response = await propertyApi.getUserProperties(ownerId, paginationParams);
      setMyProperties(response.data);
      setPaginationMeta(response.meta);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load properties';
      setToast({ message: errorMessage, type: 'error' });
    }
  }, [ownerId, pagination]);

  const loadPublicProperties = useCallback(async (paginationOptions?: PaginationOptions) => {
    if (!ownerId || ownerId <= 0) return;
    try {
      const paginationParams = paginationOptions || pagination;
      const response = await propertyApi.getPublicProperties(ownerId, paginationParams);
      setPublicProperties(response.data);
      setPaginationMeta(response.meta);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load public properties';
      setToast({ message: errorMessage, type: 'error' });
    }
  }, [ownerId, pagination]);

  const loadSavedProperties = useCallback(async (paginationOptions?: PaginationOptions) => {
    if (!ownerId || ownerId <= 0) return;
    try {
      const paginationParams = paginationOptions || pagination;
      const response = await propertyApi.getSavedProperties(ownerId, paginationParams);
      setSavedProperties(response.data);
      setPaginationMeta(response.meta);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load saved properties';
      setToast({ message: errorMessage, type: 'error' });
    }
  }, [ownerId, pagination]);


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

    // If filters or search are active, skip loading all properties
    // The filter/search API will handle loading the filtered results
    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    const hasActiveSearch = searchQuery.trim().length > 0;

    if (hasActiveFilters || hasActiveSearch) {
      // Don't load properties here - let handleFilter or handleSearch handle it
      // They will use the filter/search API directly
      return;
    }

    // Check for duplicate requests - normalize pagination values
    const currentPage = pagination.page ?? 1;
    const currentPerPage = pagination.per_page ?? 40;
    const normalizedPagination = { page: currentPage, per_page: currentPerPage };
    const pendingRequest = pendingRequestRef.current;
    if (pendingRequest &&
      pendingRequest.ownerId === ownerId &&
      pendingRequest.activeFilter === activeFilter &&
      pendingRequest.page === currentPage &&
      pendingRequest.per_page === currentPerPage) {
      // Same request is already pending, skip
      return;
    }

    // Prevent duplicate requests - check if already loading
    if (loadingRef.current) {
      // Check if this is a different request than what's currently loading
      if (pendingRequest &&
        (pendingRequest.ownerId !== ownerId ||
          pendingRequest.activeFilter !== activeFilter ||
          pendingRequest.page !== currentPage ||
          pendingRequest.per_page !== currentPerPage)) {
        // Different request, allow it (will cancel previous one via ref check)
      } else {
        // Same request already loading, skip
        return;
      }
    }

    // Check if we already have the data we need
    // Check if we already have the data we need
    const needsMy = activeFilter === 'my' || activeFilter === 'all';
    const needsPublic = activeFilter === 'public' || activeFilter === 'all';
    const needsSaved = activeFilter === 'saved';

    // Check what we've already loaded for this ownerId
    const hasMy = loadedDataRef.current?.ownerId === ownerId && loadedDataRef.current.my;
    const hasPublic = loadedDataRef.current?.ownerId === ownerId && loadedDataRef.current.public;
    const hasSaved = loadedDataRef.current?.ownerId === ownerId && loadedDataRef.current.saved;

    // Check if pagination has changed - if so, we need to reload
    const paginationChanged = loadedDataRef.current?.page !== currentPage ||
      loadedDataRef.current?.per_page !== currentPerPage;

    // If force reload is set, always reload
    const shouldForceReload = forceReloadRef.current;
    if (shouldForceReload) {
      forceReloadRef.current = false;
    }

    // If we have all the data we need and not forcing reload and pagination hasn't changed, don't load
    if (!shouldForceReload && !paginationChanged) {
      if (activeFilter === 'all' && hasMy && hasPublic) return;
      if (activeFilter === 'my' && hasMy) return;
      if (activeFilter === 'public' && hasPublic) return;
      if (activeFilter === 'saved' && hasSaved) return;
    }

    // Mark as loading and track this request
    loadingRef.current = true;
    pendingRequestRef.current = {
      ownerId,
      activeFilter,
      page: currentPage,
      per_page: currentPerPage
    };
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);

    // Initialize loaded data ref if needed
    if (!loadedDataRef.current || loadedDataRef.current.ownerId !== ownerId || shouldForceReload || paginationChanged) {
      loadedDataRef.current = {
        ownerId,
        my: false,
        public: false,
        saved: false,
        page: currentPage,
        per_page: currentPerPage
      };
    }

    // Only load the properties needed based on the active filter
    const loadPromises: Promise<void>[] = [];

    // If 'all' filter, use getAllProperties for efficiency (single API call)
    if (activeFilter === 'all' && (!hasMy || !hasPublic || shouldForceReload || paginationChanged)) {
      loadPromises.push(
        (async () => {
          try {
            // Check if request is still valid (not cancelled by a new request)
            if (requestIdRef.current !== currentRequestId) {
              return; // Request cancelled
            }
            const response = await propertyApi.getAllProperties(ownerId, normalizedPagination);
            // Check again after async operation
            if (requestIdRef.current !== currentRequestId) {
              return; // Request cancelled
            }
            const allProps = response.data;
            // Split results: my properties have owner_id === ownerId, public properties have owner_id !== ownerId
            const myProps = allProps.filter(p => p.owner_id === ownerId);
            const publicProps = allProps.filter(p => p.owner_id !== ownerId);
            setMyProperties(myProps);
            setPublicProperties(publicProps);
            setPaginationMeta(response.meta);
            if (loadedDataRef.current) {
              loadedDataRef.current.my = true;
              loadedDataRef.current.public = true;
              loadedDataRef.current.page = currentPage;
              loadedDataRef.current.per_page = currentPerPage;
            }
          } catch (error) {
            // Only show error if this is still the current request
            if (requestIdRef.current === currentRequestId) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to load properties';
              setToast({ message: errorMessage, type: 'error' });
            }
          }
        })()
      );
    } else {
      // Load separately for 'my' or 'public' filters
      if (needsMy && (!hasMy || shouldForceReload || paginationChanged)) {
        loadPromises.push(
          (async () => {
            try {
              if (requestIdRef.current !== currentRequestId) return;
              await loadMyProperties(normalizedPagination);
              if (requestIdRef.current !== currentRequestId) return;
              if (loadedDataRef.current) {
                loadedDataRef.current.my = true;
                loadedDataRef.current.page = currentPage;
                loadedDataRef.current.per_page = currentPerPage;
              }
            } catch (error) {
              if (requestIdRef.current === currentRequestId) {
                // Error already handled in loadMyProperties
              }
            }
          })()
        );
      }
      if (needsPublic && (!hasPublic || shouldForceReload || paginationChanged)) {
        loadPromises.push(
          (async () => {
            try {
              if (requestIdRef.current !== currentRequestId) return;
              await loadPublicProperties(normalizedPagination);
              if (requestIdRef.current !== currentRequestId) return;
              if (loadedDataRef.current) {
                loadedDataRef.current.public = true;
                loadedDataRef.current.page = currentPage;
                loadedDataRef.current.per_page = currentPerPage;
              }
            } catch (error) {
              if (requestIdRef.current === currentRequestId) {
                // Error already handled in loadPublicProperties
              }
            }
          })()
        );
      }
      if (needsSaved && (!hasSaved || shouldForceReload || paginationChanged)) {
        loadPromises.push(
          (async () => {
            try {
              if (requestIdRef.current !== currentRequestId) return;
              await loadSavedProperties(normalizedPagination);
              if (requestIdRef.current !== currentRequestId) return;
              if (loadedDataRef.current) {
                loadedDataRef.current.saved = true;
                loadedDataRef.current.page = currentPage;
                loadedDataRef.current.per_page = currentPerPage;
              }
            } catch (error) {
              if (requestIdRef.current === currentRequestId) {
                // Error already handled in loadSavedProperties
              }
            }
          })()
        );
      }
    }

    if (loadPromises.length === 0) {
      loadingRef.current = false;
      pendingRequestRef.current = null;
      setLoading(false);
      return;
    }

    Promise.all(loadPromises).then(() => {
      // Only update state if this is still the current request
      if (requestIdRef.current === currentRequestId) {
        loadingRef.current = false;
        pendingRequestRef.current = null;
        setLoading(false);
      }
    }).catch(() => {
      if (requestIdRef.current === currentRequestId) {
        loadingRef.current = false;
        pendingRequestRef.current = null;
        setLoading(false);
      }
    });
  }, [ownerId, location.pathname, isAuthenticated, activeFilter, activeFilters, searchQuery, pagination.page, pagination.per_page]);

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
      } else if (activeFilter === 'saved') {
        propertiesToDisplay = savedProperties;
      }

      // Always update filteredProperties when there's no active search/filter
      // This ensures it stays in sync with the base properties
      setFilteredProperties(propertiesToDisplay);
    }
  }, [activeFilter, myProperties, publicProperties, savedProperties, searchQuery, activeFilters]);

  // Apply filters/search on initial load if they exist (before properties are loaded)
  const initialLoadDoneRef = useRef(false);
  const initialLoadOwnerIdRef = useRef<number | null>(null);
  useEffect(() => {
    // Only run once per ownerId when authenticated and ownerId is available
    if (!isAuthenticated || !ownerId || ownerId <= 0) {
      initialLoadDoneRef.current = false;
      initialLoadOwnerIdRef.current = null;
      return;
    }

    // Don't run on public property page
    if (location.pathname.startsWith('/property/')) {
      return;
    }

    // Skip if we've already handled initial load for this ownerId
    if (initialLoadDoneRef.current && initialLoadOwnerIdRef.current === ownerId) {
      return;
    }

    // Skip if properties are currently being loaded (let the main effect handle it)
    if (loadingRef.current) {
      return;
    }

    // Skip if a filter/search request is already pending or loading
    if (pendingFilterRequestRef.current || filterLoadingRef.current) {
      return;
    }

    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    const hasActiveSearch = searchQuery.trim().length > 0;

    // If filters or search exist, apply them immediately using API
    // This avoids loading all properties first, then filtering
    if (hasActiveFilters || hasActiveSearch) {
      // Generate request key upfront to prevent duplicates
      const currentFilter = activeFilter;
      const listParam: 'mine' | 'others' | 'both' | 'saved' =
        currentFilter === 'my' ? 'mine' :
          currentFilter === 'public' ? 'others' :
            currentFilter === 'saved' ? 'saved' :
              currentFilter === 'all' ? 'both' :
                'both';

      // Sort filter keys to ensure consistent stringification
      const sortedFilters = Object.keys(activeFilters).sort().reduce((acc, key) => {
        (acc as any)[key] = activeFilters[key as keyof FilterOptions];
        return acc;
      }, {} as FilterOptions);

      let requestKey: string;
      if (hasActiveSearch) {
        requestKey = `search:${ownerId}:${listParam}:${searchQuery.trim()}:${searchColumn}:${JSON.stringify(sortedFilters)}:1:40`;
      } else {
        requestKey = `filter:${ownerId}:${listParam}:${JSON.stringify(sortedFilters)}:${searchQuery.trim()}:${searchColumn}:1:40`;
      }

      // Check if this exact request is already pending
      if (pendingFilterRequestRef.current === requestKey) {
        return; // Already pending, skip
      }

      // Mark as pending BEFORE calling handlers
      pendingFilterRequestRef.current = requestKey;
      initialLoadDoneRef.current = true;
      initialLoadOwnerIdRef.current = ownerId;

      // Use setTimeout to ensure this runs after the main loading effect has checked
      setTimeout(() => {
        // Double-check that this is still the current request and not already loading
        if (pendingFilterRequestRef.current === requestKey && !filterLoadingRef.current) {
          if (hasActiveSearch) {
            handleSearch(searchQuery, searchColumn);
          } else if (hasActiveFilters) {
            handleFilter(activeFilters);
          }
        }
      }, 0);
    } else {
      // No filters/search - mark as done, let main effect handle loading
      initialLoadDoneRef.current = true;
      initialLoadOwnerIdRef.current = ownerId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, ownerId, location.pathname]); // Only run when authenticated/ownerId changes

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

  // Note: Removed filter re-apply effect to prevent duplicate requests
  // The initial load effect and main loading effect now handle all cases properly

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
      if (filters.size_min !== undefined && property.size_min < filters.size_min) return false;
      if (filters.max_size !== undefined && property.size_max > filters.max_size) return false;
      if (filters.size_unit && property.size_unit !== filters.size_unit) return false;
      if (filters.description && !property.description.toLowerCase().includes(filters.description.toLowerCase())) return false;
      if (filters.location && !property.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.tags) {
        const filterTags = Array.isArray(filters.tags) ? filters.tags.join(',') : filters.tags;
        if (!property.tags?.toLowerCase().includes(filterTags.toLowerCase())) return false;
      }
      if (filters.highlights) {
        const filterHighlights = Array.isArray(filters.highlights) ? filters.highlights.join(',') : filters.highlights;
        if (!property.highlights?.toLowerCase().includes(filterHighlights.toLowerCase())) return false;
      }
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
    // For filter API: mine, others, both, saved
    const listParam: 'mine' | 'others' | 'both' | 'saved' =
      activeFilter === 'my' ? 'mine' :
        activeFilter === 'public' ? 'others' :
          activeFilter === 'saved' ? 'saved' :
            activeFilter === 'all' ? 'both' :
              'both';

    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    const hasActiveSearch = searchQuery.trim().length > 0;

    // If filters or search are active, use filter/search API directly instead of loading all properties
    // This avoids making multiple requests (load all + filter)
    if (hasActiveFilters || hasActiveSearch) {
      try {
        if (hasActiveSearch) {
          // Use search API with pagination
          const searchResponse = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn, pagination);
          let filtered = searchResponse.data;
          // Apply additional filters client-side if any
          if (hasActiveFilters) {
            filtered = applyClientSideFilters(searchResponse.data, activeFilters);
          }
          setFilteredProperties(filtered);
          setPaginationMeta(searchResponse.meta);

          // Update selectedProperty if needed
          if (updateSelectedProperty && selectedProperty) {
            const updatedProperty = filtered.find(p => p.id === selectedProperty.id);
            if (updatedProperty) {
              setSelectedProperty(updatedProperty);
            }
          }
        } else if (hasActiveFilters) {
          // Use filter API directly with pagination - single request instead of loading all + filtering
          const filterResponse = await propertyApi.filterProperties(ownerId, listParam, activeFilters, pagination);
          setFilteredProperties(filterResponse.data);
          setPaginationMeta(filterResponse.meta);

          // Update selectedProperty if needed
          if (updateSelectedProperty && selectedProperty) {
            const updatedProperty = filterResponse.data.find(p => p.id === selectedProperty.id);
            if (updatedProperty) {
              setSelectedProperty(updatedProperty);
            }
          }
        }
      } catch (error) {
        showToast('Failed to refresh properties', 'error');
        setFilteredProperties([]);
        setPaginationMeta(null);
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
    let myProps: Property[] = [];
    let publicProps: Property[] = [];

    if (activeFilter === 'my') {
      const response = await propertyApi.getUserProperties(ownerId, pagination);
      myProps = response.data;
      setMyProperties(myProps);
      setPaginationMeta(response.meta);
      if (loadedDataRef.current) loadedDataRef.current.my = true;
    } else if (activeFilter === 'public') {
      const response = await propertyApi.getPublicProperties(ownerId, pagination);
      publicProps = response.data;
      setPublicProperties(publicProps);
      setPaginationMeta(response.meta);
      if (loadedDataRef.current) loadedDataRef.current.public = true;
    } else if (activeFilter === 'saved') {
      const response = await propertyApi.getSavedProperties(ownerId, pagination);
      setSavedProperties(response.data);
      setPaginationMeta(response.meta);
      if (loadedDataRef.current) loadedDataRef.current.saved = true;
    } else if (activeFilter === 'all') {
      // Use getAllProperties endpoint for efficiency (single API call)
      const response = await propertyApi.getAllProperties(ownerId, pagination);
      const allProps = response.data;
      // Split results: my properties have owner_id === ownerId, public properties have owner_id !== ownerId
      myProps = allProps.filter(p => p.owner_id === ownerId);
      publicProps = allProps.filter(p => p.owner_id !== ownerId);
      setMyProperties(myProps);
      setPublicProperties(publicProps);
      setPaginationMeta(response.meta);
      if (loadedDataRef.current) {
        loadedDataRef.current.my = true;
        loadedDataRef.current.public = true;
        // All properties doesn't necessarily include all saved properties, so we don't mark saved as true
      }
    }

    // Get all properties for current filter
    const allLoadedProperties = activeFilter === 'all'
      ? [...myProps, ...publicProps]
      : activeFilter === 'my'
        ? myProps
        : activeFilter === 'public'
          ? publicProps
          : savedProperties;

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
  }, [ownerId, searchQuery, searchColumn, activeFilter, activeFilters, applyClientSideFilters, selectedProperty, showToast, pagination, setPaginationMeta]);

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
        const response = await propertyApi.getUserProperties(ownerId, { page: 1, per_page: 40 });
        const myProps = response.data;
        const newProperty = myProps.find(p => p.id === newPropertyId);

        if (newProperty) {
          // Update state with refreshed properties
          setMyProperties(myProps);
          setPaginationMeta(response.meta);

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

  const handleFavProperty = async (id: number, isFavourite: boolean, userNote: string) => {
    try {
      // Optimistically update selected property if it's the one being favorited
      if (selectedProperty && selectedProperty.id === id) {
        setSelectedProperty({
          ...selectedProperty,
          is_favourite: isFavourite ? 1 : 0,
          user_note: userNote
        });
      }

      // Update in property lists
      const updateList = (list: Property[]) => list.map(p =>
        p.id === id ? { ...p, is_favourite: isFavourite ? 1 : 0, user_note: userNote } : p
      );

      setMyProperties(prev => updateList(prev));
      setPublicProperties(prev => updateList(prev));
      setFilteredProperties(prev => updateList(prev));

      await propertyApi.favProperty(ownerId, id, isFavourite ? 1 : 0, userNote);
      showToast(isFavourite ? 'Added to favorites' : 'Removed from favorites', 'success');

      // Refresh in background to ensure sync, but minimal impact due to optimistic update
      // await refreshPropertiesAndFilters(true);
    } catch (error) {
      showToast('Failed to update favorite', 'error');
      // Revert via refresh
      await refreshPropertiesAndFilters(true);
    }
  };

  const handleShare = async (property: Property) => {
    const sizeText = formatSize(property.size_min, property.size_max, property.size_unit);
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
    async (query: string, column?: string, filterOverride?: FilterType) => {
      setSearchQuery(query);
      if (column !== undefined) {
        setSearchColumn(column);
      }

      // Reset pagination to page 1 when search changes
      setPagination({ page: 1, per_page: 40 });

      // Use filterOverride if provided (for tab switching), otherwise use current activeFilter
      const currentFilter = filterOverride || activeFilter;

      // Map activeFilter to API list parameter
      // For filter/search API: mine, others, both, saved
      const listParam: 'mine' | 'others' | 'both' | 'saved' =
        currentFilter === 'my' ? 'mine' :
          currentFilter === 'public' ? 'others' :
            currentFilter === 'saved' ? 'saved' :
              currentFilter === 'all' ? 'both' :
                'both';

      // Use the current search column if column parameter is not provided
      const currentColumn = column !== undefined ? column : searchColumn;

      // If no query and no active filters, show default list
      if (!query.trim() && Object.keys(activeFilters).length === 0) {
        pendingFilterRequestRef.current = null;
        if (currentFilter === 'all') {
          setFilteredProperties([...myProperties, ...publicProperties]);
        } else if (currentFilter === 'my') {
          setFilteredProperties(myProperties);
        } else if (currentFilter === 'public') {
          setFilteredProperties(publicProperties);
        } else if (currentFilter === 'saved') {
          setFilteredProperties(savedProperties);
        }
        return;
      }

      // Normalize pagination for request key (use page 1 since we reset it above)
      const normalizedPage = 1;
      const normalizedPerPage = 40;

      // Create a unique key for this request to prevent duplicates
      // Sort filter keys to ensure consistent stringification
      const sortedFilters = Object.keys(activeFilters).sort().reduce((acc, key) => {
        (acc as any)[key] = activeFilters[key as keyof FilterOptions];
        return acc;
      }, {} as FilterOptions);
      const requestKey = `search:${ownerId}:${listParam}:${query.trim()}:${currentColumn}:${JSON.stringify(sortedFilters)}:${normalizedPage}:${normalizedPerPage}`;

      // Check if a different request is already pending
      if (pendingFilterRequestRef.current !== null && pendingFilterRequestRef.current !== requestKey) {
        return; // Different request pending, skip
      }

      // If the same request is already in progress, skip
      if (pendingFilterRequestRef.current === requestKey && filterLoadingRef.current) {
        return; // Same request already in progress
      }

      // Mark this request as pending and track request ID (only if not already set by initial load)
      if (pendingFilterRequestRef.current !== requestKey) {
        pendingFilterRequestRef.current = requestKey;
      }
      const currentFilterRequestId = ++filterRequestIdRef.current;

      // Set loading state
      filterLoadingRef.current = true;
      setLoading(true);

      try {
        // Check if request is still valid (not cancelled by a new request)
        if (filterRequestIdRef.current !== currentFilterRequestId) {
          return; // Request cancelled
        }

        // If there's a search query, use search API with pagination
        // Pass filters to search API so backend can handle filtering and sorting server-side
        if (query.trim()) {
          const searchResponse = await propertyApi.searchProperties(
            ownerId,
            listParam,
            query,
            currentColumn,
            { page: normalizedPage, per_page: normalizedPerPage },
            false, // forMap
            Object.keys(activeFilters).length > 0 ? activeFilters : undefined // Pass filters to backend
          );

          // Check again after async operation
          if (filterRequestIdRef.current !== currentFilterRequestId) {
            return; // Request cancelled
          }

          // Backend handles all filtering and sorting, so no client-side filtering needed
          // Always set filteredProperties, even if empty (to show "no results")
          setFilteredProperties(searchResponse.data);
          setPaginationMeta(searchResponse.meta);
        } else if (Object.keys(activeFilters).length > 0) {
          // If only filters (no search), use filter API directly with pagination
          // This avoids loading all properties first, then filtering
          const filterResponse = await propertyApi.filterProperties(ownerId, listParam, activeFilters, { page: normalizedPage, per_page: normalizedPerPage });

          // Check again after async operation
          if (filterRequestIdRef.current !== currentFilterRequestId) {
            return; // Request cancelled
          }

          // Always set filteredProperties, even if empty (to show "no results")
          setFilteredProperties(filterResponse.data);
          setPaginationMeta(filterResponse.meta);
        }
      } catch (error) {
        // Only show error if this is still the current request
        if (filterRequestIdRef.current === currentFilterRequestId) {
          showToast('Search failed', 'error');
          // On error, set empty array to show "no results" instead of falling back to base properties
          setFilteredProperties([]);
          setPaginationMeta(null);
        }
      } finally {
        // Clear pending request only if this is still the current request
        if (filterRequestIdRef.current === currentFilterRequestId && pendingFilterRequestRef.current === requestKey) {
          pendingFilterRequestRef.current = null;
          filterLoadingRef.current = false;
        }
        // Only update loading state if this is still the current request
        if (filterRequestIdRef.current === currentFilterRequestId) {
          filterLoadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [activeFilter, myProperties, publicProperties, savedProperties, ownerId, activeFilters, applyClientSideFilters, searchColumn, showToast, setPagination, pagination]
  );

  const handleFilter = useCallback(
    async (filters: FilterOptions, filterOverride?: FilterType) => {
      // Update activeFilters immediately
      setActiveFilters(filters);

      // Reset pagination to page 1 when filters change
      setPagination({ page: 1, per_page: 40 });

      // Use filterOverride if provided (for tab switching), otherwise use current activeFilter
      const currentFilter = filterOverride || activeFilter;

      // Map activeFilter to API list parameter
      // For filter/search API: mine, others, both, saved
      const listParam: 'mine' | 'others' | 'both' | 'saved' =
        currentFilter === 'my' ? 'mine' :
          currentFilter === 'public' ? 'others' :
            currentFilter === 'saved' ? 'saved' :
              currentFilter === 'all' ? 'both' :
                'both';

      // If no filters and no search query, show default list
      if (Object.keys(filters).length === 0 && !searchQuery.trim()) {
        pendingFilterRequestRef.current = null;
        // Clear filters - load properties normally
        if (currentFilter === 'all') {
          setFilteredProperties([...myProperties, ...publicProperties]);
        } else if (currentFilter === 'my') {
          setFilteredProperties(myProperties);
        } else if (currentFilter === 'public') {
          setFilteredProperties(publicProperties);
        } else if (currentFilter === 'saved') {
          setFilteredProperties(savedProperties);
        }
        return;
      }

      // Normalize pagination for request key (use page 1 since we reset it above)
      const normalizedPage = 1;
      const normalizedPerPage = 40;

      // Create a unique key for this request to prevent duplicates
      // Sort filter keys to ensure consistent stringification
      const sortedFilters = Object.keys(filters).sort().reduce((acc, key) => {
        (acc as any)[key] = filters[key as keyof FilterOptions];
        return acc;
      }, {} as FilterOptions);
      const requestKey = `filter:${ownerId}:${listParam}:${JSON.stringify(sortedFilters)}:${searchQuery.trim()}:${searchColumn}:${normalizedPage}:${normalizedPerPage}`;

      // Check if a different request is already pending
      if (pendingFilterRequestRef.current !== null && pendingFilterRequestRef.current !== requestKey) {
        return; // Different request pending, skip
      }

      // If the same request is already in progress, skip
      if (pendingFilterRequestRef.current === requestKey && filterLoadingRef.current) {
        return; // Same request already in progress
      }

      // Mark this request as pending and track request ID (only if not already set by initial load)
      if (pendingFilterRequestRef.current !== requestKey) {
        pendingFilterRequestRef.current = requestKey;
      }
      const currentFilterRequestId = ++filterRequestIdRef.current;

      // Set loading state
      filterLoadingRef.current = true;
      setLoading(true);

      try {
        // Check if request is still valid (not cancelled by a new request)
        if (filterRequestIdRef.current !== currentFilterRequestId) {
          return; // Request cancelled
        }

        // If there's a search query, use search API with filters passed to backend
        if (searchQuery.trim()) {
          const searchResponse = await propertyApi.searchProperties(
            ownerId,
            listParam,
            searchQuery,
            searchColumn,
            { page: normalizedPage, per_page: normalizedPerPage },
            false, // forMap
            Object.keys(filters).length > 0 ? filters : undefined // Pass filters to backend
          );

          // Check again after async operation
          if (filterRequestIdRef.current !== currentFilterRequestId) {
            return; // Request cancelled
          }

          // Backend handles all filtering and sorting, so no client-side filtering needed
          setFilteredProperties(searchResponse.data);
          setPaginationMeta(searchResponse.meta);
        } else {
          // If only filters (no search), use filter API directly with pagination
          // This avoids loading all properties first, then filtering
          const filterResponse = await propertyApi.filterProperties(ownerId, listParam, filters, { page: normalizedPage, per_page: normalizedPerPage });

          // Check again after async operation
          if (filterRequestIdRef.current !== currentFilterRequestId) {
            return; // Request cancelled
          }

          // Always set filteredProperties, even if empty (to show "no results")
          setFilteredProperties(filterResponse.data);
          setPaginationMeta(filterResponse.meta);
        }
      } catch (error) {
        // Only show error if this is still the current request
        if (filterRequestIdRef.current === currentFilterRequestId) {
          showToast('Filter failed', 'error');
          // On error, set empty array to show "no results" instead of falling back to base properties
          setFilteredProperties([]);
          setPaginationMeta(null);
        }
      } finally {
        // Clear pending request only if this is still the current request
        if (filterRequestIdRef.current === currentFilterRequestId && pendingFilterRequestRef.current === requestKey) {
          pendingFilterRequestRef.current = null;
          filterLoadingRef.current = false;
        }
        // Only update loading state if this is still the current request
        if (filterRequestIdRef.current === currentFilterRequestId) {
          filterLoadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [activeFilter, myProperties, publicProperties, savedProperties, ownerId, searchQuery, searchColumn, applyClientSideFilters, showToast, setPagination, pagination]
  );

  const handleFilterChange = (filter: FilterType) => {
    // Force reload when switching tabs
    forceReloadRef.current = true;
    setActiveFilter(filter);
    // Reset pagination to first page when switching tabs
    setPagination({ page: 1, per_page: 40 });
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.ACTIVE_FILTER, filter);
    setShowFilterMenu(false);

    // Clear filtered properties to show loading state
    setFilteredProperties([]);

    // Re-apply current search/filters with new list scope
    // Pass the new filter value directly to avoid using stale activeFilter
    if (searchQuery.trim()) {
      handleSearch(searchQuery, searchColumn, filter);
    } else if (Object.keys(activeFilters).length > 0) {
      handleFilter(activeFilters, filter);
    }
    // If no search/filters, the useEffect will trigger the load
  };

  const handleClearSearchAndFilters = useCallback(() => {
    // Clear from localStorage first
    localStorage.removeItem(STORAGE_KEYS.SEARCH_QUERY);
    localStorage.removeItem(STORAGE_KEYS.FILTERS);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_AREA);

    // Clear state - this will trigger the useEffect to reset filteredProperties
    setSearchQuery('');
    setActiveFilters({});

    // Reset pagination to page 1 when clearing filters
    setPagination({ page: 1, per_page: 40 });

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
  }, [activeFilter, myProperties, publicProperties, setPagination]);

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
      localStorage.removeItem('last_route'); // Clear persisted route
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Handle property view - always open modal in main app
  const handleViewProperty = (property: Property) => {
    // If property has location, focus map on it
    let coords: [number, number] | null = null;

    if (property.location && property.location.includes(',')) {
      const parts = property.location.split(',');
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords = [lat, lng];
      }
    } else if (property.landmark_location && property.landmark_location.includes(',')) {
      const parts = property.landmark_location.split(',');
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords = [lat, lng];
      }
    }

    if (coords) {
      setMapFocus({
        coords,
        zoom: 18,
        trigger: Date.now()
      });
    }

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
                } catch { }
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
            savedProperties={savedProperties}
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
            pagination={pagination}
            setPagination={setPagination}
            paginationMeta={paginationMeta}
            setLoading={setLoading}
            setFilteredProperties={setFilteredProperties}
            setPaginationMeta={setPaginationMeta}
            mapFocus={mapFocus}
            setMapFocus={setMapFocus}
            handleFavProperty={handleFavProperty}
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
      <Route path="/reset-pin" element={
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        }>
          <ResetPinPage />
        </Suspense>
      } />

      <Route path="/reset" element={
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        }>
          <ResetPage />
        </Suspense>
      } />

      <Route path="/login" element={
        isAuthenticated ? (
          <MainAppContent
            ownerId={ownerId}
            navigate={navigate}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            myProperties={myProperties}
            publicProperties={publicProperties}
            savedProperties={savedProperties}
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
            pagination={pagination}
            setPagination={setPagination}
            paginationMeta={paginationMeta}
            setLoading={setLoading}
            setFilteredProperties={setFilteredProperties}
            setPaginationMeta={setPaginationMeta}
            mapFocus={mapFocus}
            setMapFocus={setMapFocus}
            handleFavProperty={handleFavProperty}
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
            savedProperties={savedProperties}
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
            pagination={pagination}
            setPagination={setPagination}
            paginationMeta={paginationMeta}
            setLoading={setLoading}
            setFilteredProperties={setFilteredProperties}
            setPaginationMeta={setPaginationMeta}
            mapFocus={mapFocus}
            setMapFocus={setMapFocus}
            handleFavProperty={handleFavProperty}
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
  savedProperties: Property[];
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
  pagination: PaginationOptions;
  setPagination: (pagination: PaginationOptions) => void;
  paginationMeta: PaginationMeta | null;
  setLoading: (loading: boolean) => void;
  setFilteredProperties: (properties: Property[]) => void;
  setPaginationMeta: (meta: PaginationMeta | null) => void;
  mapFocus: MapFocusPoint | null;
  setMapFocus: (focus: MapFocusPoint | null) => void;
  handleFavProperty: (id: number, isFavourite: boolean, userNote: string) => void;
}

function MainAppContent({
  ownerId,
  navigate,
  activeFilter,
  setActiveFilter,
  myProperties,
  publicProperties,
  savedProperties,
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
  pagination,
  setPagination,
  paginationMeta,
  setLoading,
  setFilteredProperties,
  setPaginationMeta,
  mapFocus,
  setMapFocus,
  handleFavProperty,
}: MainAppContentProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapProperties, setMapProperties] = useState<Property[]>([]);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [showMapNote, setShowMapNote] = useState(true);

  // Update isDesktop on resize
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if search or filters are active
  const hasActiveSearchOrFilter = searchQuery.trim().length > 0 || Object.keys(activeFilters).length > 0;

  // Helper function to apply filters client-side (for combining search + filters)
  const applyClientSideFilters = useCallback((properties: Property[], filters: FilterOptions): Property[] => {
    return properties.filter(property => {
      if (filters.city && property.city !== filters.city) return false;
      if (filters.area && property.area !== filters.area) return false;
      if (filters.type && property.type !== filters.type) return false;
      if (filters.min_price !== undefined && property.price_min < filters.min_price) return false;
      if (filters.max_price !== undefined && property.price_max > filters.max_price) return false;
      if (filters.size_min !== undefined && property.size_min < filters.size_min) return false;
      if (filters.max_size !== undefined && property.size_max > filters.max_size) return false;
      if (filters.size_unit && property.size_unit !== filters.size_unit) return false;
      if (filters.description && !property.description.toLowerCase().includes(filters.description.toLowerCase())) return false;
      if (filters.location && !property.location.toLowerCase().includes(filters.location.toLowerCase())) return false;

      if (filters.tags) {
        const filterTags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        const propTags = property.tags?.toLowerCase() || '';
        // If property tags contain ANY of the filter tags
        const match = filterTags.some(tag => propTags.includes(tag.toLowerCase()));
        if (!match) return false;
      }

      if (filters.highlights) {
        const filterHighlights = Array.isArray(filters.highlights) ? filters.highlights : [filters.highlights];
        const propHighlights = property.highlights?.toLowerCase() || '';
        // If property highlights contain ANY of the filter highlights
        const match = filterHighlights.some(highlight => propHighlights.includes(highlight.toLowerCase()));
        if (!match) return false;
      }

      return true;
    });
  }, []);

  // Fetch properties for map view when viewMode changes to 'map' or on desktop
  useEffect(() => {
    if ((viewMode === 'map' || isDesktop) && ownerId > 0) {
      const fetchMapProperties = async () => {
        try {
          setLoading(true);
          const listParam: 'mine' | 'others' | 'both' | 'saved' =
            activeFilter === 'my' ? 'mine' :
              activeFilter === 'public' ? 'others' :
                activeFilter === 'saved' ? 'saved' :
                  activeFilter === 'all' ? 'both' :
                    'both';

          let mapProps: Property[] = [];

          if (hasActiveSearchOrFilter) {
            if (searchQuery.trim()) {
              const searchResponse = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn, pagination, true); // forMap = true
              let filtered = searchResponse.data;
              if (Object.keys(activeFilters).length > 0) {
                filtered = applyClientSideFilters(searchResponse.data, activeFilters);
              }
              mapProps = filtered;
            } else if (Object.keys(activeFilters).length > 0) {
              const filterResponse = await propertyApi.filterProperties(ownerId, listParam, activeFilters, pagination, true); // forMap = true
              mapProps = filterResponse.data;
            }
          } else {
            // No filters/search - fetch based on active filter
            if (activeFilter === 'my') {
              const response = await propertyApi.getUserProperties(ownerId, pagination, true); // forMap = true
              mapProps = response.data;
            } else if (activeFilter === 'public') {
              const response = await propertyApi.getPublicProperties(ownerId, pagination, true); // forMap = true
              mapProps = response.data;
            } else if (activeFilter === 'saved') {
              const response = await propertyApi.getSavedProperties(ownerId, pagination, true); // forMap = true
              mapProps = response.data;
            } else if (activeFilter === 'all') {
              const response = await propertyApi.getAllProperties(ownerId, pagination, true); // forMap = true
              mapProps = response.data;
            }
          }

          setMapProperties(mapProps);
        } catch (error) {
          console.error('Failed to fetch map properties:', error);
          setMapProperties([]);
        } finally {
          setLoading(false);
        }
      };

      fetchMapProperties();
    } else if (viewMode === 'list' && !isDesktop) {
      // Clear map properties when switching back to list view on mobile
      setMapProperties([]);
    }
  }, [viewMode, ownerId, activeFilter, searchQuery, searchColumn, activeFilters, pagination, hasActiveSearchOrFilter, applyClientSideFilters, setLoading, isDesktop]);

  const currentProperties = useMemo(() => {
    // If we have filtered properties (from search/filter), use those
    if (filteredProperties.length > 0 || hasActiveSearchOrFilter) {
      return filteredProperties;
    }

    // Otherwise use list based on view mode
    if (activeFilter === 'my') {
      return myProperties;
    }
    if (activeFilter === 'public') {
      return publicProperties;
    }
    if (activeFilter === 'saved') {
      return savedProperties;
    }

    // Default to combined list for 'all'
    return [...myProperties, ...publicProperties].sort((a, b) => b.id - a.id);
  }, [activeFilter, myProperties, publicProperties, savedProperties, filteredProperties, hasActiveSearchOrFilter]);

  // Determine if there's a next page
  // Show pagination when pagination metadata is available (works for both base lists and filtered/search results)
  // Use pagination metadata if available, otherwise fall back to checking array length
  const shouldShowPagination = paginationMeta !== null || !hasActiveSearchOrFilter;
  const currentPage = paginationMeta?.page || pagination.page || 1;
  const totalPages = paginationMeta?.total_pages || 1;
  const hasNextPage = shouldShowPagination && currentPage < totalPages;
  const hasPreviousPage = shouldShowPagination && currentPage > 1;
  // Show pagination if there are multiple pages, regardless of current page position
  const shouldDisplayPagination = shouldShowPagination && totalPages > 1;

  // Handle pagination navigation
  // Works for both base lists and filtered/search results
  const handleNextPage = async () => {
    if (hasNextPage && shouldShowPagination) {
      const newPage = currentPage + 1;
      setPagination({ ...pagination, page: newPage });

      // If filters/search are active, reload data immediately
      if (hasActiveSearchOrFilter) {
        setLoading(true);
        try {
          const listParam: 'mine' | 'others' | 'both' | 'saved' =
            activeFilter === 'my' ? 'mine' :
              activeFilter === 'public' ? 'others' :
                activeFilter === 'saved' ? 'saved' :
                  activeFilter === 'all' ? 'both' :
                    'both';

          if (searchQuery.trim()) {
            const searchResponse = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn, { ...pagination, page: newPage });
            let filtered = searchResponse.data;
            if (Object.keys(activeFilters).length > 0) {
              filtered = applyClientSideFilters(searchResponse.data, activeFilters);
            }
            setFilteredProperties(filtered);
            setPaginationMeta(searchResponse.meta);
          } else if (Object.keys(activeFilters).length > 0) {
            const filterResponse = await propertyApi.filterProperties(ownerId, listParam, activeFilters, { ...pagination, page: newPage });
            setFilteredProperties(filterResponse.data);
            setPaginationMeta(filterResponse.meta);
          }
        } catch (error) {
          showToast('Failed to load page', 'error');
        } finally {
          setLoading(false);
        }
      }

      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousPage = async () => {
    if (hasPreviousPage && shouldShowPagination) {
      const newPage = currentPage - 1;
      setPagination({ ...pagination, page: newPage });

      // If filters/search are active, reload data immediately
      if (hasActiveSearchOrFilter) {
        setLoading(true);
        try {
          const listParam: 'mine' | 'others' | 'both' | 'saved' =
            activeFilter === 'my' ? 'mine' :
              activeFilter === 'public' ? 'others' :
                activeFilter === 'saved' ? 'saved' :
                  activeFilter === 'all' ? 'both' :
                    'both';

          if (searchQuery.trim()) {
            const searchResponse = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn, { ...pagination, page: newPage });
            let filtered = searchResponse.data;
            if (Object.keys(activeFilters).length > 0) {
              filtered = applyClientSideFilters(searchResponse.data, activeFilters);
            }
            setFilteredProperties(filtered);
            setPaginationMeta(searchResponse.meta);
          } else if (Object.keys(activeFilters).length > 0) {
            const filterResponse = await propertyApi.filterProperties(ownerId, listParam, activeFilters, { ...pagination, page: newPage });
            setFilteredProperties(filterResponse.data);
            setPaginationMeta(filterResponse.meta);
          }
        } catch (error) {
          showToast('Failed to load page', 'error');
        } finally {
          setLoading(false);
        }
      }

      // Scroll to top when changing pages
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getFilterLabel = () => {
    if (activeFilter === 'all') return 'All Properties';
    if (activeFilter === 'my') return 'My Properties';
    if (activeFilter === 'saved') return 'Saved Properties';
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
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-20">
      {/* Header - hidden in map view on mobile, always visible on desktop */}
      <header className={`bg-white border-b border-gray-200 sticky top-0 shadow-sm z-40 ${viewMode === 'map' ? 'hidden lg:block' : ''}`}>
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 lg:max-w-full">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Dealer Network</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Property</span>
              </button>

              <button
                onClick={() => navigate('/profile')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Profile"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              {/* Desktop filter menu - hidden on mobile, visible on desktop header */}
              <div className="relative hidden md:block" ref={filterMenuRef}>
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
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors ${activeFilter === 'all'
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
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors ${activeFilter === 'my'
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
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors ${activeFilter === 'public'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Public Properties</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleFilterChange('saved')}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-colors ${activeFilter === 'saved'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Saved Properties</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop 3-Column Layout */}
      <div className="hidden lg:flex fixed top-16 left-0 right-0 bottom-0 bg-white z-0">
        {/* Left Column: List (Resizable/scrollable) */}
        <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white h-full z-10">
          <div className="p-4 border-b border-gray-200 bg-white z-10 relative">
            <SearchFilter
              key={searchFilterKey}
              onSearch={handleSearch}
              onFilter={handleFilter}
              totalCount={paginationMeta?.total}
              listName={getFilterLabel()}
            />


          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 scrollbar-thin">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <PropertyCardSkeleton key={index} noTopBorder={index === 0} />
                ))}
              </div>
            ) : (
              <>
                {currentProperties.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 mb-4">No properties found</p>
                    {hasActiveSearchOrFilter && (
                      <button onClick={handleClearSearchAndFilters} className="text-blue-600 hover:underline text-sm font-medium">Clear filters</button>
                    )}
                  </div>
                ) : (
                  currentProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isOwned={property.owner_id === ownerId}
                      onViewDetails={(p) => {
                        handleViewProperty(p);
                      }}
                      isSelected={selectedProperty?.id === property.id}
                    />
                  ))
                )}
                {shouldDisplayPagination && (
                  <div className="pt-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={!hasPreviousPage}
                        className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={!hasNextPage}
                        className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Center Column: Map */}
        <div className="flex-1 relative bg-gray-100 h-full">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }>
            <PropertyMap
              properties={mapProperties}
              center={getMapCenter()}
              onMarkerClick={(p) => {
                setSelectedProperty(p);
                setShowDetailsModal(true);
              }}
              focusOn={mapFocus}
            />
          </Suspense>

          {/* Add Property Button (Floating over map) */}
          {/* Add Property Button (Floating over map - Top Right to avoid map controls) */}

        </div>

        {/* Right Column: Details (Conditional) */}
        {selectedProperty && showDetailsModal && (
          <div className="w-[450px] flex-shrink-0 border-l border-gray-200 bg-white h-full overflow-hidden shadow-xl z-20">
            <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
              <PropertyDetailsContent
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
                onFav={handleFavProperty}
                className="h-full overflow-hidden" // Use h-full to fill the column
              />
            </Suspense>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:hidden">
        {/* Only show search/filter in list view on mobile */}
        {viewMode === 'list' && (
          <SearchFilter
            key={searchFilterKey}
            onSearch={handleSearch}
            onFilter={handleFilter}
            totalCount={paginationMeta?.total}
            listName={getFilterLabel()}
          />
        )}

        <div className="mt-4 sm:mt-6 flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 w-full min-w-0">
            {loading ? (
              viewMode === 'list' ? (
                <div className="space-y-3 sm:space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <PropertyCardSkeleton key={index} noTopBorder={index === 0} />
                  ))}
                </div>
              ) : (
                <div className="fixed inset-0 bottom-16 lg:relative lg:bottom-0 bg-white lg:rounded-lg lg:border lg:border-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading map...</p>
                  </div>
                </div>
              )
            ) : viewMode === 'map' ? (
              <div className="fixed inset-0 bottom-16 lg:relative lg:inset-auto lg:bottom-0 bg-white lg:rounded-lg lg:border lg:border-gray-200 overflow-hidden flex flex-col">
                {/* Dismissable Map Note */}
                {showMapNote && (
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-sm text-blue-800">
                      <p className="font-medium">Map View Information</p>
                      <p className="text-blue-700 mt-0.5">Only properties with location data are displayed on the map.</p>
                    </div>
                    <button
                      onClick={() => setShowMapNote(false)}
                      className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {currentProperties.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
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
                  <div className="flex-1 relative">
                    <Suspense fallback={
                      <div className="absolute inset-0 flex items-center justify-center">
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
                        focusOn={mapFocus}
                      />
                    </Suspense>
                  </div>
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
                  <>
                    {currentProperties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        isOwned={property.owner_id === ownerId}
                        onViewDetails={handleViewProperty}
                      />
                    ))}

                    {/* Pagination Controls - Only show for base lists, not filtered/search results */}
                    {shouldDisplayPagination && (
                      <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={handlePreviousPage}
                            disabled={!hasPreviousPage}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${hasPreviousPage
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Previous</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              Page <span className="font-semibold">{currentPage}</span>
                              {totalPages > 1 && (
                                <span className="text-gray-500"> of {totalPages}</span>
                              )}
                            </span>
                            {paginationMeta?.total !== undefined && (
                              <span className="text-sm text-gray-500">
                                ({paginationMeta.total} {paginationMeta.total === 1 ? 'property' : 'properties'})
                              </span>
                            )}
                          </div>

                          <button
                            onClick={handleNextPage}
                            disabled={!hasNextPage}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${hasNextPage
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {selectedProperty && showDetailsModal && (
            <div className="hidden lg:block w-[400px] xl:w-[450px] shrink-0 sticky top-24 h-[calc(100vh-8rem)]">
              <Suspense fallback={
                <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-gray-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full overflow-hidden">
                  <PropertyDetailsContent
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
                    onFav={handleFavProperty}
                  />
                </div>
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Map/List View Toggle Button - Mobile Only */}
      <div className="lg:hidden fixed bottom-[88px] left-1/2 transform -translate-x-1/2 z-30">
        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all shadow-lg text-sm ${viewMode === 'map'
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-white border-2 border-blue-600 hover:bg-blue-50 text-blue-600'
            }`}
          title={viewMode === 'list' ? 'Switch to Map View' : 'Switch to List View'}
        >
          {viewMode === 'list' ? (
            <>
              <Map className="w-5 h-5" />
              <span>Map View</span>
            </>
          ) : (
            <>
              <List className="w-5 h-5" />
              <span>List View</span>
            </>
          )}
        </button>
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
        <div className="lg:hidden">
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
              onFav={handleFavProperty}
            />
          </Suspense>
        </div>
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
            }}
            onSubmit={handleContactSubmit}
          />
        </Suspense>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 md:hidden">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => handleFilterChange('all')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${activeFilter === 'all'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Globe className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">All</span>
          </button>
          <button
            onClick={() => handleFilterChange('my')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${activeFilter === 'my'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">My</span>
          </button>
          <button
            onClick={() => handleFilterChange('public')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${activeFilter === 'public'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Public</span>
          </button>
          <button
            onClick={() => handleFilterChange('saved')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${activeFilter === 'saved'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Heart className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Saved</span>
          </button>
        </div>
      </div>



    </div>
  );
}

export default App;

