import axios from 'axios';
import { Property, PropertyFormData, FilterOptions } from '../types/property';
import { getStoredToken } from './authApi';

const API_BASE_URL = 'https://prop.digiheadway.in/api/network.php';

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
    min_size: Number(data.min_size),
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
    throw new Error(data.error || 'API error occurred');
  }
  // Ensure data is an array
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(normalizeProperty);
}

export const propertyApi = {
  async getUserProperties(ownerId: number): Promise<Property[]> {
    validateOwnerId(ownerId);
    const url = `${API_BASE_URL}?action=get_user_properties&owner_id=${ownerId}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true, // Include cookies for token
    });
    return normalizeProperties(response.data);
  },

  async getPublicProperties(ownerId: number): Promise<Property[]> {
    validateOwnerId(ownerId);
    const url = `${API_BASE_URL}?action=get_public_properties&owner_id=${ownerId}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    return normalizeProperties(response.data);
  },

  async getAllProperties(ownerId: number): Promise<Property[]> {
    validateOwnerId(ownerId);
    const url = `${API_BASE_URL}?action=get_all_properties&owner_id=${ownerId}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    return normalizeProperties(response.data);
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

  async filterProperties(ownerId: number, list: 'mine' | 'public' | 'both', filters: FilterOptions): Promise<Property[]> {
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
    
    // Map size filters (API expects min_size/max_size)
    if (filters.min_size !== undefined) queryParams.append('min_size', filters.min_size.toString());
    if (filters.max_size !== undefined) queryParams.append('max_size', filters.max_size.toString());

    const url = `${API_BASE_URL}?${queryParams.toString()}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    return normalizeProperties(response.data);
  },

  async searchProperties(ownerId: number, list: 'mine' | 'public' | 'both', query: string, column?: string): Promise<Property[]> {
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

    const url = `${API_BASE_URL}?${queryParams.toString()}`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      withCredentials: true,
    });
    return normalizeProperties(response.data);
  },
};
