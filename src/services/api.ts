import axios from 'axios';
import { Property, PropertyFormData, FilterOptions } from '../types/property';
import { getStoredToken, clearStoredToken } from './authApi';
import { logoutUser } from '../types/user';

// API endpoints based on read_me.md structure
const FETCH_API_URL = 'https://prop.digiheadway.in/api/dealer_network/fetch.php';
const ACTION_API_URL = 'https://prop.digiheadway.in/api/dealer_network/action.php';

// Function to handle authentication errors
function handleAuthError() {
  // Clear all auth data
  clearStoredToken();
  logoutUser();
  
  // Redirect to login page
  // Use window.location to ensure full page reload and clear any state
  if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/property/')) {
    window.location.href = '/login';
  }
}

// Add axios response interceptor to handle authentication errors globally
axios.interceptors.response.use(
  (response) => {
    // Check if response data contains an authentication error
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      const errorMessage = response.data.error || '';
      if (errorMessage.toLowerCase().includes('authentication required') || 
          errorMessage.toLowerCase().includes('invalid token')) {
        handleAuthError();
        return Promise.reject(new Error(errorMessage));
      }
    }
    return response;
  },
  (error) => {
    // Handle HTTP error responses
    if (error.response) {
      const errorData = error.response.data;
      if (errorData && typeof errorData === 'object' && 'error' in errorData) {
        const errorMessage = errorData.error || '';
        if (errorMessage.toLowerCase().includes('authentication required') || 
            errorMessage.toLowerCase().includes('invalid token')) {
          handleAuthError();
        }
      }
      // Also check for 401/403 status codes
      if (error.response.status === 401 || error.response.status === 403) {
        handleAuthError();
      }
    }
    return Promise.reject(error);
  }
);

// Request cache to prevent duplicate calls
const requestCache = new Map<number, Promise<Property | null>>();

// Validate ownerId before making API calls
function validateOwnerId(ownerId: number): void {
  if (!ownerId || ownerId <= 0 || isNaN(ownerId)) {
    throw new Error('Invalid owner_id: owner_id must be a positive number');
  }
}

// Get authorization headers with Bearer token
function getAuthHeaders(): { Authorization?: string } {
  const token = getStoredToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

function normalizeProperty(data: any): Property {
  return {
    ...data,
    id: Number(data.id),
    owner_id: Number(data.owner_id),
    size_min: Number(data.size_min),
    size_max: Number(data.size_max),
    price_min: Number(data.price_min),
    price_max: Number(data.price_max),
    is_public: Number(data.is_public),
    public_rating: data.public_rating ? Number(data.public_rating) : undefined,
    my_rating: data.my_rating ? Number(data.my_rating) : undefined,
  };
}

function normalizeProperties(data: any): Property[] {
  // Check if response is an error object
  if (data && typeof data === 'object' && 'error' in data) {
    const errorMessage = data.error || 'API error occurred';
    // Authentication errors are handled by the interceptor, but we still throw here
    // to prevent processing invalid data
    throw new Error(errorMessage);
  }
  
  // Handle new fetch.php response format: {success, message, data, meta}
  if (data && typeof data === 'object' && 'success' in data && 'data' in data && Array.isArray(data.data)) {
    return data.data.map(normalizeProperty);
  }
  
  // Handle old format (direct array) for backward compatibility
  if (Array.isArray(data)) {
    return data.map(normalizeProperty);
  }
  
  return [];
}

function extractPaginationMeta(data: any): PaginationMeta | null {
  // Check if response has meta field with pagination info (fetch.php format)
  if (data && typeof data === 'object' && 'meta' in data && data.meta) {
    const meta = data.meta;
    if (typeof meta === 'object') {
      // Map fetch.php meta format to our PaginationMeta format
      return {
        page: meta.current_page !== undefined ? Number(meta.current_page) : (meta.page !== undefined ? Number(meta.page) : 1),
        per_page: meta.per_page !== undefined ? Number(meta.per_page) : 40,
        total: meta.total_records !== undefined ? Number(meta.total_records) : (meta.total !== undefined ? Number(meta.total) : 0),
        total_pages: meta.total_pages !== undefined ? Number(meta.total_pages) : 0,
        page_results: meta.page_results !== undefined ? Number(meta.page_results) : 0,
      };
    }
  }
  return null;
}

export interface PaginationOptions {
  page?: number;
  per_page?: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  page_results: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export const propertyApi = {
  async getUserProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', 'mine'); // fetch.php uses 'list' parameter
    
    // Add for=map parameter if requesting map data (only properties with location/landmark)
    if (forMap) {
      queryParams.append('for', 'map');
    }
    
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('limit', pagination.per_page.toString()); // fetch.php uses 'limit' instead of 'per_page'
    }
    
    const url = `${FETCH_API_URL}?${queryParams.toString()}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true, // Include cookies for token
    });
    const properties = normalizeProperties(response.data);
    const meta = extractPaginationMeta(response.data) || {
      page: pagination?.page || 1,
      per_page: pagination?.per_page || 40,
      total: properties.length,
      total_pages: 1,
      page_results: properties.length,
    };
    return { data: properties, meta };
  },

  async getPublicProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', 'others'); // fetch.php uses 'list' parameter
    
    // Add for=map parameter if requesting map data (only properties with location/landmark)
    if (forMap) {
      queryParams.append('for', 'map');
    }
    
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('limit', pagination.per_page.toString()); // fetch.php uses 'limit' instead of 'per_page'
    }
    
    const url = `${FETCH_API_URL}?${queryParams.toString()}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    const properties = normalizeProperties(response.data);
    const meta = extractPaginationMeta(response.data) || {
      page: pagination?.page || 1,
      per_page: pagination?.per_page || 40,
      total: properties.length,
      total_pages: 1,
      page_results: properties.length,
    };
    return { data: properties, meta };
  },

  async getAllProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', 'both'); // fetch.php uses 'list' parameter
    
    // Add for=map parameter if requesting map data (only properties with location/landmark)
    if (forMap) {
      queryParams.append('for', 'map');
    }
    
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('limit', pagination.per_page.toString()); // fetch.php uses 'limit' instead of 'per_page'
    }
    
    const url = `${FETCH_API_URL}?${queryParams.toString()}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    const properties = normalizeProperties(response.data);
    const meta = extractPaginationMeta(response.data) || {
      page: pagination?.page || 1,
      per_page: pagination?.per_page || 40,
      total: properties.length,
      total_pages: 1,
      page_results: properties.length,
    };
    return { data: properties, meta };
  },

  async addProperty(ownerId: number, data: PropertyFormData): Promise<{ success: boolean; id: number }> {
    validateOwnerId(ownerId);
    const url = `${ACTION_API_URL}?action=add_property`;
    const response = await axios.post(
      url,
      {
        owner_id: ownerId,
        ...data,
      },
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );
    // Check for error in response (action.php uses 'error' key)
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      throw new Error(response.data.error || 'Failed to add property');
    }
    return response.data;
  },

  async updateProperty(id: number, ownerId: number, data: Partial<PropertyFormData>): Promise<{ success: boolean }> {
    validateOwnerId(ownerId);
    const url = `${ACTION_API_URL}?action=update_property`;
    const response = await axios.post(
      url,
      {
        id,
        owner_id: ownerId,
        ...data,
      },
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      }
    );
    // Check for error in response (action.php uses 'error' key)
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      throw new Error(response.data.error || 'Failed to update property');
    }
    return response.data;
  },

  async deleteProperty(id: number, ownerId: number): Promise<{ success: boolean }> {
    validateOwnerId(ownerId);
    const url = `${ACTION_API_URL}?action=delete_property&id=${id}&owner_id=${ownerId}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    // Check for error in response (action.php uses 'error' key)
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      throw new Error(response.data.error || 'Failed to delete property');
    }
    return response.data;
  },

  async filterProperties(ownerId: number, list: 'mine' | 'others' | 'both', filters: FilterOptions, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', list); // fetch.php uses 'list' parameter

    // Add for=map parameter if requesting map data (only properties with location/landmark)
    if (forMap) {
      queryParams.append('for', 'map');
    }

    // Map filter options to API parameters (fetch.php expects these directly)
    if (filters.city) queryParams.append('city', filters.city);
    if (filters.area) queryParams.append('area', filters.area);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.tags) queryParams.append('tags', filters.tags);
    if (filters.highlights) queryParams.append('highlights', filters.highlights);
    
    // Map price filters (fetch.php expects price_min/price_max)
    if (filters.min_price !== undefined) queryParams.append('min_price', filters.min_price.toString());
    if (filters.max_price !== undefined) queryParams.append('max_price', filters.max_price.toString());
    
    // Map size filters (fetch.php expects size_min/max_size and size_unit)
    if (filters.size_min !== undefined) queryParams.append('min_size', filters.size_min.toString());
    if (filters.max_size !== undefined) queryParams.append('max_size', filters.max_size.toString());
    if (filters.size_unit) queryParams.append('size_unit', filters.size_unit);
    if (filters.size_unit) queryParams.append('filter_size_unit', filters.size_unit); // fetch.php also uses filter_size_unit
    
    // Map location filters
    if (filters.has_location !== undefined) queryParams.append('has_location', filters.has_location.toString());
    if (filters.has_landmark !== undefined) queryParams.append('has_landmark', filters.has_landmark.toString());

    // Add pagination parameters
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('limit', pagination.per_page.toString()); // fetch.php uses 'limit' instead of 'per_page'
    }

    const url = `${FETCH_API_URL}?${queryParams.toString()}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    const properties = normalizeProperties(response.data);
    const meta = extractPaginationMeta(response.data) || {
      page: pagination?.page || 1,
      per_page: pagination?.per_page || 40,
      total: properties.length,
      total_pages: 1,
      page_results: properties.length,
    };
    return { data: properties, meta };
  },

  async searchProperties(ownerId: number, list: 'mine' | 'others' | 'both', query: string, _column?: string, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', list); // fetch.php uses 'list' parameter
    queryParams.append('search', query); // fetch.php uses 'search' parameter

    // Add for=map parameter if requesting map data (only properties with location/landmark)
    if (forMap) {
      queryParams.append('for', 'map');
    }

    // Note: fetch.php doesn't use column parameter, it searches across all fields
    // (city, area, type, description, highlights, heading)

    // Add pagination parameters
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('limit', pagination.per_page.toString()); // fetch.php uses 'limit' instead of 'per_page'
    }

    const url = `${FETCH_API_URL}?${queryParams.toString()}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    const properties = normalizeProperties(response.data);
    const meta = extractPaginationMeta(response.data) || {
      page: pagination?.page || 1,
      per_page: pagination?.per_page || 40,
      total: properties.length,
      total_pages: 1,
      page_results: properties.length,
    };
    return { data: properties, meta };
  },

  async getPropertyById(propertyId: number, _ownerId?: number): Promise<Property | null> {
    // Check if there's already a pending request for this property
    if (requestCache.has(propertyId)) {
      console.log('Reusing existing request for property:', propertyId);
      return requestCache.get(propertyId)!;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        // Use fetch.php with action=get_property (doesn't require authentication for public properties)
        const publicUrl = `${FETCH_API_URL}?action=get_property&id=${propertyId}`;
        console.log('Making single API request to:', publicUrl);
        const publicResponse = await axios.get(publicUrl, {
          withCredentials: true,
          // No auth headers needed for this endpoint
        });
        
        console.log('API response received:', publicResponse.status);
        
        // Handle fetch.php response format: {success, message, data}
        let property: any = null;
        if (publicResponse.data && typeof publicResponse.data === 'object') {
          if (publicResponse.data.success && publicResponse.data.data) {
            // fetch.php returns single property object in data field
            property = publicResponse.data.data;
          } else if (Array.isArray(publicResponse.data.data)) {
            // Handle array format if returned
            property = publicResponse.data.data[0] || null;
          } else if (Array.isArray(publicResponse.data)) {
            // Handle old format (direct array) for backward compatibility
            property = publicResponse.data[0] || null;
          }
        }
        
        if (property) {
          return normalizeProperty(property);
        }
        
        return null;
      } catch (error: any) {
        console.error('Error fetching property by ID:', error.response?.data || error.message);
        return null;
      } finally {
        // Remove from cache after request completes (after a short delay to allow concurrent calls to reuse)
        setTimeout(() => {
          requestCache.delete(propertyId);
        }, 1000);
      }
    })();

    // Cache the request promise
    requestCache.set(propertyId, requestPromise);
    
    return requestPromise;
  },
};
