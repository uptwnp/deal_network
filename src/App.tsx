import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Home, Globe, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { PropertyCard } from './components/PropertyCard';
import { PropertyModal } from './components/PropertyModal';
import { PropertyDetailsModal } from './components/PropertyDetailsModal';
import { ContactModal } from './components/ContactModal';
import { SearchFilter } from './components/SearchFilter';
import { ProfilePage } from './components/ProfilePage';
import { HomePage } from './components/HomePage';
import { AuthPage } from './components/AuthPage';
import { Toast } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { propertyApi } from './services/api';
import { Property, PropertyFormData, FilterOptions } from './types/property';
import { logoutUser, getCurrentUser } from './types/user';
import { STORAGE_KEYS } from './utils/filterOptions';

type FilterType = 'all' | 'my' | 'public';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

function App() {
  const { ownerId, setOwnerId, isAuthenticated, setUser } = useAuth();
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
  const [currentPage, setCurrentPage] = useState<'home' | 'profile'>('home');
  
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
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const loadMyProperties = useCallback(async () => {
    try {
      const data = await propertyApi.getUserProperties(ownerId);
      setMyProperties(data);
    } catch (error) {
      showToast('Failed to load properties', 'error');
    }
  }, [ownerId]);

  const loadPublicProperties = useCallback(async () => {
    try {
      const data = await propertyApi.getPublicProperties(ownerId);
      setPublicProperties(data);
    } catch (error) {
      showToast('Failed to load public properties', 'error');
    }
  }, [ownerId]);

  const loadAllProperties = useCallback(async () => {
    try {
      const data = await propertyApi.getAllProperties(ownerId);
      setAllProperties(data);
    } catch (error) {
      showToast('Failed to load all properties', 'error');
    }
  }, [ownerId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMyProperties(), loadPublicProperties(), loadAllProperties()]).then(() => {
      setLoading(false);
    });
  }, [loadMyProperties, loadPublicProperties, loadAllProperties]);

  useEffect(() => {
    let propertiesToDisplay: Property[] = [];

    if (activeFilter === 'all') {
      propertiesToDisplay = allProperties;
    } else if (activeFilter === 'my') {
      propertiesToDisplay = myProperties;
    } else if (activeFilter === 'public') {
      propertiesToDisplay = publicProperties;
    }

    setFilteredProperties(propertiesToDisplay);
  }, [activeFilter, allProperties, myProperties, publicProperties]);

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

  const handleAddProperty = async (data: PropertyFormData) => {
    try {
      await propertyApi.addProperty(ownerId, data);
      showToast('Property added successfully', 'success');
      setShowModal(false);
      loadMyProperties();
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
      loadMyProperties();
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
      loadMyProperties();
    } catch (error) {
      showToast('Failed to delete property', 'error');
    }
  };

  const handleTogglePublic = async (id: number, isPublic: boolean) => {
    try {
      await propertyApi.updateProperty(id, ownerId, { is_public: isPublic ? 1 : 0 });
      showToast(`Property made ${isPublic ? 'public' : 'private'}`, 'success');
      loadMyProperties();
      if (selectedProperty?.id === id) {
        setSelectedProperty({ ...selectedProperty, is_public: isPublic ? 1 : 0 });
      }
    } catch (error) {
      showToast('Failed to update property', 'error');
    }
  };

  const handleUpdateHighlightsAndTags = async (id: number, highlights: string, tags: string) => {
    try {
      await propertyApi.updateProperty(id, ownerId, { highlights, tags });
      showToast('Highlights and tags updated successfully', 'success');
      loadMyProperties();
      loadAllProperties();
      loadPublicProperties();
      if (selectedProperty?.id === id) {
        setSelectedProperty({ ...selectedProperty, highlights, tags });
      }
    } catch (error) {
      showToast('Failed to update highlights and tags', 'error');
    }
  };

  const handleShare = async (property: Property) => {
    const sizeText = property.min_size === property.size_max
      ? `${property.min_size} ${property.size_unit}`
      : `${property.min_size}-${property.size_max} ${property.size_unit}`;
    const priceText = property.price_min === property.price_max
      ? `₹${property.price_min} Lakhs`
      : `₹${property.price_min}-${property.price_max} Lakhs`;
    const text = `${property.type} in ${property.area}, ${property.city}\n${property.description}\nSize: ${sizeText}\nPrice: ${priceText}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.type} - ${property.area}`,
          text,
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
      if (!query.trim()) {
        if (activeFilter === 'all') {
          setFilteredProperties(allProperties);
        } else if (activeFilter === 'my') {
          setFilteredProperties(myProperties);
        } else if (activeFilter === 'public') {
          setFilteredProperties(publicProperties);
        }
        return;
      }

      try {
        const results = await propertyApi.searchProperties(query, column);
        let filtered = results;

        if (activeFilter === 'my') {
          filtered = results.filter((p) => p.owner_id === ownerId);
        } else if (activeFilter === 'public') {
          filtered = results.filter((p) => p.owner_id !== ownerId && p.is_public === 1);
        }

        setFilteredProperties(filtered);
      } catch (error) {
        showToast('Search failed', 'error');
      }
    },
    [activeFilter, allProperties, myProperties, publicProperties, ownerId]
  );

  const handleFilter = useCallback(
    async (filters: FilterOptions) => {
      setActiveFilters(filters);
      if (Object.keys(filters).length === 0) {
        if (activeFilter === 'all') {
          setFilteredProperties(allProperties);
        } else if (activeFilter === 'my') {
          setFilteredProperties(myProperties);
        } else if (activeFilter === 'public') {
          setFilteredProperties(publicProperties);
        }
        return;
      }

      try {
        const results = await propertyApi.filterProperties(filters);
        let filtered = results;

        if (activeFilter === 'my') {
          filtered = results.filter((p) => p.owner_id === ownerId);
        } else if (activeFilter === 'public') {
          filtered = results.filter((p) => p.owner_id !== ownerId && p.is_public === 1);
        }

        setFilteredProperties(filtered);
      } catch (error) {
        showToast('Filter failed', 'error');
      }
    },
    [activeFilter, allProperties, myProperties, publicProperties, ownerId]
  );

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.ACTIVE_FILTER, filter);
    // Clear current search and filters when filter type changes
    // (SearchFilter will restore from localStorage on next render)
    setSearchQuery('');
    setActiveFilters({});
    setShowFilterMenu(false);
  };

  const handleUserIdChange = () => {
    const newId = prompt('Enter Owner ID:', ownerId.toString());
    if (newId && !isNaN(parseInt(newId))) {
      setOwnerId(parseInt(newId));
      showToast(`Switched to user ${newId}`, 'success');
    }
  };

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  const handleAskQuestion = (property: Property) => {
    setSelectedProperty(property);
    setShowContactModal(true);
  };

  const handleContactSubmit = (message: string, phone: string) => {
    showToast('Question sent via WhatsApp!', 'success');
  };

  const currentProperties = filteredProperties;

  const getFilterLabel = () => {
    if (activeFilter === 'all') return 'All Properties';
    if (activeFilter === 'my') return 'My Properties';
    return 'Public Properties';
  };

  const handleLogin = (userId: number) => {
    // Refresh user from localStorage (set by loginUser function)
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setOwnerId(userId);
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
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setShowLandingPage(true);
    try {
      localStorage.removeItem('has_visited_app');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Always show landing page if flag is set (regardless of authentication)
  if (showLandingPage) {
    return (
      <HomePage 
        onGetStarted={handleGetStarted}
        isAuthenticated={isAuthenticated}
        onGoToLogin={() => {
          // Clear auth and show login page
          logoutUser();
          setUser(null);
          setShowLandingPage(false);
        }}
        onGoToApp={handleGetStarted}
      />
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthPage 
        onLogin={handleLogin}
        onGoToHome={() => {
          // Show landing page
          try {
            localStorage.removeItem('has_visited_app');
          } catch {}
          setShowLandingPage(true);
        }}
      />
    );
  }

  if (currentPage === 'profile') {
    return <ProfilePage onBack={() => setCurrentPage('home')} />;
  }

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
                onClick={() => setCurrentPage('profile')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Profile & Settings"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
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
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
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

      <footer className="bg-white border-t border-gray-200 py-3 sm:py-4 px-3 sm:px-4 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            <span className="text-xs sm:text-sm text-gray-700">
              Logged in as <span className="font-semibold text-blue-600">User {ownerId}</span>
            </span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs sm:text-sm font-medium"
              title="User menu"
            >
              Switch User
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    handleUserIdChange();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                >
                  Switch User ID
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowUserMenu(false);
                    showToast('Logged out', 'success');
                  }}
                  className="w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
