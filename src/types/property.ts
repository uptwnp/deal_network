export interface Property {
  id: number;
  owner_id: number;
  city: string;
  area: string;
  type: string;
  description: string;
  note_private?: string;
  size_min: number;
  size_max: number;
  size_unit: string;
  price_min: number;
  price_max: number;
  location: string;
  location_accuracy?: string;
  landmark_location?: string;
  landmark_location_distance?: number | string; // API returns number, but accepts string when updating
  is_public: number;
  public_rating?: number;
  my_rating?: number;
  created_on: string;
  updated_on?: string;
  tags?: string;
  highlights?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_firm_name?: string;
  is_favourite?: number;
  user_note?: string;
}

export interface PropertyFormData {
  city: string;
  area: string;
  type: string;
  description: string;
  note_private?: string;
  size_min: number;
  size_max: number;
  size_unit: string;
  price_min: number;
  price_max: number;
  location: string;
  location_accuracy?: string;
  landmark_location?: string;
  landmark_location_distance?: string; // Sent as string when updating
  is_public: number;
  tags?: string;
  highlights?: string;
  public_rating?: number;
  my_rating?: number;
}

export interface FilterOptions {
  city?: string;
  area?: string;
  type?: string | string[]; // Single or multiple property types
  min_price?: number;
  max_price?: number;
  size_min?: number;
  max_size?: number;
  size_unit?: string; // Size unit for size range filter
  filter_size_unit?: string; // Filter by specific size unit (separate from size_unit)
  description?: string;
  note_private?: string;
  location?: string;
  location_accuracy?: string;
  tags?: string | string[]; // Single or multiple tags
  highlights?: string | string[]; // Single or multiple highlights
  is_public?: number;
  has_location?: boolean; // Filter for properties with/without location (fetch.php supports this)
  has_landmark?: boolean; // Filter for properties with/without landmark (fetch.php supports this)
  sortby?: 'id' | 'price' | 'size' | 'updated_on' | 'created_on'; // Sort by field
  order?: 'ASC' | 'DESC'; // Sort order
}
