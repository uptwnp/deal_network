import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, User as UserIcon, MapPin, Home, DollarSign, Ruler, LogOut, Users, Settings, CheckCircle2, Sparkles, Heart, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserSettings, getUserSettings, saveUserSettings, DEFAULT_USER_SETTINGS } from '../types/userSettings';
import { CITY_OPTIONS, AREA_OPTIONS, PROPERTY_TYPES, SIZE_UNITS } from '../utils/filterOptions';
import { authApi } from '../services/authApi';
import { setCurrentUser } from '../types/user';

interface ProfilePageProps {
  onBack: () => void;
  onLogout: () => void;
  onSwitchUser: () => void;
}

export function ProfilePage({ onBack, onLogout, onSwitchUser }: ProfilePageProps) {
  const { ownerId, user, setUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const areaDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user profile from API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authApi.getProfile();
        if (response.status && response.user) {
          // Update user in context
          const apiUser = {
            id: response.user.id,
            name: response.user.name,
            phone: response.user.phone,
            token: response.user.token,
            firmName: response.user.firm_name,
            firm_name: response.user.firm_name,
            area_covers: response.user.area_covers,
            city_covers: response.user.city_covers,
            type: response.user.type,
            default_area: response.user.default_area,
            default_city: response.user.default_city,
            default_type: response.user.default_type,
            created_on: response.user.created_on,
          };
          setUser(apiUser);
          setCurrentUser(apiUser);

          // Load local settings first
          const localSettings = getUserSettings();
          
          // Map API fields to settings
          const apiSettings: UserSettings = {
            ...localSettings, // Keep local-only settings (price range, size unit)
            city: response.user.default_city || localSettings.city || DEFAULT_USER_SETTINGS.city,
            preferredAreas: response.user.default_area 
              ? response.user.default_area.split(',').map(a => a.trim()).filter(a => a)
              : localSettings.preferredAreas,
            preferredPropertyTypes: response.user.default_type
              ? response.user.default_type.split(',').map(t => t.trim()).filter(t => t)
              : localSettings.preferredPropertyTypes,
          };
          
          setSettings(apiSettings);
        } else {
          setError('Failed to load profile');
          // Fallback to local settings
          const loadedSettings = getUserSettings();
          setSettings(loadedSettings);
        }
      } catch (err: any) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile. Using local settings.');
        // Fallback to local settings
        const loadedSettings = getUserSettings();
        setSettings(loadedSettings);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(event.target as Node)) {
        setShowAreaDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCityChange = (city: string) => {
    setSettings({ ...settings, city });
  };

  const toggleArea = (area: string) => {
    const currentAreas = settings.preferredAreas || [];
    if (currentAreas.includes(area)) {
      setSettings({
        ...settings,
        preferredAreas: currentAreas.filter(a => a !== area)
      });
    } else {
      setSettings({
        ...settings,
        preferredAreas: [...currentAreas, area]
      });
    }
  };

  const togglePropertyType = (type: string) => {
    const currentTypes = settings.preferredPropertyTypes || [];
    if (currentTypes.includes(type)) {
      setSettings({
        ...settings,
        preferredPropertyTypes: currentTypes.filter(t => t !== type)
      });
    } else {
      setSettings({
        ...settings,
        preferredPropertyTypes: [...currentTypes, type]
      });
    }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);
    
    try {
      // Save to API
      const updateData: {
        default_city?: string;
        default_area?: string;
        default_type?: string;
      } = {};

      if (settings.city) {
        updateData.default_city = settings.city;
      }
      if (settings.preferredAreas.length > 0) {
        updateData.default_area = settings.preferredAreas.join(', ');
      }
      if (settings.preferredPropertyTypes.length > 0) {
        updateData.default_type = settings.preferredPropertyTypes.join(', ');
      }

      const response = await authApi.updateProfile(updateData);
      
      if (response.status && response.user) {
        // Update user in context
        const apiUser = {
          id: response.user.id,
          name: response.user.name,
          phone: response.user.phone,
          token: response.user.token,
          firmName: response.user.firm_name,
          firm_name: response.user.firm_name,
          area_covers: response.user.area_covers,
          city_covers: response.user.city_covers,
          type: response.user.type,
          default_area: response.user.default_area,
          default_city: response.user.default_city,
          default_type: response.user.default_type,
          created_on: response.user.created_on,
        };
        setUser(apiUser);
        setCurrentUser(apiUser);
      }

      // Also save to local storage (for settings not in API like price range and size unit)
      saveUserSettings(settings);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Failed to save settings. Please try again.');
      // Still save to local storage as fallback
      saveUserSettings(settings);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">Welcome back! 👋</h2>
              <p className="text-blue-100">
                {user?.name || `User ${ownerId}`} • Let's personalize your experience
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 text-center">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Preferences Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <h3 className="text-lg font-semibold text-gray-900">Your Preferences</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">Customize your property search experience</p>
            </div>

            <div className="p-6 space-y-6">
              {/* City Setting */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-blue-200 transition-colors">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>Default City</span>
                </label>
                <select
                  value={settings.city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-700 font-medium"
                >
                  {CITY_OPTIONS.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p>This city will be automatically selected when you add new properties</p>
                </div>
              </div>

              {/* Preferred Areas */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-blue-200 transition-colors">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <span>Favorite Areas</span>
                </label>
                <div className="relative" ref={areaDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowAreaDropdown(!showAreaDropdown)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-left flex items-center justify-between hover:border-blue-400 transition-all font-medium"
                  >
                    <span className="text-gray-700">
                      {settings.preferredAreas.length > 0
                        ? `✨ ${settings.preferredAreas.length} area${settings.preferredAreas.length > 1 ? 's' : ''} selected`
                        : 'Click to select your favorite areas'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showAreaDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showAreaDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      {AREA_OPTIONS.map(area => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleArea(area)}
                          className={`w-full px-4 py-3 text-left text-sm transition-all ${
                            settings.preferredAreas.includes(area)
                              ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={settings.preferredAreas.includes(area)}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span>{area}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {settings.preferredAreas.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settings.preferredAreas.map(area => (
                      <span
                        key={area}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {area}
                        <button
                          type="button"
                          onClick={() => toggleArea(area)}
                          className="hover:scale-110 transition-transform font-bold"
                          aria-label={`Remove ${area}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                  <Info className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p>We'll prioritize properties in these areas when you search</p>
                </div>
              </div>

              {/* Preferred Property Types */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-blue-200 transition-colors">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Home className="w-4 h-4 text-green-600" />
                  </div>
                  <span>Property Types You Love</span>
                </label>
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-left flex items-center justify-between hover:border-blue-400 transition-all font-medium"
                  >
                    <span className="text-gray-700">
                      {settings.preferredPropertyTypes.length > 0
                        ? `🏠 ${settings.preferredPropertyTypes.length} type${settings.preferredPropertyTypes.length > 1 ? 's' : ''} selected`
                        : 'Click to choose your favorite property types'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showTypeDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showTypeDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      {PROPERTY_TYPES.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => togglePropertyType(type)}
                          className={`w-full px-4 py-3 text-left text-sm transition-all ${
                            settings.preferredPropertyTypes.includes(type)
                              ? 'bg-green-50 text-green-700 font-semibold border-l-4 border-green-500'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={settings.preferredPropertyTypes.includes(type)}
                              onChange={() => {}}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span>{type}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {settings.preferredPropertyTypes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {settings.preferredPropertyTypes.map(type => (
                      <span
                        key={type}
                        className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {type}
                        <button
                          type="button"
                          onClick={() => togglePropertyType(type)}
                          className="hover:scale-110 transition-transform font-bold"
                          aria-label={`Remove ${type}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                  <Info className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>These will be automatically applied as default filters in your searches</p>
                </div>
              </div>

              {/* Default Price Range */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-blue-200 transition-colors">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="w-4 h-4 text-yellow-600" />
                  </div>
                  <span>Budget Range</span>
                  <span className="text-xs font-normal text-gray-500">(in Lakhs)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum</label>
                    <input
                      type="number"
                      value={settings.defaultPriceMin || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        defaultPriceMin: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      placeholder="Min"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum</label>
                    <input
                      type="number"
                      value={settings.defaultPriceMax || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        defaultPriceMax: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      placeholder="Max"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all bg-white font-medium"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                  <Info className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p>This range will be pre-filled when you search for properties</p>
                </div>
              </div>

              {/* Default Size Unit */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-blue-200 transition-colors">
                <label className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Ruler className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span>Preferred Size Unit</span>
                </label>
                <select
                  value={settings.defaultSizeUnit}
                  onChange={(e) => setSettings({ ...settings, defaultSizeUnit: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-gray-700 font-medium"
                >
                  {SIZE_UNITS.map(unit => (
                    <option key={unit} value={unit}>
                      {unit === 'Gaj' ? 'Gaj' : unit === 'Sqft' ? 'Sq. Ft' : unit}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                  <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p>This unit will be automatically selected when adding new properties</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={handleSave}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <Save className="w-5 h-5" />
                  Save All Preferences
                </button>
                {saved && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-medium animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5" />
                    <p>All settings saved successfully! 🎉</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Actions Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Account</h3>
              <p className="text-sm text-gray-600 mt-1">Manage your account settings</p>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onSwitchUser}
                  className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 text-gray-700 hover:text-blue-700 group"
                >
                  <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Switch User ID
                </button>
                <button
                  onClick={onLogout}
                  className="flex-1 px-4 py-3 bg-white border-2 border-red-200 rounded-xl font-medium hover:border-red-400 hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 group"
                >
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

