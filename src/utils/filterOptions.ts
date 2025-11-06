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
 */
export const SEARCH_COLUMNS = [
  { value: '', label: 'All Info' },
  { value: 'general', label: 'All General' },
  { value: 'area', label: 'Area' },
  { value: 'heading', label: 'Heading' },
  { value: 'description', label: 'Description' },
  { value: 'size', label: 'Size' },
  { value: 'price', label: 'Price' },
  { value: 'highlights', label: 'Highlight' },
  { value: 'tags', label: 'Tags' },
  { value: 'note_private', label: 'Private info' },
  { value: 'city', label: 'City' },
  { value: 'type', label: 'Property type' },
] as const;

/**
 * Available city options
 */
export const CITY_OPTIONS = [
  'Panipat',
  'Delhi',
  'Gurgaon',
  'Noida',
  'Faridabad',
] as const;

/**
 * City options with labels (for dropdowns)
 */
export const CITY_OPTIONS_WITH_LABELS = [
  { value: 'Panipat', label: 'Panipat' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Gurgaon', label: 'Gurgaon' },
  { value: 'Noida', label: 'Noida' },
  { value: 'Faridabad', label: 'Faridabad' },
] as const;

/**
 * Available area options
 */
export const AREA_OPTIONS = [
  'Sector 1',
  'Sector 2',
  'Sector 3',
  'Sector 4',
  'Sector 5',
  'Sector 6',
  'Sector 7',
  'Sector 8',
  'Sector 9',
  'Sector 10',
  'Sector 12',
  'Sector 13',
  'Sector 14',
  'Sector 15',
  'Sector 16',
  'Sector 17',
  'Sector 18',
  'Sector 19',
  'Sector 20',
  'Sector 21',
  'Sector 22',
  'Sector 23',
  'Sector 24',
  'Sector 25',
  'Model Town',
  'Civil Lines',
  'GT Road',
  'Huda Sector',
  'Industrial Area',
] as const;

/**
 * Available property type options
 */
export const PROPERTY_TYPES = [
  'Residential Plot',
  'Commercial Plot',
  'House',
  'Apartment',
  'Agriculture Land',
  'Industrial Plot',
] as const;

/**
 * Property type options with labels (for dropdowns)
 */
export const PROPERTY_TYPE_OPTIONS = [
  { value: 'Residential Plot', label: 'Residential Plot' },
  { value: 'Commercial Plot', label: 'Commercial Plot' },
  { value: 'House', label: 'House' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Agriculture Land', label: 'Agriculture Land' },
  { value: 'Industrial Plot', label: 'Industrial Plot' },
] as const;

/**
 * Available size unit options
 */
export const SIZE_UNITS = ['Sqyd', 'Sqft', 'Acre', 'Marla', 'Kanal'] as const;

/**
 * Size unit options with labels (for dropdowns)
 */
export const SIZE_UNIT_OPTIONS = [
  { value: 'Sqyd', label: 'Sq. Yard' },
  { value: 'Sqft', label: 'Sq. Ft' },
  { value: 'Acre', label: 'Acre' },
  { value: 'Marla', label: 'Marla' },
  { value: 'Kanal', label: 'Kanal' },
] as const;

