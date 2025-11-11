import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getCurrentUser, setCurrentUser, User } from '../types/user';
import { authApi, getStoredToken } from '../services/authApi';

interface AuthContextType {
  ownerId: number;
  setOwnerId: (id: number) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    return getCurrentUser();
  });

  const [ownerId, setOwnerIdState] = useState<number>(() => {
    const currentUser = getCurrentUser();
    return currentUser?.id || 0;
  });

  // Start with false to allow immediate render, verify in background
  const [loading, setLoading] = useState(false);

  // Track if profile check has been initiated to prevent duplicate calls (StrictMode)
  const profileCheckInitiatedRef = useRef(false);
  
  // Check for existing token and fetch user profile on mount (non-blocking)
  useEffect(() => {
    // Prevent duplicate calls (especially in StrictMode double-render)
    // Once set, this stays true for the component lifetime
    if (profileCheckInitiatedRef.current) {
      return;
    }
    profileCheckInitiatedRef.current = true;
    
    const checkAuth = async () => {
      const token = getStoredToken();
      const storedUser = getCurrentUser();
      
      // Set initial state immediately from localStorage (non-blocking)
      if (storedUser) {
        setUserState(storedUser);
        setOwnerIdState(storedUser.id);
      }
      
      // Verify token in background if we have one
      if (token && storedUser) {
        // Verify token is still valid by fetching profile (non-blocking)
        try {
          const response = await authApi.getProfile();
          if (response.status && response.user) {
            // Convert API user to app User format
            const apiUser: User = {
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
            setUserState(apiUser);
            setCurrentUser(apiUser);
            setOwnerIdState(apiUser.id);
          } else {
            // Token invalid, clear storage
            authApi.logout();
            setUserState(null);
            setCurrentUser(null);
            setOwnerIdState(0);
          }
        } catch (error) {
          console.error('Failed to verify token:', error);
          // On error, keep stored user but mark as potentially stale
          // Already set from localStorage above, so no need to update
        }
      } else if (!storedUser) {
        // No token and no stored user - clear ownerId
        setOwnerIdState(0);
      }
    };

    checkAuth();
    
    // Cleanup: reset flag only on unmount (allows re-check if component remounts)
    return () => {
      // Note: We don't reset here to prevent duplicate calls during StrictMode double-render
      // The ref will persist for the component lifetime, which is what we want
    };
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    setCurrentUser(newUser);
    if (newUser) {
      setOwnerIdState(newUser.id);
    } else {
      setOwnerIdState(0);
    }
  };

  const setOwnerId = (id: number) => {
    setOwnerIdState(id);
    // If we have a user with this ID, update it
    if (user && user.id === id) {
      return; // Already set
    }
    // Otherwise, try to fetch user profile
    const fetchUserProfile = async () => {
      try {
        const response = await authApi.getProfile();
        if (response.status && response.user && response.user.id === id) {
          const apiUser: User = {
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
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchUserProfile();
  };

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setOwnerIdState(user.id);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      ownerId, 
      setOwnerId, 
      user, 
      setUser,
      isAuthenticated: !!user,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
