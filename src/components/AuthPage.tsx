import { useState } from 'react';
import { User, Phone, Lock, Building, MapPin, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { CITY_OPTIONS, AREA_OPTIONS, PROPERTY_TYPES } from '../utils/filterOptions';

interface AuthPageProps {
  onLogin: (userId: number) => void;
  onGoToHome?: () => void;
}

export function AuthPage({ onLogin, onGoToHome }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupFirmName, setSignupFirmName] = useState('');
  const [signupPin, setSignupPin] = useState('');
  const [signupCity, setSignupCity] = useState('');
  const [signupArea, setSignupArea] = useState<string[]>([]);
  const [signupPropertyType, setSignupPropertyType] = useState<string[]>([]);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!loginPhone.trim()) {
      setError('Please enter your phone number');
      setLoading(false);
      return;
    }

    if (!loginPin) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      const { authApi } = await import('../services/authApi');
      const { setCurrentUser } = await import('../types/user');
      
      const response = await authApi.login(loginPhone.trim(), loginPin);
      
      // Check if login was successful
      if (response && response.status === true && response.user) {
        // Fetch full profile to get all user data
        try {
          const profileResponse = await authApi.getProfile();
          if (profileResponse && profileResponse.status && profileResponse.user) {
            const user = {
              id: profileResponse.user.id,
              name: profileResponse.user.name,
              phone: profileResponse.user.phone,
              token: profileResponse.user.token,
              firmName: profileResponse.user.firm_name,
              firm_name: profileResponse.user.firm_name,
              area_covers: profileResponse.user.area_covers,
              city_covers: profileResponse.user.city_covers,
              type: profileResponse.user.type,
              default_area: profileResponse.user.default_area,
              default_city: profileResponse.user.default_city,
              default_type: profileResponse.user.default_type,
              created_on: profileResponse.user.created_on,
            };
            setCurrentUser(user);
            onLogin(user.id);
            return; // Success, exit early
          }
        } catch (profileError: any) {
          console.warn('Failed to fetch profile, using login response:', profileError);
          // Continue with basic user data from login response
        }
        
        // Fallback to basic user data from login response
        if (response.user) {
          const user = {
            id: response.user.id,
            name: response.user.name,
            phone: response.user.phone,
            token: response.user.token,
          };
          setCurrentUser(user);
          onLogin(user.id);
          return; // Success, exit early
        }
      }
      
      // If we get here, login failed
      const errorMessage = response?.message || 'Invalid phone number or password';
      setError(errorMessage);
      console.error('Login failed:', response);
    } catch (err: any) {
      // This should rarely happen now since authApi.login handles errors
      const errorMessage = err?.message || err?.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields (only name, phone, and password are required by API)
    if (!signupName.trim() || !signupPhone.trim() || !signupPin.trim()) {
      setError('Please fill in all required fields (Name, Phone, and Password)');
      setLoading(false);
      return;
    }

    // Validate password (should be at least 4 characters)
    if (signupPin.length < 4) {
      setError('Password must be at least 4 characters');
      setLoading(false);
      return;
    }

    // Validate phone (should be 10 digits)
    if (!/^\d{10}$/.test(signupPhone.trim())) {
      setError('Phone number must be 10 digits');
      setLoading(false);
      return;
    }

    try {
      const { authApi } = await import('../services/authApi');
      const { setCurrentUser } = await import('../types/user');
      
      const response = await authApi.signup(
        signupName.trim(),
        signupPhone.trim(),
        signupPin
      );
      
      if (response.status && response.token && response.user_id) {
        // After successful signup, fetch the user profile to get full user data
        try {
          const profileResponse = await authApi.getProfile();
          if (profileResponse.status && profileResponse.user) {
            const user = {
              id: profileResponse.user.id,
              name: profileResponse.user.name,
              phone: profileResponse.user.phone,
              token: profileResponse.user.token,
              firmName: profileResponse.user.firm_name,
              firm_name: profileResponse.user.firm_name,
              area_covers: profileResponse.user.area_covers,
              city_covers: profileResponse.user.city_covers,
              type: profileResponse.user.type,
              default_area: profileResponse.user.default_area,
              default_city: profileResponse.user.default_city,
              default_type: profileResponse.user.default_type,
              created_on: profileResponse.user.created_on,
            };
            setCurrentUser(user);
            onLogin(user.id);
          } else {
            // Fallback to basic user data
            const user = {
              id: response.user_id,
              name: signupName.trim(),
              phone: signupPhone.trim(),
              token: response.token,
            };
            setCurrentUser(user);
            onLogin(user.id);
          }
        } catch (profileError) {
          // Fallback to basic user data
          const user = {
            id: response.user_id,
            name: signupName.trim(),
            phone: signupPhone.trim(),
            token: response.token,
          };
          setCurrentUser(user);
          onLogin(user.id);
        }
      } else {
        setError(response.message || 'Signup failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <button
              onClick={onGoToHome}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Dealer Network
              </h1>
            </button>
            <p className="text-gray-600">
              Welcome back!
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit phone number"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      // Forgot password functionality - can be implemented later
                      setError('Please contact support to reset your PIN');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot Pin?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="Enter your PIN"
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setShowAdditionalDetails(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit phone number"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Address <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={signupAddress}
                    onChange={(e) => setSignupAddress(e.target.value)}
                    placeholder="Enter your office address"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firm Name <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={signupFirmName}
                    onChange={(e) => setSignupFirmName(e.target.value)}
                    placeholder="Enter your firm name"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={signupPin}
                    onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Create a 4+ digit PIN"
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Minimum 4 digits</p>
              </div>

              {/* Additional Details Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                  className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">Additional Details (Optional)</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      showAdditionalDetails ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Additional Details Fields */}
              {showAdditionalDetails && (
                <div className="space-y-4 pt-2 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={signupCity}
                      onChange={(e) => setSignupCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Select City</option>
                      {CITY_OPTIONS.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                    <div className="space-y-2">
                      {AREA_OPTIONS.map((area) => (
                        <label key={area} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={signupArea.includes(area)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSignupArea([...signupArea, area]);
                              } else {
                                setSignupArea(signupArea.filter(a => a !== area));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {signupArea.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Selected: {signupArea.join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                    <div className="space-y-2">
                      {PROPERTY_TYPES.map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={signupPropertyType.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSignupPropertyType([...signupPropertyType, type]);
                              } else {
                                setSignupPropertyType(signupPropertyType.filter(t => t !== type));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {signupPropertyType.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Selected: {signupPropertyType.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Login
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

