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
  landmark_location_distance?: string;
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
  landmark_location_distance?: string;
  is_public: number;
  tags?: string;
  highlights?: string;
  public_rating?: number;
  my_rating?: number;
}

export interface FilterOptions {
  city?: string;
  area?: string;
  type?: string;
  min_price?: number;
  max_price?: number;
  size_min?: number;
  max_size?: number;
  size_unit?: string;
  description?: string;
  note_private?: string;
  location?: string;
  location_accuracy?: string;
  tags?: string;
  highlights?: string;
  is_public?: number;
}
