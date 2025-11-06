import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Home, Globe, ChevronDown, User } from 'lucide-react';
import { PropertyCard } from './components/PropertyCard';
import { PropertyCardSkeleton } from './components/PropertyCardSkeleton';
import { PropertyModal } from './components/PropertyModal';
import { PropertyDetailsModal } from './components/PropertyDetailsModal';
import { ContactModal } from './components/ContactModal';
import { SearchFilter } from './components/SearchFilter';
import { ProfilePage } from './components/ProfilePage';
import { HomePage } from './components/HomePage';
import { AuthPage } from './components/AuthPage';
import { PublicPropertyPage } from './components/PublicPropertyPage';
import { Toast } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { propertyApi } from './services/api';
import { Property, PropertyFormData, FilterOptions } from './types/property';
import { logoutUser, getCurrentUser } from './types/user';
import { authApi } from './services/authApi';
import { STORAGE_KEYS } from './utils/filterOptions';
import { formatPriceWithLabel } from './utils/priceFormatter';

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

  const [activeFilter, setActiveFilter] = useState<FilterType>(loadPersistedFilter());
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [publicProperties, setPublicProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const loadedDataRef = useRef<{ ownerId: number; my: boolean; public: boolean } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
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
  }, [ownerId, location.pathname, isAuthenticated, activeFilter, loadMyProperties, loadPublicProperties]);

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

      setFilteredProperties(propertiesToDisplay);
    }
  }, [activeFilter, myProperties, publicProperties, searchQuery, activeFilters]);

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
    
    const results = await Promise.all(loadPromises);
    
    // Update state based on what was loaded
    if (activeFilter === 'my') {
      setMyProperties(results[0]);
      if (loadedDataRef.current) loadedDataRef.current.my = true;
    } else if (activeFilter === 'public') {
      setPublicProperties(results[0]);
      if (loadedDataRef.current) loadedDataRef.current.public = true;
    } else if (activeFilter === 'all') {
      setMyProperties(results[0]);
      setPublicProperties(results[1]);
      if (loadedDataRef.current) {
        loadedDataRef.current.my = true;
        loadedDataRef.current.public = true;
      }
    }
    
    // Update selectedProperty if modal is open and updateSelectedProperty is true
    if (updateSelectedProperty && selectedProperty) {
      const allProps = activeFilter === 'all' ? [...results[0], ...results[1]] : results[0];
      const updatedProperty = allProps.find(p => p.id === selectedProperty.id);
      if (updatedProperty) {
        setSelectedProperty(updatedProperty);
      }
    }
    
    // Re-apply active search/filters after refresh
    if (searchQuery.trim()) {
      const listParam: 'mine' | 'public' | 'both' = 
        activeFilter === 'my' ? 'mine' : 
        activeFilter === 'public' ? 'public' : 
        'both';
      try {
        const results = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn);
        let filtered = results;
        if (Object.keys(activeFilters).length > 0) {
          filtered = applyClientSideFilters(results, activeFilters);
        }
        setFilteredProperties(filtered);
      } catch (error) {
        // If search fails, use fresh data from state
        if (activeFilter === 'all') {
          setFilteredProperties([...results[0], ...results[1]]);
        } else if (activeFilter === 'my') {
          setFilteredProperties(results[0]);
        } else if (activeFilter === 'public') {
          setFilteredProperties(results[0]);
        }
      }
    } else if (Object.keys(activeFilters).length > 0) {
      const listParam: 'mine' | 'public' | 'both' = 
        activeFilter === 'my' ? 'mine' : 
        activeFilter === 'public' ? 'public' : 
        'both';
      try {
        const results = await propertyApi.filterProperties(ownerId, listParam, activeFilters);
        setFilteredProperties(results);
      } catch (error) {
        // If filter fails, use fresh data from state
        if (activeFilter === 'all') {
          setFilteredProperties([...results[0], ...results[1]]);
        } else if (activeFilter === 'my') {
          setFilteredProperties(results[0]);
        } else if (activeFilter === 'public') {
          setFilteredProperties(results[0]);
        }
      }
    } else {
      // No search/filters, use fresh data directly
      if (activeFilter === 'all') {
        setFilteredProperties([...results[0], ...results[1]]);
      } else if (activeFilter === 'my') {
        setFilteredProperties(results[0]);
      } else if (activeFilter === 'public') {
        setFilteredProperties(results[0]);
      }
    }
  }, [ownerId, searchQuery, searchColumn, activeFilter, activeFilters, applyClientSideFilters, selectedProperty]);

  const handleAddProperty = async (data: PropertyFormData) => {
    try {
      await propertyApi.addProperty(ownerId, data);
      showToast('Property added successfully', 'success');
      setShowModal(false);
      await refreshPropertiesAndFilters();
    } catch (error) {
      showToast('Failed to add property', 'error');
    }
  };

  const handleEditProperty = async (data: PropertyFormData) => {
    if (!editingProperty) return;
    try {
      await propertyApi.updateProperty(editingProperty.id, ownerId, data);
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

  const handleShare = async (property: Property) => {
    const sizeText = property.min_size === property.size_max
      ? `${property.min_size} ${property.size_unit}`
      : `${property.min_size}-${property.size_max} ${property.size_unit}`;
    const priceText = formatPriceWithLabel(property.price_min, property.price_max);
    const shareUrl = property.is_public === 1 
      ? `${window.location.origin}/property/${property.id}`
      : undefined;
    const text = `${property.type} in ${property.area}, ${property.city}\n${property.description}\nSize: ${sizeText}\nPrice: ${priceText}${shareUrl ? `\n\nView: ${shareUrl}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.type} - ${property.area}`,
          text,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          showToast('Failed to share', 'error');
        }
      }
    } else {
      navigator.clipboard.writeText(text);
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

      try {
        // If there's a search query, use search API
        if (query.trim()) {
          const results = await propertyApi.searchProperties(ownerId, listParam, query, currentColumn);
          // Apply additional filters if any
          let filtered = results;
          if (Object.keys(activeFilters).length > 0) {
            filtered = applyClientSideFilters(results, activeFilters);
          }
          setFilteredProperties(filtered);
        } else if (Object.keys(activeFilters).length > 0) {
          // If only filters (no search), use filter API
          const results = await propertyApi.filterProperties(ownerId, listParam, activeFilters);
          setFilteredProperties(results);
        }
      } catch (error) {
        showToast('Search failed', 'error');
      }
    },
    [activeFilter, myProperties, publicProperties, ownerId, activeFilters, applyClientSideFilters, searchColumn]
  );

  const handleFilter = useCallback(
    async (filters: FilterOptions) => {
      setActiveFilters(filters);
      
      // Map activeFilter to API list parameter
      const listParam: 'mine' | 'public' | 'both' = 
        activeFilter === 'my' ? 'mine' : 
        activeFilter === 'public' ? 'public' : 
        'both';

      // If no filters and no search query, show default list
      if (Object.keys(filters).length === 0 && !searchQuery.trim()) {
        if (activeFilter === 'all') {
          setFilteredProperties([...myProperties, ...publicProperties]);
        } else if (activeFilter === 'my') {
          setFilteredProperties(myProperties);
        } else if (activeFilter === 'public') {
          setFilteredProperties(publicProperties);
        }
        return;
      }

      try {
        // If there's a search query, use search API and apply filters client-side
        if (searchQuery.trim()) {
          const results = await propertyApi.searchProperties(ownerId, listParam, searchQuery, searchColumn);
          const filtered = applyClientSideFilters(results, filters);
          setFilteredProperties(filtered);
        } else {
          // If only filters (no search), use filter API
          const results = await propertyApi.filterProperties(ownerId, listParam, filters);
          setFilteredProperties(results);
        }
      } catch (error) {
        showToast('Filter failed', 'error');
      }
    },
    [activeFilter, myProperties, publicProperties, ownerId, searchQuery, searchColumn, applyClientSideFilters]
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

  const handleUserIdChange = () => {
    const newId = prompt('Enter Owner ID:', ownerId.toString());
    if (newId && !isNaN(parseInt(newId))) {
      setOwnerId(parseInt(newId));
      showToast(`Switched to user ${newId}`, 'success');
    }
  };

  const handleAskQuestion = (property: Property) => {
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

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Property Page - Always accessible */}
      <Route path="/property/:id" element={<PublicPropertyPage />} />
      
      {/* Landing Page */}
      <Route path="/" element={
        showLandingPage || !isAuthenticated ? (
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
            showToast={showToast}
          />
        ) : (
          <AuthPage 
            onLogin={handleLogin}
            onGoToHome={() => navigate('/')}
          />
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
            showToast={showToast}
          />
        ) : (
          <AuthPage 
            onLogin={handleLogin}
            onGoToHome={() => navigate('/')}
          />
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
            showToast={showToast}
          />
        ) : (
          <AuthPage 
            onLogin={handleLogin}
            onGoToHome={() => navigate('/')}
          />
        )
      } />
      <Route path="/profile" element={
        isAuthenticated ? (
          <ProfilePage 
            onBack={() => navigate('/home')}
            onLogout={() => {
              handleLogout();
              showToast('Logged out', 'success');
              navigate('/login');
            }}
          />
        ) : (
          <AuthPage 
            onLogin={handleLogin}
            onGoToHome={() => navigate('/')}
          />
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
  showToast: (message: string, type: 'success' | 'error') => void;
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
  showToast,
}: MainAppContentProps) {
  const currentProperties = filteredProperties.length > 0 ? filteredProperties : 
    (activeFilter === 'all' ? [...myProperties, ...publicProperties] : activeFilter === 'my' ? myProperties : publicProperties);

  const getFilterLabel = () => {
    if (activeFilter === 'all') return 'All Properties';
    if (activeFilter === 'my') return 'My Properties';
    return 'Public Properties';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">PropNetwork</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Profile"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
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
          onSearch={handleSearch}
          onFilter={handleFilter}
        />

        <div className="mt-4 sm:mt-6">
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(3)].map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : currentProperties.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
              <p className="text-sm sm:text-base text-gray-500">
                {activeFilter === 'my' ? 'No properties yet. Add your first property!' : 'No properties available'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {currentProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isOwned={property.owner_id === ownerId}
                  onViewDetails={handleViewProperty}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PropertyModal
          property={editingProperty}
          onClose={() => {
            setShowModal(false);
            setEditingProperty(null);
          }}
          onSubmit={editingProperty ? handleEditProperty : handleAddProperty}
        />
      )}

      {showDetailsModal && selectedProperty && (
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
        />
      )}

      {showContactModal && selectedProperty && (
        <ContactModal
          property={selectedProperty}
          ownerPhone="9518091945"
          senderId={ownerId}
          onClose={() => {
            setShowContactModal(false);
            setSelectedProperty(null);
          }}
          onSubmit={handleContactSubmit}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <button
        onClick={() => {
          setEditingProperty(null);
          setShowModal(true);
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center z-40 hover:scale-110 duration-200"
        title="Add Property"
      >
        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

    </div>
  );
}

export default App;
