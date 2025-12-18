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
    // IMPORTANT: Only handle authentication errors, NOT network errors
    // Network errors (offline, timeout, etc.) should NOT trigger logout

    if (error.response) {
      // Server responded with an error status - check if it's an auth error
      const errorData = error.response.data;
      const statusCode = error.response.status;

      // Only logout for explicit authentication/authorization errors
      if (statusCode === 401 || statusCode === 403) {
        handleAuthError();
      } else if (errorData && typeof errorData === 'object' && 'error' in errorData) {
        const errorMessage = errorData.error || '';
        if (errorMessage.toLowerCase().includes('authentication required') ||
          errorMessage.toLowerCase().includes('invalid token')) {
          handleAuthError();
        }
      }
    } else if (error.request) {
      // Request was made but no response received (network error, timeout, offline, etc.)
      // DO NOT logout - this is a connectivity issue, not an auth issue
      console.warn('Network error detected (offline or timeout):', error.message);
      // Just pass the error through without triggering logout
    } else {
      // Something else happened during request setup
      console.warn('Request setup error:', error.message);
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
    owner_id: Number(data.owner_id || 0),
    size_min: Number(data.size_min),
    size_max: Number(data.size_max),
    price_min: Number(data.price_min),
    price_max: Number(data.price_max),
    is_public: data.is_public !== undefined ? Number(data.is_public) : 1, // Default to 1 (public) if not provided
    public_rating: data.public_rating ? Number(data.public_rating) : undefined,
    my_rating: data.my_rating ? Number(data.my_rating) : undefined,
    // Handle is_favourite which might be boolean or number
    is_favourite: data.is_favourite === true ? 1 : (data.is_favourite === false ? 0 : (data.is_favourite !== undefined ? Number(data.is_favourite) : 0)),
    // Map my_note (backend) to user_note (frontend)
    user_note: data.my_note || data.user_note || '',
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

// Helper function to add filters to query params, only including non-default values
function addFiltersToParams(queryParams: URLSearchParams, filters: FilterOptions) {
  // Default values that should not be sent
  const DEFAULT_MIN_PRICE = 0;
  const DEFAULT_MAX_PRICE = 500;
  const DEFAULT_MIN_SIZE = 0;
  const DEFAULT_MAX_SIZE = 10000;

  if (filters.city) queryParams.append('city', filters.city);
  if (filters.area) queryParams.append('area', filters.area);

  // Handle type as string or array (for multi-select)
  if (filters.type) {
    if (Array.isArray(filters.type)) {
      if (filters.type.length > 0) {
        queryParams.append('type', filters.type.join(','));
      }
    } else {
      queryParams.append('type', filters.type);
    }
  }

  // Handle tags as string or array (for multi-select)
  if (filters.tags) {
    if (Array.isArray(filters.tags)) {
      if (filters.tags.length > 0) {
        queryParams.append('tags', filters.tags.join(','));
      }
    } else {
      queryParams.append('tags', filters.tags);
    }
  }

  // Handle highlights as string or array (for multi-select)
  if (filters.highlights) {
    if (Array.isArray(filters.highlights)) {
      if (filters.highlights.length > 0) {
        queryParams.append('highlights', filters.highlights.join(','));
      }
    } else {
      queryParams.append('highlights', filters.highlights);
    }
  }

  // Only send price filters if they're not at default values
  const minPrice = filters.min_price ?? DEFAULT_MIN_PRICE;
  const maxPrice = filters.max_price ?? DEFAULT_MAX_PRICE;
  const isPriceRangeApplied = !(minPrice === DEFAULT_MIN_PRICE && maxPrice === DEFAULT_MAX_PRICE);

  if (isPriceRangeApplied) {
    if (minPrice !== DEFAULT_MIN_PRICE) {
      queryParams.append('min_price', minPrice.toString());
    }
    if (maxPrice !== DEFAULT_MAX_PRICE) {
      queryParams.append('max_price', maxPrice.toString());
    }
  }

  // Only send size filters if they're not at default values
  const minSize = filters.size_min ?? DEFAULT_MIN_SIZE;
  const maxSize = filters.max_size ?? DEFAULT_MAX_SIZE;
  const isSizeRangeApplied = !(minSize === DEFAULT_MIN_SIZE && maxSize === DEFAULT_MAX_SIZE);

  if (isSizeRangeApplied) {
    if (minSize !== DEFAULT_MIN_SIZE) {
      queryParams.append('min_size', minSize.toString());
    }
    if (maxSize !== DEFAULT_MAX_SIZE) {
      queryParams.append('max_size', maxSize.toString());
    }
    // Only send size_unit if size range is actually applied
    if (filters.size_unit) {
      queryParams.append('size_unit', filters.size_unit);
    }
  }

  // Filter by specific size unit (separate from size_unit used for size range)
  if (filters.filter_size_unit) {
    queryParams.append('filter_size_unit', filters.filter_size_unit);
  }

  // Map location filters
  if (filters.has_location !== undefined) {
    queryParams.append('has_location', filters.has_location.toString());
  }
  if (filters.has_landmark !== undefined) {
    queryParams.append('has_landmark', filters.has_landmark.toString());
  }

  // Map privacy filter
  if (filters.is_public !== undefined) {
    queryParams.append('is_public', filters.is_public.toString());
  }

  // Add sorting parameters
  if (filters.sortby) {
    queryParams.append('sortby', filters.sortby);
  }
  if (filters.order) {
    queryParams.append('order', filters.order);
  }
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

  async getSavedProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', 'saved');

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

  async favProperty(ownerId: number, propertyId: number, isFavourite: number, userNote: string): Promise<{ success: boolean; message: string }> {
    validateOwnerId(ownerId);
    const url = `${ACTION_API_URL}?action=fav_property`;
    const response = await axios.post(
      url,
      {
        owner_id: ownerId,
        property_id: propertyId,
        is_favourite: isFavourite,
        user_note: userNote
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
      throw new Error(response.data.error || 'Failed to update favorite');
    }
    return response.data;
  },

  async filterProperties(ownerId: number, list: 'mine' | 'others' | 'both' | 'saved', filters: FilterOptions, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', list); // fetch.php uses 'list' parameter

    // Add for=map parameter if requesting map data (only properties with location/landmark)
    if (forMap) {
      queryParams.append('for', 'map');
    }

    // Add filters (only non-default values)
    addFiltersToParams(queryParams, filters);

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

  async searchProperties(ownerId: number, list: 'mine' | 'others' | 'both' | 'saved', query: string, column?: string, pagination?: PaginationOptions, forMap?: boolean, filters?: FilterOptions): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('list', list); // fetch.php uses 'list' parameter

    // Only send search parameter if query is not empty (matches backend's !empty($search) check)
    if (query && query.trim()) {
      queryParams.append('search', query.trim()); // fetch.php uses 'search' parameter
    }

    // Send column parameter (even though backend searches all fields, send it for API consistency)
    if (column && column.trim()) {
      queryParams.append('column', column.trim());
    }

    // Add for=map parameter if requesting map data (only properties with location/landmark)
    if (forMap) {
      queryParams.append('for', 'map');
    }

    // Note: fetch.php searches across all fields regardless of column parameter
    // (city, area, type, description, highlights, heading)

    // Apply filters if provided (for search with filters) - only non-default values
    if (filters) {
      addFiltersToParams(queryParams, filters);
    }

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
        console.log('API response data:', JSON.stringify(publicResponse.data, null, 2));

        // Handle fetch.php response format: {success, message, data}
        let property: any = null;
        if (publicResponse.data && typeof publicResponse.data === 'object') {
          if (publicResponse.data.success && publicResponse.data.data) {
            // fetch.php returns single property object in data field
            property = publicResponse.data.data;
            console.log('Property extracted from response.data.data:', property);
          } else if (Array.isArray(publicResponse.data.data)) {
            // Handle array format if returned
            property = publicResponse.data.data[0] || null;
            console.log('Property extracted from array:', property);
          } else if (Array.isArray(publicResponse.data)) {
            // Handle old format (direct array) for backward compatibility
            property = publicResponse.data[0] || null;
            console.log('Property extracted from direct array:', property);
          } else {
            console.log('Unexpected response format:', publicResponse.data);
          }
        }

        if (property) {
          const normalized = normalizeProperty(property);
          console.log('Normalized property:', normalized);
          return normalized;
        }

        console.log('No property found in response');
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
