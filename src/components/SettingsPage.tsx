import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, User as UserIcon, LogOut, Users, Settings, CheckCircle2, Heart, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CITY_OPTIONS, AREA_OPTIONS, PROPERTY_TYPES } from '../utils/filterOptions';
import { authApi } from '../services/authApi';
import { setCurrentUser } from '../types/user';
import { PasswordChangeModal } from './PasswordChangeModal';

interface SettingsPageProps {
  onBack: () => void;
  onLogout: () => void;
  onSwitchUser: () => void;
}

interface ProfileData {
  id: number;
  name: string;
  phone: string;
  firm_name: string;
  area_covers: string;
  city_covers: string;
  type: string;
  default_area: string;
  default_city: string;
  default_type: string;
  created_on: string;
}

export function SettingsPage({ onBack, onLogout, onSwitchUser }: SettingsPageProps) {
  const { user, setUser } = useAuth();
  
  // Initialize profile data from user context if available
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    if (user) {
      return {
        id: user.id,
        name: user.name || '',
        phone: user.phone || '',
        firm_name: user.firm_name || '',
        area_covers: user.area_covers || '',
        city_covers: user.city_covers || '',
        type: user.type || '',
        default_area: user.default_area || '',
        default_city: user.default_city || '',
        default_type: user.default_type || '',
        created_on: user.created_on || '',
      };
    }
    return {
      id: 0,
      name: '',
      phone: '',
      firm_name: '',
      area_covers: '',
      city_covers: '',
      type: '',
      default_area: '',
      default_city: '',
      default_type: '',
      created_on: '',
    };
  });
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCityCoversDropdown, setShowCityCoversDropdown] = useState(false);
  const [showAreaCoversDropdown, setShowAreaCoversDropdown] = useState(false);
  const [showDealsInDropdown, setShowDealsInDropdown] = useState(false);
  const [saved, setSaved] = useState(false);
  // Start with loading false if we have user data, true if we need to fetch
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const areaDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const cityCoversDropdownRef = useRef<HTMLDivElement>(null);
  const areaCoversDropdownRef = useRef<HTMLDivElement>(null);
  const dealsInDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user profile from API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authApi.getProfile();
        console.log('Profile response:', response);
        
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

          // Set profile data
          setProfileData({
            id: response.user.id,
            name: response.user.name || '',
            phone: response.user.phone || '',
            firm_name: response.user.firm_name || '',
            area_covers: response.user.area_covers || '',
            city_covers: response.user.city_covers || '',
            type: response.user.type || '',
            default_area: response.user.default_area || '',
            default_city: response.user.default_city || '',
            default_type: response.user.default_type || '',
            created_on: response.user.created_on || '',
          });
        } else {
          // If API fails, try to use existing user data from context
          if (user) {
            setProfileData({
              id: user.id,
              name: user.name || '',
              phone: user.phone || '',
              firm_name: user.firm_name || '',
              area_covers: user.area_covers || '',
              city_covers: user.city_covers || '',
              type: user.type || '',
              default_area: user.default_area || '',
              default_city: user.default_city || '',
              default_type: user.default_type || '',
              created_on: user.created_on || '',
            });
            setError(response.message || 'Using cached profile data');
          } else {
            setError(response.message || 'Failed to load profile');
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch profile:', err);
        // If API fails, try to use existing user data from context
        if (user) {
          setProfileData({
            id: user.id,
            name: user.name || '',
            phone: user.phone || '',
            firm_name: user.firm_name || '',
            area_covers: user.area_covers || '',
            city_covers: user.city_covers || '',
            type: user.type || '',
            default_area: user.default_area || '',
            default_city: user.default_city || '',
            default_type: user.default_type || '',
            created_on: user.created_on || '',
          });
          setError('Using cached profile data. API error: ' + (err.message || 'Unknown error'));
        } else {
          setError('Failed to load profile. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(event.target as Node)) {
        setShowAreaDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (cityCoversDropdownRef.current && !cityCoversDropdownRef.current.contains(event.target as Node)) {
        setShowCityCoversDropdown(false);
      }
      if (areaCoversDropdownRef.current && !areaCoversDropdownRef.current.contains(event.target as Node)) {
        setShowAreaCoversDropdown(false);
      }
      if (dealsInDropdownRef.current && !dealsInDropdownRef.current.contains(event.target as Node)) {
        setShowDealsInDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleArrayItem = (currentValue: string, item: string): string => {
    const items = currentValue ? currentValue.split(',').map(i => i.trim()).filter(i => i) : [];
    if (items.includes(item)) {
      return items.filter(i => i !== item).join(', ');
    } else {
      return [...items, item].join(', ');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);
    
    try {
      // Note: 'name' is not in the allowed update fields according to PHP API
      // Always send all fields with their actual values
      const updateData: {
        firm_name?: string;
        area_covers?: string;
        city_covers?: string;
        type?: string;
        default_area?: string;
        default_city?: string;
        default_type?: string;
      } = {
        firm_name: profileData.firm_name ?? '',
        area_covers: profileData.area_covers ?? '',
        city_covers: profileData.city_covers ?? '',
        type: profileData.type ?? '',
        default_area: profileData.default_area ?? '',
        default_city: profileData.default_city ?? '',
        default_type: profileData.default_type ?? '',
      };

      console.log('Sending update data:', updateData);

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

        // Update local profile data
        setProfileData({
          id: response.user.id,
          name: response.user.name || '',
          phone: response.user.phone || '',
          firm_name: response.user.firm_name || '',
          area_covers: response.user.area_covers || '',
          city_covers: response.user.city_covers || '',
          type: response.user.type || '',
          default_area: response.user.default_area || '',
          default_city: response.user.default_city || '',
          default_type: response.user.default_type || '',
          created_on: response.user.created_on || '',
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Failed to save settings. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const getArrayItems = (value: string): string[] => {
    return value ? value.split(',').map(i => i.trim()).filter(i => i) : [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-700" />
                <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
            <p className="text-gray-600">Loading profile...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {/* Read-Only Info Section - Compact Grid */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-medium mb-1">User ID</span>
                  <span className="text-gray-900 font-semibold">{profileData.id || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-medium mb-1">Name</span>
                  <span className="text-gray-900 font-semibold">{profileData.name || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-medium mb-1">Phone</span>
                  <span className="text-gray-900 font-semibold">{profileData.phone || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-medium mb-1">Created</span>
                  <span className="text-gray-900 font-semibold text-xs">{formatDate(profileData.created_on)}</span>
                </div>
              </div>
            </div>

            {/* Editable Profile Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-600" />
                  Profile Settings
                </h3>
              </div>

              <div className="p-4 space-y-4">

                {/* Firm Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Firm Name</label>
                  <input
                    type="text"
                    value={profileData.firm_name}
                    onChange={(e) => setProfileData({ ...profileData, firm_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-700 text-sm"
                    placeholder="Enter firm name"
                  />
                </div>

                {/* Area Covers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Areas You Cover</label>
                  <div className="relative" ref={areaCoversDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowAreaCoversDropdown(!showAreaCoversDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-blue-400 transition-all text-sm"
                    >
                      <span className="text-gray-700">
                        {getArrayItems(profileData.area_covers).length > 0
                          ? `✨ ${getArrayItems(profileData.area_covers).length} area${getArrayItems(profileData.area_covers).length > 1 ? 's' : ''} selected`
                          : 'Click to select areas you cover'}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showAreaCoversDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showAreaCoversDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {AREA_OPTIONS.map(area => {
                          const isSelected = getArrayItems(profileData.area_covers).includes(area);
                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() => setProfileData({ ...profileData, area_covers: toggleArrayItem(profileData.area_covers, area) })}
                              className={`w-full px-3 py-2 text-left text-sm transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span>{area}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {getArrayItems(profileData.area_covers).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getArrayItems(profileData.area_covers).map(area => (
                        <span
                          key={area}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          {area}
                          <button
                            type="button"
                            onClick={() => setProfileData({ ...profileData, area_covers: toggleArrayItem(profileData.area_covers, area) })}
                            className="hover:scale-110 transition-transform font-bold"
                            aria-label={`Remove ${area}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* City Covers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cities You Cover</label>
                  <div className="relative" ref={cityCoversDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowCityCoversDropdown(!showCityCoversDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-blue-400 transition-all text-sm"
                    >
                      <span className="text-gray-700">
                        {getArrayItems(profileData.city_covers).length > 0
                          ? `✨ ${getArrayItems(profileData.city_covers).length} city${getArrayItems(profileData.city_covers).length > 1 ? 'ies' : ''} selected`
                          : 'Click to select cities you cover'}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showCityCoversDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showCityCoversDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {CITY_OPTIONS.map(city => {
                          const isSelected = getArrayItems(profileData.city_covers).includes(city);
                          return (
                            <button
                              key={city}
                              type="button"
                              onClick={() => setProfileData({ ...profileData, city_covers: toggleArrayItem(profileData.city_covers, city) })}
                              className={`w-full px-3 py-2 text-left text-sm transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span>{city}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {getArrayItems(profileData.city_covers).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getArrayItems(profileData.city_covers).map(city => (
                        <span
                          key={city}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          {city}
                          <button
                            type="button"
                            onClick={() => setProfileData({ ...profileData, city_covers: toggleArrayItem(profileData.city_covers, city) })}
                            className="hover:scale-110 transition-transform font-bold"
                            aria-label={`Remove ${city}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Type - Property Types Deals In */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Types You Deal In</label>
                  <div className="relative" ref={dealsInDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowDealsInDropdown(!showDealsInDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-blue-400 transition-all text-sm"
                    >
                      <span className="text-gray-700">
                        {getArrayItems(profileData.type).length > 0
                          ? `🏠 ${getArrayItems(profileData.type).length} type${getArrayItems(profileData.type).length > 1 ? 's' : ''} selected`
                          : 'Click to select property types you deal in'}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showDealsInDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showDealsInDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {PROPERTY_TYPES.map(type => {
                          const isSelected = getArrayItems(profileData.type).includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setProfileData({ ...profileData, type: toggleArrayItem(profileData.type, type) })}
                              className={`w-full px-3 py-2 text-left text-sm transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span>{type}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {getArrayItems(profileData.type).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getArrayItems(profileData.type).map(type => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          {type}
                          <button
                            type="button"
                            onClick={() => setProfileData({ ...profileData, type: toggleArrayItem(profileData.type, type) })}
                            className="hover:scale-110 transition-transform font-bold"
                            aria-label={`Remove ${type}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button for Profile */}
                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow"
                  >
                    <Save className="w-4 h-4" />
                    Save Profile Settings
                  </button>
                  {saved && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-green-600 font-medium text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <p>Settings saved successfully! 🎉</p>
                    </div>
                  )}
                </div>

                {/* Password Change Button */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg font-medium hover:border-red-400 hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    Change Password
                  </button>
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gray-600" />
                  Search Preferences
                </h3>
              </div>

              <div className="p-4 space-y-4">
                {/* Default City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Default City</label>
                  <select
                    value={profileData.default_city}
                    onChange={(e) => setProfileData({ ...profileData, default_city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-700 text-sm"
                  >
                    <option value="">Select default city</option>
                    {CITY_OPTIONS.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Default Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Areas</label>
                  <div className="relative" ref={areaDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowAreaDropdown(!showAreaDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-blue-400 transition-all text-sm"
                    >
                      <span className="text-gray-700">
                        {getArrayItems(profileData.default_area).length > 0
                          ? `✨ ${getArrayItems(profileData.default_area).length} area${getArrayItems(profileData.default_area).length > 1 ? 's' : ''} selected`
                          : 'Click to select default areas'}
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
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {AREA_OPTIONS.map(area => {
                          const isSelected = getArrayItems(profileData.default_area).includes(area);
                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() => setProfileData({ ...profileData, default_area: toggleArrayItem(profileData.default_area, area) })}
                              className={`w-full px-3 py-2 text-left text-sm transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span>{area}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {getArrayItems(profileData.default_area).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getArrayItems(profileData.default_area).map(area => (
                        <span
                          key={area}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          {area}
                          <button
                            type="button"
                            onClick={() => setProfileData({ ...profileData, default_area: toggleArrayItem(profileData.default_area, area) })}
                            className="hover:scale-110 transition-transform font-bold"
                            aria-label={`Remove ${area}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Default Property Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Property Types</label>
                  <div className="relative" ref={typeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-blue-400 transition-all text-sm"
                    >
                      <span className="text-gray-700">
                        {getArrayItems(profileData.default_type).length > 0
                          ? `🏠 ${getArrayItems(profileData.default_type).length} type${getArrayItems(profileData.default_type).length > 1 ? 's' : ''} selected`
                          : 'Click to choose default property types'}
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
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {PROPERTY_TYPES.map(type => {
                          const isSelected = getArrayItems(profileData.default_type).includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setProfileData({ ...profileData, default_type: toggleArrayItem(profileData.default_type, type) })}
                              className={`w-full px-3 py-2 text-left text-sm transition-all ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-500'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span>{type}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {getArrayItems(profileData.default_type).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getArrayItems(profileData.default_type).map(type => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          {type}
                          <button
                            type="button"
                            onClick={() => setProfileData({ ...profileData, default_type: toggleArrayItem(profileData.default_type, type) })}
                            className="hover:scale-110 transition-transform font-bold"
                            aria-label={`Remove ${type}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button for Preferences */}
                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow"
                  >
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>

            {/* Account Actions Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Account Actions</h3>
              </div>
              <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={onSwitchUser}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 text-gray-700 hover:text-blue-700 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Switch User
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex-1 px-3 py-2 bg-white border border-red-200 rounded-lg font-medium hover:border-red-400 hover:bg-red-50 transition-all duration-200 flex items-center justify-center gap-2 text-red-600 hover:text-red-700 text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <PasswordChangeModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            // Optionally refresh profile after password change
          }}
        />
      )}
    </div>
  );
}
