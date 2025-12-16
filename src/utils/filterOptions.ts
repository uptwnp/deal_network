/**
 * Storage keys used for persisting filter and search state in localStorage
 */
export const STORAGE_KEYS = {
  SEARCH_QUERY: "propnetwork_search_query",
  SEARCH_COLUMN: "propnetwork_search_column",
  FILTERS: "propnetwork_filters",
  SELECTED_AREA: "propnetwork_selected_area",
  ACTIVE_FILTER: "propnetwork_active_filter",
  RECENT_AREAS: "propnetwork_recent_areas",
} as const;

/**
 * Search column options for filtering search queries
 * Values map to API column names: All, All General, or specific column names
 */
export const SEARCH_COLUMNS = [
  { value: "all", label: "Everything" }, // Maps to 'All' in API
  { value: "general", label: "General" }, // Maps to 'All General' in API
  { value: "area", label: "Area" },

  { value: "description", label: "Description" },
  { value: "heading", label: "Heading" },

  { value: "note_private", label: "Private Note" },

  { value: "id", label: "ID" },
  { value: "city", label: "City" },
  { value: "type", label: "Property Type" },
  { value: "size", label: "Size" },
  { value: "price", label: "Price" },
  { value: "tags", label: "Tags" },
  { value: "highlights", label: "Highlights" },
] as const;

/**
 * Storage key for search column usage tracking
 */
const COLUMN_USAGE_STORAGE_KEY = "propnetwork_column_usage";

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
    const key = columnValue || "all"; // Use 'all' for empty string
    usage[key] = (usage[key] || 0) + 1;
    localStorage.setItem(COLUMN_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.error("Failed to track column usage:", error);
  }
}

/**
 * Get search columns sorted by usage (most used first)
 */
export function getSearchColumnsSortedByUsage(): Array<{
  value: string;
  label: string;
}> {
  const usage = getColumnUsage();

  // Sort columns by usage count (descending), then by original order
  return [...SEARCH_COLUMNS].sort((a, b) => {
    const aKey = a.value || "all";
    const bKey = b.value || "all";
    const aUsage = usage[aKey] || 0;
    const bUsage = usage[bKey] || 0;

    // If usage is the same, maintain original order (All Info and All General first)
    if (aUsage === bUsage) {
      // Keep 'All Info' and 'All General' at the top
      if (a.value === "all") return -1;
      if (b.value === "all") return 1;
      if (a.value === "general") return -1;
      if (b.value === "general") return 1;
      return 0;
    }

    // Sort by usage (most used first)
    return bUsage - aUsage;
  });
}

/**
 * Available property type options
 */
export const PROPERTY_TYPES = [
  "Residential Plot",
  "Residential House",
  "Independent Floor",
  "Flat/Apartment",
  "Commercial Plot",
  "Shop",
  "Showroom",
  "Commercial Builtup",
  "SCO Plot",
  "SCO Builtup",
  "Industrial Land",
  "Factory",
  "Warehouse",
  "Agriculture Land",
  "Farm House",
  "Ploting Land",
  "Labour Quarter",
  "Other",
] as const;

/**
 * Property type options with labels (for dropdowns)
 */
export const PROPERTY_TYPE_OPTIONS = [
  { value: "Residential Plot", label: "Residential Plot" },
  { value: "Residential House", label: "Residential House" },
  { value: "Independent Floor", label: "Independent Floor" },
  { value: "Flat/Apartment", label: "Flat/Apartment" },
  { value: "Commercial Plot", label: "Commercial Plot" },
  { value: "Shop", label: "Shop" },
  { value: "Showroom", label: "Showroom" },
  { value: "Commercial Builtup", label: "Commercial Builtup" },
  { value: "SCO Plot", label: "SCO Plot" },
  { value: "SCO Builtup", label: "SCO Builtup" },
  { value: "Industrial Land", label: "Industrial Land" },
  { value: "Factory", label: "Factory" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "Agriculture Land", label: "Agriculture Land" },
  { value: "Farm House", label: "Farm House" },
  { value: "Ploting Land", label: "Ploting Land" },
  { value: "Labour Quarter", label: "Labour Quarter" },
  { value: "Other", label: "Other" },
] as const;

/**
 * Available size unit options
 */
export const SIZE_UNITS = ["Gaj", "Sqft", "Marla", "Kanal", "Acre"] as const;

/**
 * Size unit options with labels (for dropdowns)
 */
export const SIZE_UNIT_OPTIONS = [
  { value: "Gaj", label: "Gaj" },
  { value: "Sqft", label: "Sq. Ft" },
  { value: "Marla", label: "Marla" },
  { value: "Kanal", label: "Kanal" },
  { value: "Acre", label: "Acre" },
] as const;

/**
 * Dynamic options cache - stores fetched options to avoid repeated API calls
 */
let cachedHighlights: string[] | null = null;
let cachedTags: string[] | null = null;
let cachedCities: string[] | null = null;
let cachedCityOptionsWithLabels: Array<{
  value: string;
  label: string;
}> | null = null;

/**
 * Get dynamic city options from API
 */
export async function getCityOptions(): Promise<string[]> {
  // Return cached options if available
  if (cachedCities !== null) {
    return cachedCities;
  }

  try {
    // Import dynamically to avoid circular dependencies
    const { getCities } = await import("./areaCityApi");
    const cities = await getCities();
    if (cities && cities.length > 0) {
      cachedCities = cities;
      return cities;
    }
  } catch (error) {
    console.error("Failed to fetch cities from API:", error);
  }

  // Return empty array if API fails (no fallback)
  return [];
}

/**
 * Get city options with labels from API (for dropdowns)
 */
export async function getCityOptionsWithLabels(): Promise<
  Array<{ value: string; label: string }>
> {
  // Return cached options if available
  if (cachedCityOptionsWithLabels !== null) {
    return cachedCityOptionsWithLabels;
  }

  try {
    const cities = await getCityOptions();
    if (cities && cities.length > 0) {
      const options = cities.map((city) => ({ value: city, label: city }));
      cachedCityOptionsWithLabels = options;
      return options;
    }
  } catch (error) {
    console.error("Failed to fetch city options with labels:", error);
  }

  // Return empty array if API fails (no fallback)
  return [];
}

/**
 * Get dynamic highlight options from API
 */
export async function getHighlightOptions(): Promise<string[]> {
  // Return cached options if available
  if (cachedHighlights !== null) {
    return cachedHighlights;
  }

  try {
    // Import dynamically to avoid circular dependencies
    const { getHighlights } = await import("./areaCityApi");
    const highlights = await getHighlights();
    if (highlights && highlights.length > 0) {
      cachedHighlights = highlights;
      return highlights;
    }
  } catch (error) {
    console.error("Failed to fetch highlights from API:", error);
  }

  // Return empty array if API fails (no fallback)
  return [];
}

/**
 * Get dynamic tag options from API
 */
export async function getTagOptions(): Promise<string[]> {
  // Return cached options if available
  if (cachedTags !== null) {
    return cachedTags;
  }

  try {
    // Import dynamically to avoid circular dependencies
    const { getTags } = await import("./areaCityApi");
    const tags = await getTags();
    if (tags && tags.length > 0) {
      cachedTags = tags;
      return tags;
    }
  } catch (error) {
    console.error("Failed to fetch tags from API:", error);
  }

  // Return empty array if API fails (no fallback)
  return [];
}

/**
 * Clear the options cache (useful when refreshing data)
 */
export function clearOptionsCache(): void {
  cachedHighlights = null;
  cachedTags = null;
  cachedCities = null;
  cachedCityOptionsWithLabels = null;
}
