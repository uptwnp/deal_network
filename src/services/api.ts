import { supabase } from './supabase';
import { Property, PropertyFormData, FilterOptions } from '../types/property';

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


interface SupabaseProperty {
  id: number | string;
  owner_id: number | string;
  city: string;
  area: string;
  type: string;
  description: string;
  note_private?: string;
  size_min?: number;
  size_max?: number;
  size_unit?: string;
  price_min?: number;
  price_max?: number;
  location?: string;
  is_public?: boolean;
  public_rating?: number;
  my_rating?: number;
  tags?: string;
  highlights?: string;
  image_urls?: string;
  is_photos_public?: boolean;
  created_on: string;
  updated_on: string;
  location_accuracy?: string;
  landmark_location?: string;
  landmark_location_distance?: number;
  owner?: {
    name: string;
    phone: string;
    firm_name?: string;
  };
  owner_name?: string;
  owner_phone?: string;
  owner_firm_name?: string;
  favorites?: {
    user_id: number;
    is_favourite: boolean;
    user_note?: string;
  }[];
}

function validateOwnerId(ownerId: number): void {
  if (!ownerId || ownerId <= 0 || isNaN(ownerId)) {
    throw new Error('Invalid owner_id: owner_id must be a positive number');
  }
}

// Convert Supabase joined data to frontend Property object
function normalizeProperty(data: SupabaseProperty, viewerId: number): Property {
  const ownerIdNum = Number(data.owner_id);
  const isOwned = ownerIdNum === viewerId;

  // Extract owner details from the joined table
  const ownerName = data.owner?.name || data.owner_name || '';
  const ownerPhone = data.owner?.phone || data.owner_phone || '';
  const ownerFirmName = data.owner?.firm_name || data.owner_firm_name || '';

  // Extract favorites details if present (only for the current logged-in user / viewer)
  let isFavourite = 0;
  let userNote = '';
  
  if (data.favorites && data.favorites.length > 0) {
    // Search strictly for the current viewer's favorite record
    const fav = data.favorites.find((f) => f.user_id === viewerId);
    if (fav) {
      isFavourite = fav.is_favourite ? 1 : 0;
      if (fav.user_note) {
        userNote = fav.user_note;
      }
    }
  }

  return {
    id: Number(data.id),
    owner_id: ownerIdNum,
    city: data.city,
    area: data.area,
    type: data.type,
    description: data.description || '',
    // Only expose private notes to the actual owner
    note_private: isOwned ? data.note_private : undefined,
    size_min: Number(data.size_min || 0),
    size_max: Number(data.size_max || 0),
    size_unit: data.size_unit || 'Gaj',
    price_min: Number(data.price_min || 0),
    price_max: Number(data.price_max || 0),
    location: data.location || '',
    location_accuracy: data.location_accuracy,
    is_public: data.is_public ? 1 : 0,
    public_rating: data.public_rating ? Number(data.public_rating) : undefined,
    my_rating: data.my_rating ? Number(data.my_rating) : undefined,
    tags: data.tags,
    highlights: data.highlights,
    created_on: data.created_on,
    updated_on: data.updated_on,
    landmark_location: data.landmark_location,
    landmark_location_distance: data.landmark_location_distance,
    owner_name: ownerName,
    owner_phone: ownerPhone,
    owner_firm_name: ownerFirmName,
    is_favourite: isFavourite,
    user_note: userNote,
    image_urls: data.image_urls,
    is_photos_public: data.is_photos_public,
  };
}

// Map the pagination params correctly
function createPaginationMeta(count: number | null, limit: number, page: number, actualResults: number): PaginationMeta {
  const total = count || 0;
  return {
    page,
    per_page: limit,
    total,
    total_pages: Math.ceil(total / limit) || 1,
    page_results: actualResults
  };
}

// Append filters to a Supabase query builder
function applyFilters<T>(query: T, filters: FilterOptions): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (filters.city) q = q.eq('city', filters.city);
  if (filters.area) q = q.eq('area', filters.area);

  if (filters.type) {
    if (Array.isArray(filters.type)) {
      if (filters.type.length > 0) q = q.in('type', filters.type);
    } else {
      q = q.eq('type', filters.type);
    }
  }

  if (filters.tags) {
    const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    if (tagsArray.length > 0) {
      q = q.or(tagsArray.map(t => `tags.ilike.%${t}%`).join(','));
    }
  }

  if (filters.highlights) {
    const hlArray = Array.isArray(filters.highlights) ? filters.highlights : [filters.highlights];
    if (hlArray.length > 0) {
      q = q.or(hlArray.map(h => `highlights.ilike.%${h}%`).join(','));
    }
  }

  const DEFAULT_MIN_PRICE = 0;
  const DEFAULT_MAX_PRICE = 500;
  if (filters.min_price !== undefined && filters.min_price !== DEFAULT_MIN_PRICE) q = q.gte('price_min', filters.min_price);
  if (filters.max_price !== undefined && filters.max_price !== DEFAULT_MAX_PRICE) q = q.lte('price_max', filters.max_price);

  const DEFAULT_MIN_SIZE = 0;
  const DEFAULT_MAX_SIZE = 10000;
  if (filters.size_min !== undefined && filters.size_min !== DEFAULT_MIN_SIZE) q = q.gte('size_min', filters.size_min);
  if (filters.max_size !== undefined && filters.max_size !== DEFAULT_MAX_SIZE) q = q.lte('size_max', filters.max_size);

  if (filters.size_unit) q = q.eq('size_unit', filters.size_unit);
  if (filters.filter_size_unit) q = q.eq('size_unit', filters.filter_size_unit);

  if (filters.has_location !== undefined) {
    if (filters.has_location) q = q.not('location', 'is', null);
    else q = q.is('location', null);
  }

  if (filters.has_landmark !== undefined) {
    if (filters.has_landmark) q = q.not('landmark_location', 'is', null);
    else q = q.is('landmark_location', null);
  }

  if (filters.is_public !== undefined) {
    q = q.eq('is_public', filters.is_public ? true : false);
  }

  // Sorting
  if (filters.sortby) {
    const isAsc = filters.order === 'ASC';
    if (filters.sortby === 'price') {
      q = q.order('price_min', { ascending: isAsc });
    } else if (filters.sortby === 'size') {
      q = q.order('size_min', { ascending: isAsc });
    } else {
      q = q.order('created_on', { ascending: isAsc });
    }
  } else {
      q = q.order('created_on', { ascending: false });
  }

  return q as T;
}

const selectColumns = `
  *,
  owner:network_users!inner(name, phone, firm_name)
`;

export const propertyApi = {
  async getUserProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const page = pagination?.page || 1;
    const limit = pagination?.per_page || 40;
    
    let query = supabase.from('network_properties').select(`${selectColumns}, favorites:network_favorites(user_id, is_favourite, user_note)`, { count: 'exact' });
    query = query.eq('owner_id', ownerId);

    if (forMap) query = query.not('location', 'is', null);

    query = query.order('created_on', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const properties = (data || []).map((p: SupabaseProperty) => normalizeProperty(p, ownerId));
    return { data: properties, meta: createPaginationMeta(count, limit, page, properties.length) };
  },

  async getPublicProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const page = pagination?.page || 1;
    const limit = pagination?.per_page || 40;
    
    let query = supabase.from('network_properties').select(`${selectColumns}, favorites:network_favorites(user_id, is_favourite, user_note)`, { count: 'exact' });
    query = query.eq('is_public', true).neq('owner_id', ownerId);

    if (forMap) query = query.not('location', 'is', null);

    query = query.order('created_on', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const properties = (data || []).map((p: SupabaseProperty) => normalizeProperty(p, ownerId));
    return { data: properties, meta: createPaginationMeta(count, limit, page, properties.length) };
  },

  async getAllProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const page = pagination?.page || 1;
    const limit = pagination?.per_page || 40;
    
    let query = supabase.from('network_properties').select(`${selectColumns}, favorites:network_favorites(user_id, is_favourite, user_note)`, { count: 'exact' });
    query = query.or(`owner_id.eq.${ownerId},is_public.eq.true`);

    if (forMap) query = query.not('location', 'is', null);

    query = query.order('created_on', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const properties = (data || []).map((p: SupabaseProperty) => normalizeProperty(p, ownerId));
    return { data: properties, meta: createPaginationMeta(count, limit, page, properties.length) };
  },

  async getSavedProperties(ownerId: number, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const page = pagination?.page || 1;
    const limit = pagination?.per_page || 40;
    
    let query = supabase.from('network_properties').select(`*, owner:network_users!inner(name, phone, firm_name), favorites:network_favorites!inner(user_id, is_favourite, user_note)`, { count: 'exact' });
    query = query.eq('favorites.user_id', ownerId).eq('favorites.is_favourite', true);

    if (forMap) query = query.not('location', 'is', null);

    query = query.order('created_on', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const properties = (data || []).map((p: SupabaseProperty) => normalizeProperty(p, ownerId));
    return { data: properties, meta: createPaginationMeta(count, limit, page, properties.length) };
  },

  async filterProperties(ownerId: number, list: 'mine' | 'others' | 'both' | 'saved', filters: FilterOptions, pagination?: PaginationOptions, forMap?: boolean): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const page = pagination?.page || 1;
    const limit = pagination?.per_page || 40;
    
    let query;
    if (list === 'saved') {
      query = supabase.from('network_properties').select(`*, owner:network_users!inner(name, phone, firm_name), favorites:network_favorites!inner(user_id, is_favourite, user_note)`, { count: 'exact' });
      query = query.eq('favorites.user_id', ownerId).eq('favorites.is_favourite', true);
    } else {
      query = supabase.from('network_properties').select(`${selectColumns}, favorites:network_favorites(user_id, is_favourite, user_note)`, { count: 'exact' });
      
      if (list === 'mine') {
        query = query.eq('owner_id', ownerId);
      } else if (list === 'others') {
        query = query.eq('is_public', true).neq('owner_id', ownerId);
      } else if (list === 'both') {
        query = query.or(`owner_id.eq.${ownerId},is_public.eq.true`);
      }
    }

    if (forMap) query = query.not('location', 'is', null);

    query = applyFilters(query, filters);
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const properties = (data || []).map((p: SupabaseProperty) => normalizeProperty(p, ownerId));
    return { data: properties, meta: createPaginationMeta(count, limit, page, properties.length) };
  },

  async searchProperties(ownerId: number, list: 'mine' | 'others' | 'both' | 'saved', queryStr: string, column?: string, pagination?: PaginationOptions, forMap?: boolean, filters?: FilterOptions): Promise<PaginatedResponse<Property>> {
    validateOwnerId(ownerId);
    const page = pagination?.page || 1;
    const limit = pagination?.per_page || 40;
    
    let query;
    if (list === 'saved') {
      query = supabase.from('network_properties').select(`*, owner:network_users!inner(name, phone, firm_name), favorites:network_favorites!inner(user_id, is_favourite, user_note)`, { count: 'exact' });
      query = query.eq('favorites.user_id', ownerId).eq('favorites.is_favourite', true);
    } else {
      query = supabase.from('network_properties').select(`${selectColumns}, favorites:network_favorites(user_id, is_favourite, user_note)`, { count: 'exact' });
      
      if (list === 'mine') {
        query = query.eq('owner_id', ownerId);
      } else if (list === 'others') {
        query = query.eq('is_public', true).neq('owner_id', ownerId);
      } else if (list === 'both') {
        query = query.or(`owner_id.eq.${ownerId},is_public.eq.true`);
      }
    }

    if (forMap) query = query.not('location', 'is', null);

    if (queryStr && queryStr.trim()) {
      const q = queryStr.trim();
      
      if (column === 'all') {
        // Everything Search: Search across all standard text columns
        let orConditions = `city.ilike.%${q}%,area.ilike.%${q}%,type.ilike.%${q}%,description.ilike.%${q}%,tags.ilike.%${q}%,highlights.ilike.%${q}%`;
        
        // If query is a valid number, also search numeric fields (ID, size, price)
        const numValue = Number(q);
        if (!isNaN(numValue)) {
          orConditions += `,id.eq.${numValue},size_min.eq.${numValue},size_max.eq.${numValue},price_min.eq.${numValue},price_max.eq.${numValue}`;
        }
        query = query.or(orConditions);
      } else if (column === 'general') {
        // General Search: Standard text search
        query = query.or(`city.ilike.%${q}%,area.ilike.%${q}%,type.ilike.%${q}%,description.ilike.%${q}%,tags.ilike.%${q}%,highlights.ilike.%${q}%`);
      } else if (column === 'heading') {
        // Heading Search: Search area, city, type, and size
        let orConditions = `area.ilike.%${q}%,city.ilike.%${q}%,type.ilike.%${q}%`;
        const numValue = Number(q);
        if (!isNaN(numValue)) {
          orConditions += `,size_min.eq.${numValue},size_max.eq.${numValue}`;
        }
        query = query.or(orConditions);
      } else if (column === 'id') {
        // ID Search: Must be a number. Exact match only.
        const numValue = Number(q);
        if (!isNaN(numValue)) {
          query = query.eq('id', numValue);
        } else {
          query = query.eq('id', -1); // Safe fallback to return no results if not a number
        }
      } else if (column === 'size') {
        // Size Search: Must be a number. Exact match on min/max size or match unit.
        const numValue = Number(q);
        if (!isNaN(numValue)) {
          query = query.or(`size_min.eq.${numValue},size_max.eq.${numValue}`);
        } else {
          query = query.ilike('size_unit', `%${q}%`);
        }
      } else if (column === 'price') {
        // Price Search: Must be a number. Exact match on min/max price.
        const numValue = Number(q);
        if (!isNaN(numValue)) {
          query = query.or(`price_min.eq.${numValue},price_max.eq.${numValue}`);
        } else {
          query = query.eq('id', -1); // Safe fallback if not a number
        }
      } else if (column === 'note_private') {
        // Private Note Search: Strict security boundary check.
        // Users can only search private notes for properties they actually own.
        if (list === 'mine') {
          query = query.ilike('note_private', `%${q}%`);
        } else if (list === 'both') {
          query = query.eq('owner_id', ownerId).ilike('note_private', `%${q}%`);
        } else {
          // If viewing others' or saved properties, private notes are not searchable by visitors.
          query = query.eq('id', -1); // Safe fallback to return no results
        }
      } else if (column) {
        // Any other standard column (e.g. area, description, city, type, tags, highlights)
        query = query.ilike(column, `%${q}%`);
      } else {
        // Default to General Search
        query = query.or(`city.ilike.%${q}%,area.ilike.%${q}%,type.ilike.%${q}%,description.ilike.%${q}%,tags.ilike.%${q}%,highlights.ilike.%${q}%`);
      }
    }

    if (filters) {
      query = applyFilters(query, filters);
    } else {
      query = query.order('created_on', { ascending: false });
    }
    
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const properties = (data || []).map((p: SupabaseProperty) => normalizeProperty(p, ownerId));
    return { data: properties, meta: createPaginationMeta(count, limit, page, properties.length) };
  },

  async addProperty(ownerId: number, data: PropertyFormData): Promise<{ success: boolean; id: number }> {
    validateOwnerId(ownerId);
    
    // Ensure numeric fields are appropriately parsed
    const size_min = data.size_min ? Number(data.size_min) : undefined;
    const size_max = data.size_max ? Number(data.size_max) : undefined;
    const price_min = data.price_min ? Number(data.price_min) : undefined;
    const price_max = data.price_max ? Number(data.price_max) : undefined;

    const payload: Record<string, any> = {
      owner_id: ownerId,
      city: data.city,
      area: data.area,
      type: data.type,
      description: data.description,
      note_private: data.note_private,
      size_min,
      size_max,
      size_unit: data.size_unit,
      price_min,
      price_max,
      location: data.location,
      location_accuracy: data.location_accuracy,
      is_public: !!data.is_public,
      tags: data.tags,
      highlights: data.highlights,
      public_rating: data.public_rating,
      my_rating: data.my_rating,
      image_urls: data.image_urls,
      landmark_location: data.landmark_location,
      landmark_location_distance: data.landmark_location_distance ? Number(data.landmark_location_distance) : undefined,
    };

    // Remove undefined fields
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data: insertedData, error } = await supabase.from('network_properties').insert([payload]).select('id').single();

    if (error) throw new Error(error.message);
    return { success: true, id: insertedData.id };
  },

  async updateProperty(id: number, ownerId: number, data: Partial<PropertyFormData>): Promise<{ success: boolean }> {
    validateOwnerId(ownerId);
    
    const updatePayload: Record<string, any> = {};
    if (data.city !== undefined) updatePayload.city = data.city;
    if (data.area !== undefined) updatePayload.area = data.area;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.note_private !== undefined) updatePayload.note_private = data.note_private;
    if (data.size_min !== undefined) updatePayload.size_min = data.size_min ? Number(data.size_min) : undefined;
    if (data.size_max !== undefined) updatePayload.size_max = data.size_max ? Number(data.size_max) : undefined;
    if (data.size_unit !== undefined) updatePayload.size_unit = data.size_unit;
    if (data.price_min !== undefined) updatePayload.price_min = data.price_min ? Number(data.price_min) : undefined;
    if (data.price_max !== undefined) updatePayload.price_max = data.price_max ? Number(data.price_max) : undefined;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.location_accuracy !== undefined) updatePayload.location_accuracy = data.location_accuracy;
    if (data.is_public !== undefined) updatePayload.is_public = !!data.is_public;
    if (data.tags !== undefined) updatePayload.tags = data.tags;
    if (data.highlights !== undefined) updatePayload.highlights = data.highlights;
    if (data.public_rating !== undefined) updatePayload.public_rating = data.public_rating;
    if (data.my_rating !== undefined) updatePayload.my_rating = data.my_rating;
    if (data.image_urls !== undefined) updatePayload.image_urls = data.image_urls;
    if (data.landmark_location !== undefined) updatePayload.landmark_location = data.landmark_location;
    if (data.landmark_location_distance !== undefined) updatePayload.landmark_location_distance = data.landmark_location_distance ? Number(data.landmark_location_distance) : null;
    
    // Remove undefined fields
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);
    
    const { error } = await supabase.from('network_properties')
      .update(updatePayload)
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  async deleteProperty(id: number, ownerId: number): Promise<{ success: boolean }> {
    validateOwnerId(ownerId);
    
    const { error } = await supabase.from('network_properties')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  async favProperty(ownerId: number, propertyId: number, isFavourite: number, userNote: string): Promise<{ success: boolean; message: string }> {
    validateOwnerId(ownerId);
    
    const { error } = await supabase.from('network_favorites').upsert({
      user_id: ownerId,
      property_id: propertyId,
      is_favourite: isFavourite === 1,
      user_note: userNote
    }, { onConflict: 'user_id,property_id' });

    if (error) throw new Error(error.message);
    return { success: true, message: 'Updated favorite' };
  },

  async getPropertyById(propertyId: number, ownerId?: number): Promise<Property | null> {
    const { data, error } = await supabase.from('network_properties')
      .select(`${selectColumns}, favorites:network_favorites(user_id, is_favourite, user_note)`)
      .eq('id', propertyId)
      .single();

    if (error || !data) return null;
    return normalizeProperty(data, ownerId || 0);
  },

  async uploadImage(file: File): Promise<string> {
    const { uploadToR2 } = await import('../utils/r2');
    return uploadToR2(file);
  }
};
