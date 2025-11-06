import axios from 'axios';

// Auth API URL - matches the actual PHP file name
const AUTH_API_BASE_URL = 'https://prop.digiheadway.in/api/network-auth.php';

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  firm_name?: string;
  area_covers?: string;
  city_covers?: string;
  type?: string;
  default_area?: string;
  default_city?: string;
  default_type?: string;
  token: string;
  created_on?: string;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  user?: {
    id: number;
    name: string;
    phone: string;
    token: string;
  };
  token?: string;
  user_id?: number;
}

export interface SignupResponse {
  status: boolean;
  message: string;
  token?: string;
  user_id?: number;
}

export interface ProfileResponse {
  status: boolean;
  message: string;
  user?: AuthUser;
}

// Store token in localStorage
const TOKEN_KEY = 'propnetwork_auth_token';
const USER_ID_KEY = 'propnetwork_user_id';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
}

export function getStoredUserId(): number | null {
  try {
    const stored = localStorage.getItem(USER_ID_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

export function setStoredUserId(userId: number): void {
  try {
    localStorage.setItem(USER_ID_KEY, userId.toString());
  } catch (error) {
    console.error('Failed to store user ID:', error);
  }
}

// Configure axios to include credentials for cookies
axios.defaults.withCredentials = true;

export const authApi = {
  async signup(name: string, phone: string, password: string): Promise<SignupResponse> {
    try {
      const response = await axios.post<SignupResponse>(
        `${AUTH_API_BASE_URL}?action=signup`,
        { name, phone, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.status && response.data.token && response.data.user_id) {
        setStoredToken(response.data.token);
        setStoredUserId(response.data.user_id);
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Signup failed');
    }
  },

  async login(phone: string, password: string): Promise<LoginResponse> {
    try {
      console.log('Attempting login to:', `${AUTH_API_BASE_URL}?action=login`);
      const response = await axios.post<LoginResponse>(
        `${AUTH_API_BASE_URL}?action=login`,
        { phone, password },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      
      console.log('Login response:', response.data);
      
      // Check if response has data
      if (!response.data) {
        console.error('No response data received');
        return { status: false, message: 'No response from server' };
      }
      
      // Handle successful login
      if (response.data.status && response.data.user?.token) {
        setStoredToken(response.data.user.token);
        setStoredUserId(response.data.user.id);
        console.log('Login successful, token stored');
      } else if (response.data.status && response.data.token && response.data.user_id) {
        setStoredToken(response.data.token);
        setStoredUserId(response.data.user_id);
        console.log('Login successful (alternative format), token stored');
      } else {
        console.warn('Login response indicates failure:', response.data);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error);
      
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        console.error('Server responded with error:', error.response.status, error.response.data);
        const errorData = error.response.data;
        if (errorData && typeof errorData === 'object') {
          const errorMessage = errorData.message || errorData.error || 'Login failed';
          console.error('Error message:', errorMessage);
          return {
            status: false,
            message: errorMessage,
          };
        }
        return {
          status: false,
          message: `Server error: ${error.response.status} ${error.response.statusText}`,
        };
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received from server:', error.request);
        return {
          status: false,
          message: 'Network error: Unable to connect to server. Please check your internet connection and ensure the API is accessible.',
        };
      } else {
        // Something else happened
        console.error('Unexpected error:', error.message);
        return {
          status: false,
          message: error.message || 'Login failed. Please try again.',
        };
      }
    }
  },

  async getProfile(): Promise<ProfileResponse> {
    const token = getStoredToken();
    if (!token) {
      console.warn('No token found for getProfile');
      return { status: false, message: 'No token found' };
    }

    try {
      // According to PHP file: action=me or action=profile with GET
      const response = await axios.get<ProfileResponse>(
        `${AUTH_API_BASE_URL}?action=me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          withCredentials: true,
          timeout: 10000, // 10 second timeout
        }
      );
      
      console.log('getProfile API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('getProfile API error:', error);
      if (error.response?.data) {
        console.error('Error response data:', error.response.data);
        return error.response.data;
      }
      if (error.code === 'ECONNABORTED') {
        return { status: false, message: 'Request timeout. Please check your connection.' };
      }
      throw new Error(error.message || 'Failed to get profile');
    }
  },

  async updateProfile(updates: {
    firm_name?: string;
    area_covers?: string;
    city_covers?: string;
    type?: string;
    default_area?: string;
    default_city?: string;
    default_type?: string;
  }): Promise<ProfileResponse> {
    const token = getStoredToken();
    if (!token) {
      return { status: false, message: 'No token found' };
    }

    try {
      // According to PHP file: action=profile with POST and update: true in body
      const response = await axios.post<ProfileResponse>(
        `${AUTH_API_BASE_URL}?action=profile`,
        { update: true, ...updates },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Failed to update profile');
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ status: boolean; message: string }> {
    const token = getStoredToken();
    if (!token) {
      return { status: false, message: 'No token found' };
    }

    try {
      // Note: This endpoint doesn't exist in the PHP file yet
      // You'll need to add it to network-auth.php
      const response = await axios.post<{ status: boolean; message: string }>(
        `${AUTH_API_BASE_URL}?action=change_password`,
        { old_password: oldPassword, new_password: newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error(error.message || 'Failed to change password. This feature may not be implemented yet.');
    }
  },

  logout(): void {
    clearStoredToken();
  },
};

