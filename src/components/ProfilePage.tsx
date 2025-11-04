import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, User as UserIcon, MapPin, Home, DollarSign, Ruler } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserSettings, getUserSettings, saveUserSettings, DEFAULT_USER_SETTINGS } from '../types/userSettings';

const CITY_OPTIONS = ['Panipat', 'Delhi', 'Gurgaon', 'Noida', 'Faridabad'];
const AREA_OPTIONS = [
  'Sector 1', 'Sector 2', 'Sector 3', 'Sector 4', 'Sector 5',
  'Sector 6', 'Sector 7', 'Sector 8', 'Sector 9', 'Sector 10',
  'Sector 12', 'Sector 13', 'Sector 14', 'Sector 15', 'Sector 16',
  'Sector 17', 'Sector 18', 'Sector 19', 'Sector 20', 'Sector 21',
  'Sector 22', 'Sector 23', 'Sector 24', 'Sector 25', 'Model Town',
  'Civil Lines', 'GT Road', 'Huda Sector', 'Industrial Area'
];
const PROPERTY_TYPES = [
  'Residential Plot',
  'Commercial Plot',
  'House',
  'Apartment',
  'Agriculture Land',
  'Industrial Plot'
];
const SIZE_UNITS = ['Sqyd', 'Sqft', 'Acre', 'Marla', 'Kanal'];

interface ProfilePageProps {
  onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { ownerId } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [saved, setSaved] = useState(false);
  const areaDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadedSettings = getUserSettings();
    setSettings(loadedSettings);
  }, []);

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

  const handleSave = () => {
    saveUserSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Profile & Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* User Info Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">User {ownerId}</h2>
                <p className="text-gray-500">Property Network Member</p>
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="p-6 space-y-6">
            {/* City Setting */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                <MapPin className="w-4 h-4" />
                Default City
              </label>
              <select
                value={settings.city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CITY_OPTIONS.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                This city will be used as default when adding new properties
              </p>
            </div>

            {/* Preferred Areas */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                <MapPin className="w-4 h-4" />
                Preferred Areas
              </label>
              <div className="relative" ref={areaDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowAreaDropdown(!showAreaDropdown)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="text-gray-700">
                    {settings.preferredAreas.length > 0
                      ? `${settings.preferredAreas.length} area(s) selected`
                      : 'Select preferred areas'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showAreaDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showAreaDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {AREA_OPTIONS.map(area => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleArea(area)}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          settings.preferredAreas.includes(area)
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {settings.preferredAreas.map(area => (
                    <span
                      key={area}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => toggleArea(area)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Select areas you're most interested in. These will be prioritized in searches.
              </p>
            </div>

            {/* Preferred Property Types */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                <Home className="w-4 h-4" />
                Preferred Property Types
              </label>
              <div className="relative" ref={typeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="text-gray-700">
                    {settings.preferredPropertyTypes.length > 0
                      ? `${settings.preferredPropertyTypes.length} type(s) selected`
                      : 'Select preferred property types'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTypeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {PROPERTY_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => togglePropertyType(type)}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          settings.preferredPropertyTypes.includes(type)
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.preferredPropertyTypes.includes(type)}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span>{type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {settings.preferredPropertyTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {settings.preferredPropertyTypes.map(type => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2"
                    >
                      {type}
                      <button
                        type="button"
                        onClick={() => togglePropertyType(type)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Select property types you're most interested in. These will be used as default filters.
              </p>
            </div>

            {/* Default Price Range */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                <DollarSign className="w-4 h-4" />
                Default Price Range (Lakhs)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Min Price</label>
                  <input
                    type="number"
                    value={settings.defaultPriceMin || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      defaultPriceMin: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    placeholder="Min"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Max Price</label>
                  <input
                    type="number"
                    value={settings.defaultPriceMax || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      defaultPriceMax: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    placeholder="Max"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Default price range for property searches and filters
              </p>
            </div>

            {/* Default Size Unit */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                <Ruler className="w-4 h-4" />
                Default Size Unit
              </label>
              <select
                value={settings.defaultSizeUnit}
                onChange={(e) => setSettings({ ...settings, defaultSizeUnit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SIZE_UNITS.map(unit => (
                  <option key={unit} value={unit}>
                    {unit === 'Sqyd' ? 'Sq. Yard' : unit === 'Sqft' ? 'Sq. Ft' : unit}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Default unit for property size when adding new properties
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Settings
              </button>
              {saved && (
                <p className="mt-3 text-center text-sm text-green-600 font-medium">
                  Settings saved successfully!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

