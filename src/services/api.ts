import axios from 'axios';
import { Property, PropertyFormData, FilterOptions } from '../types/property';

const API_BASE_URL = 'https://prop.digiheadway.in/api/network.php';

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

function normalizeProperties(data: any[]): Property[] {
  return data.map(normalizeProperty);
}

export const propertyApi = {
  async getUserProperties(ownerId: number): Promise<Property[]> {
    const response = await axios.get(API_BASE_URL, {
      params: {
        action: 'get_user_properties',
        owner_id: ownerId,
      },
    });
    return normalizeProperties(response.data);
  },

  async getPublicProperties(ownerId: number): Promise<Property[]> {
    const response = await axios.get(API_BASE_URL, {
      params: {
        action: 'get_public_properties',
        owner_id: ownerId,
      },
    });
    return normalizeProperties(response.data);
  },

  async getAllProperties(ownerId: number): Promise<Property[]> {
    const response = await axios.get(API_BASE_URL, {
      params: {
        action: 'get_all_properties',
        owner_id: ownerId,
      },
    });
    return normalizeProperties(response.data);
  },

  async addProperty(ownerId: number, data: PropertyFormData): Promise<{ success: boolean; id: number }> {
    const response = await axios.post(
      `${API_BASE_URL}?action=add_property`,
      {
        owner_id: ownerId,
        ...data,
      }
    );
    return response.data;
  },

  async updateProperty(id: number, ownerId: number, data: Partial<PropertyFormData>): Promise<{ success: boolean }> {
    const response = await axios.post(
      `${API_BASE_URL}?action=update_property`,
      {
        id,
        owner_id: ownerId,
        ...data,
      }
    );
    return response.data;
  },

  async deleteProperty(id: number, ownerId: number): Promise<{ success: boolean }> {
    const response = await axios.get(API_BASE_URL, {
      params: {
        action: 'delete_property',
        id,
        owner_id: ownerId,
      },
    });
    return response.data;
  },

  async filterProperties(ownerId: number, list: 'mine' | 'public' | 'both', filters: FilterOptions): Promise<Property[]> {
    const params: any = {
      action: 'filter_properties',
      owner_id: ownerId,
      list,
    };

    // Map filter options to API parameters
    if (filters.city) params.city = filters.city;
    if (filters.area) params.area = filters.area;
    if (filters.type) params.type = filters.type;
    if (filters.description) params.description = filters.description;
    if (filters.note_private) params.note_private = filters.note_private;
    if (filters.size_unit) params.size_unit = filters.size_unit;
    if (filters.location) params.location = filters.location;
    if (filters.location_accuracy) params.location_accuracy = filters.location_accuracy;
    if (filters.tags) params.tags = filters.tags;
    if (filters.highlights) params.highlights = filters.highlights;
    
    // Map price filters (API expects price_min/price_max)
    if (filters.min_price !== undefined) params.price_min = filters.min_price;
    if (filters.max_price !== undefined) params.price_max = filters.max_price;
    
    // Map size filters (API expects min_size/max_size)
    if (filters.min_size !== undefined) params.min_size = filters.min_size;
    if (filters.max_size !== undefined) params.max_size = filters.max_size;

    const response = await axios.get(API_BASE_URL, { params });
    return normalizeProperties(response.data);
  },

  async searchProperties(ownerId: number, list: 'mine' | 'public' | 'both', query: string, column?: string): Promise<Property[]> {
    const params: any = {
      action: 'search_properties',
      owner_id: ownerId,
      list,
      query,
    };

    // Map column values to API expectations
    if (column) {
      if (column === '') {
        params.column = 'All';
      } else if (column === 'general') {
        params.column = 'All General';
      } else {
        // Use the column value directly as it should match API column names
        params.column = column;
      }
    } else {
      params.column = 'All';
    }

    const response = await axios.get(API_BASE_URL, { params });
    return normalizeProperties(response.data);
  },
};
