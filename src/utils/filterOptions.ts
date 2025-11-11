/**
 * Storage keys used for persisting filter and search state in localStorage
 */
export const STORAGE_KEYS = {
  SEARCH_QUERY: 'propnetwork_search_query',
  SEARCH_COLUMN: 'propnetwork_search_column',
  FILTERS: 'propnetwork_filters',
  SELECTED_AREA: 'propnetwork_selected_area',
  ACTIVE_FILTER: 'propnetwork_active_filter',
} as const;

/**
 * Search column options for filtering search queries
 * Values map to API column names: All, All General, or specific column names
 */
export const SEARCH_COLUMNS = [
  { value: '', label: 'All Info' }, // Maps to 'All' in API
  { value: 'general', label: 'All General' }, // Maps to 'All General' in API
  { value: 'id', label: 'ID' },
  { value: 'city', label: 'City' },
  { value: 'area', label: 'Area' },
  { value: 'type', label: 'Property Type' },
  { value: 'description', label: 'Description' },
  { value: 'heading', label: 'Heading' },
  { value: 'size_min', label: 'Min Size' },
  { value: 'size_max', label: 'Max Size' },
  { value: 'size_unit', label: 'Size Unit' },
  { value: 'price_min', label: 'Min Price' },
  { value: 'price_max', label: 'Max Price' },
  { value: 'tags', label: 'Tags' },
  { value: 'highlights', label: 'Highlights' },
  { value: 'note_private', label: 'Private Note' },
] as const;

/**
 * Storage key for search column usage tracking
 */
const COLUMN_USAGE_STORAGE_KEY = 'propnetwork_column_usage';

/**
 * Get column usage counts from localStorage
 */
export function getColumnUsage(): Record<string, number> {
  try {
    const usage = localStorage.getItem(COLUMN_USAGE_STORAGE_KEY);
    return usage ? JSON.parse(usage) : {};
  } catch {
    return {};
  }
}

/**
 * Track column usage - increment usage count for a column
 */
export function trackColumnUsage(columnValue: string): void {
  try {
    const usage = getColumnUsage();
    const key = columnValue || 'all'; // Use 'all' for empty string
    usage[key] = (usage[key] || 0) + 1;
    localStorage.setItem(COLUMN_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.error('Failed to track column usage:', error);
  }
}

/**
 * Get search columns sorted by usage (most used first)
 */
export function getSearchColumnsSortedByUsage(): Array<{ value: string; label: string }> {
  const usage = getColumnUsage();
  
  // Sort columns by usage count (descending), then by original order
  return [...SEARCH_COLUMNS].sort((a, b) => {
    const aKey = a.value || 'all';
    const bKey = b.value || 'all';
    const aUsage = usage[aKey] || 0;
    const bUsage = usage[bKey] || 0;
    
    // If usage is the same, maintain original order (All Info and All General first)
    if (aUsage === bUsage) {
      // Keep 'All Info' and 'All General' at the top
      if (a.value === '') return -1;
      if (b.value === '') return 1;
      if (a.value === 'general') return -1;
      if (b.value === 'general') return 1;
      return 0;
    }
    
    // Sort by usage (most used first)
    return bUsage - aUsage;
  });
}

/**
 * Available city options
 */
export const CITY_OPTIONS = [
  'Panipat',
  'Karnal',
  'Sonipat',
] as const;

/**
 * City options with labels (for dropdowns)
 */
export const CITY_OPTIONS_WITH_LABELS = [
  { value: 'Panipat', label: 'Panipat' },
  { value: 'Karnal', label: 'Karnal' },
  { value: 'Sonipat', label: 'Sonipat' },
] as const;

/**
 * Available area options (primarily for Panipat city)
 */
export const AREA_OPTIONS = [
  'Sector 6',
  'Sector 7',
  'Sector 8',
  'Sector 11',
  'Sector 12',
  'Sector 18',
  'Sector 24',
  'Sector 25',
  'TDI City',
  'Ansal',
  'M3M',
  'Vrinda Enclave',
  'Yamuna Enclave',
  'Eldeco Estate One',
  'Eldeco Paradiso',
  'DLF',
  'Maxwell Ceremony',
  'Tehsil Camp',
  'Patel Nagar',
  'Preet Vihar',
  'Modal Town',
  'Virat Nagar Phase 1',
  'Virat Nagar Phase 2',
  'Virat Nagar Phase 3',
  'Virak Nagar',
  'Ram Nagar',
  'Mukhija',
  'New Mukhija',
  'Raj Nagar',
  'The Address',
  'PBM Enclave',
  'Malik Enclave',
  'Jeetram Nagar',
  'Bagat Sing Colony',
  'Vasant Kunj',
  '8 Marla',
  'Radhe Vihar',
  'Shanti Nagar',
] as const;

/**
 * Available property type options
 */
export const PROPERTY_TYPES = [
  'Residential Plot',
  'Residential House',
  'Independent Floor',
  'Flat/Apartment',
  'Commercial Plot',
  'Shop',
  'Showroom',
  'Commercial Builtup',
  'SCO Plot',
  'SCO Builtup',
  'Industrial Land',
  'Factory',
  'Warehouse',
  'Agriculture Land',
  'Ploting Land',
  'Labour Quarter',
  'Other',
] as const;

/**
 * Property type options with labels (for dropdowns)
 */
export const PROPERTY_TYPE_OPTIONS = [
  { value: 'Residential Plot', label: 'Residential Plot' },
  { value: 'Residential House', label: 'Residential House' },
  { value: 'Independent Floor', label: 'Independent Floor' },
  { value: 'Flat/Apartment', label: 'Flat/Apartment' },
  { value: 'Commercial Plot', label: 'Commercial Plot' },
  { value: 'Shop', label: 'Shop' },
  { value: 'Showroom', label: 'Showroom' },
  { value: 'Commercial Builtup', label: 'Commercial Builtup' },
  { value: 'SCO Plot', label: 'SCO Plot' },
  { value: 'SCO Builtup', label: 'SCO Builtup' },
  { value: 'Industrial Land', label: 'Industrial Land' },
  { value: 'Factory', label: 'Factory' },
  { value: 'Warehouse', label: 'Warehouse' },
  { value: 'Agriculture Land', label: 'Agriculture Land' },
  { value: 'Ploting Land', label: 'Ploting Land' },
  { value: 'Labour Quarter', label: 'Labour Quarter' },
  { value: 'Other', label: 'Other' },
] as const;

/**
 * Available size unit options
 */
export const SIZE_UNITS = ['Gaj', 'Sqft', 'Marla', 'Kanal', 'Acre'] as const;

/**
 * Size unit options with labels (for dropdowns)
 */
export const SIZE_UNIT_OPTIONS = [
  { value: 'Gaj', label: 'Gaj' },
  { value: 'Sqft', label: 'Sq. Ft' },
  { value: 'Marla', label: 'Marla' },
  { value: 'Kanal', label: 'Kanal' },
  { value: 'Acre', label: 'Acre' },
] as const;

/**
 * Available highlight options for properties
 */
export const HIGHLIGHT_OPTIONS = [
  'Corner',
  'Urgent Sale',
  'On 12 Meter',
  'On 18 Meter',
  'On 24 Meter',
  'On Wide Road',
  'Prime Location',
  'Two Side Open',
  'Park Facing',
  'East Facing',
  'South Facing',
  '3 Side Open',
  'Gated Society',
  'Good Connectivity',
  'Multipurpose',
  'Green Belt',
  'Extra Space',
  'Luxury Builtup',
  'Very Less Price',
  'Great Investment',
] as const;

/**
 * Available tag options for properties
 */
export const TAG_OPTIONS = [
  'Indirect',
  'On Priority',
  'High Demand',
  'Focus',
  'Pending Work',
  'List 1',
  'List 2',
] as const;

