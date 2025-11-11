import axios from 'axios';
import { Property, PropertyFormData, FilterOptions } from '../types/property';
import { getStoredToken, clearStoredToken } from './authApi';
import { logoutUser } from '../types/user';

const API_BASE_URL = 'https://prop.digiheadway.in/api/network.php';

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
  
  // Handle new response format with meta and data fields
  if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
    return data.data.map(normalizeProperty);
  }
  
  // Handle old format (direct array) for backward compatibility
  if (Array.isArray(data)) {
  return data.map(normalizeProperty);
  }
  
  return [];
}

function extractPaginationMeta(data: any): PaginationMeta | null {
  // Check if response has meta field with pagination info
  if (data && typeof data === 'object' && 'meta' in data && data.meta) {
    const meta = data.meta;
    if (typeof meta === 'object' && 'page' in meta && 'per_page' in meta) {
      return {
        page: Number(meta.page) || 1,
        per_page: Number(meta.per_page) || 40,
        total: meta.total !== undefined ? Number(meta.total) : 0,
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
  async getUserProperties(ownerId: number, pagination?: PaginationOptions): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'get_user_properties');
    queryParams.append('owner_id', ownerId.toString());
    
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('per_page', pagination.per_page.toString());
    }
    
    const url = `${API_BASE_URL}?${queryParams.toString()}`;
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

  async getPublicProperties(ownerId: number, pagination?: PaginationOptions): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'get_public_properties');
    queryParams.append('owner_id', ownerId.toString());
    
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('per_page', pagination.per_page.toString());
    }
    
    const url = `${API_BASE_URL}?${queryParams.toString()}`;
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

  async getAllProperties(ownerId: number, pagination?: PaginationOptions): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'get_all_properties');
    queryParams.append('owner_id', ownerId.toString());
    
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('per_page', pagination.per_page.toString());
    }
    
    const url = `${API_BASE_URL}?${queryParams.toString()}`;
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
    const url = `${API_BASE_URL}?action=add_property&owner_id=${ownerId}`;
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
    // Check for error in response
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      throw new Error(response.data.error || 'Failed to add property');
    }
    return response.data;
  },

  async updateProperty(id: number, ownerId: number, data: Partial<PropertyFormData>): Promise<{ success: boolean }> {
    validateOwnerId(ownerId);
    const url = `${API_BASE_URL}?action=update_property&owner_id=${ownerId}`;
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
    // Check for error in response
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      throw new Error(response.data.error || 'Failed to update property');
    }
    return response.data;
  },

  async deleteProperty(id: number, ownerId: number): Promise<{ success: boolean }> {
    validateOwnerId(ownerId);
    const url = `${API_BASE_URL}?action=delete_property&id=${id}&owner_id=${ownerId}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    // Check for error in response
    if (response.data && typeof response.data === 'object' && 'error' in response.data) {
      throw new Error(response.data.error || 'Failed to delete property');
    }
    return response.data;
  },

  async filterProperties(ownerId: number, list: 'mine' | 'others' | 'both', filters: FilterOptions, pagination?: PaginationOptions): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'filter_properties');
    queryParams.append('owner_id', ownerId.toString());
    queryParams.append('list', list);

    // Map filter options to API parameters
    if (filters.city) queryParams.append('city', filters.city);
    if (filters.area) queryParams.append('area', filters.area);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.description) queryParams.append('description', filters.description);
    if (filters.note_private) queryParams.append('note_private', filters.note_private);
    if (filters.size_unit) queryParams.append('size_unit', filters.size_unit);
    if (filters.location) queryParams.append('location', filters.location);
    if (filters.location_accuracy) queryParams.append('location_accuracy', filters.location_accuracy);
    if (filters.tags) queryParams.append('tags', filters.tags);
    if (filters.highlights) queryParams.append('highlights', filters.highlights);
    
    // Map price filters (API expects price_min/price_max)
    if (filters.min_price !== undefined) queryParams.append('price_min', filters.min_price.toString());
    if (filters.max_price !== undefined) queryParams.append('price_max', filters.max_price.toString());
    
    // Map size filters (API expects size_min/max_size)
    if (filters.size_min !== undefined) queryParams.append('size_min', filters.size_min.toString());
    if (filters.max_size !== undefined) queryParams.append('max_size', filters.max_size.toString());

    // Add pagination parameters
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('per_page', pagination.per_page.toString());
    }

    const url = `${API_BASE_URL}?${queryParams.toString()}`;
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

  async searchProperties(ownerId: number, list: 'mine' | 'others' | 'both', query: string, column?: string, pagination?: PaginationOptions): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'search_properties');
    queryParams.append('owner_id', ownerId.toString());
    queryParams.append('list', list);
    queryParams.append('query', query);

    // Map column values to API expectations
    let columnValue = 'All';
    if (column) {
      if (column === '') {
        columnValue = 'All';
      } else if (column === 'general') {
        columnValue = 'All General';
      } else {
        // Use the column value directly as it should match API column names
        columnValue = column;
      }
    }
    queryParams.append('column', columnValue);

    // Add pagination parameters
    if (pagination?.page !== undefined) {
      queryParams.append('page', pagination.page.toString());
    }
    if (pagination?.per_page !== undefined) {
      queryParams.append('per_page', pagination.per_page.toString());
    }

    const url = `${API_BASE_URL}?${queryParams.toString()}`;
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

  async getPropertyById(propertyId: number, ownerId?: number): Promise<Property | null> {
    // Check if there's already a pending request for this property
    if (requestCache.has(propertyId)) {
      console.log('Reusing existing request for property:', propertyId);
      return requestCache.get(propertyId)!;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        // Use the public endpoint that doesn't require authentication
        // This is the most efficient approach - single API request
        const publicUrl = `${API_BASE_URL}?action=get_one_property&property_id=${propertyId}`;
        console.log('Making single API request to:', publicUrl);
        const publicResponse = await axios.get(publicUrl, {
          withCredentials: true,
          // No auth headers needed for this endpoint
        });
        
        console.log('API response received:', publicResponse.status);
        
        // Handle new response format with meta and data fields
        let properties: any[] = [];
        if (publicResponse.data && typeof publicResponse.data === 'object' && 'data' in publicResponse.data && Array.isArray(publicResponse.data.data)) {
          properties = publicResponse.data.data;
        } 
        // Handle old format (direct array) for backward compatibility
        else if (publicResponse.data && Array.isArray(publicResponse.data)) {
          properties = publicResponse.data;
        }
        
        // The endpoint returns an array with a single property (or data array with one property)
        if (properties.length > 0) {
          const property = properties[0];
          // Only return if property is public
          if (property.is_public === 1) {
            return normalizeProperty(property);
          }
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
