import { supabase } from '../services/supabase';

const CACHE_KEY = 'propnetwork_area_city_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

let inFlightRequest: Promise<AreaCityResponse> | null = null;

export interface CityAreaData {
  city: string;
  areas: string[];
}

export interface AreaCityResponse {
  cities: CityAreaData[];
  highlights?: string[];
  tags?: string[];
}

interface CachedData {
  data: AreaCityResponse;
  timestamp: number;
}

function getCachedData(): AreaCityResponse | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedData = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
      return parsed.data;
    }
    
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedData(data: AreaCityResponse): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (error) {
    console.error('Failed to cache area/city data:', error);
  }
}

export function clearAreaCityCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    inFlightRequest = null;
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

async function fetchAreaCityData(): Promise<AreaCityResponse> {
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    try {
      // 1. Fetch Master Locations from area_locations (canonical list)
      const { data: locations, error: locationsError } = await supabase
        .from('area_locations')
        .select('city, area, property_count')
        .order('city', { ascending: true })
        .order('area', { ascending: true });
      
      if (locationsError) throw locationsError;

      // 2. Fetch Tags and Highlights from network_properties (derived list)
      // We only select the columns we need to keep the bundle small
      const { data: props, error: propsError } = await supabase
        .from('network_properties')
        .select('tags, highlights')
        .not('tags', 'is', null)
        .or('highlights.not.is.null');
      
      if (propsError) throw propsError;

      const citiesMap = new Map<string, Set<string>>();
      const allHighlights = new Set<string>();
      const allTags = new Set<string>();

      // Process locations
      (locations || []).forEach(item => {
        if (item.city && item.area) {
          if (!citiesMap.has(item.city)) citiesMap.set(item.city, new Set());
          citiesMap.get(item.city)!.add(item.area);
        }
      });

      // Process props for tags/highlights
      (props || []).forEach(item => {
        if (item.tags) {
          item.tags.split(',').forEach((t: string) => {
            const trimmed = t.trim();
            if (trimmed) allTags.add(trimmed);
          });
        }
        if (item.highlights) {
          item.highlights.split(',').forEach((h: string) => {
            const trimmed = h.trim();
            if (trimmed) allHighlights.add(trimmed);
          });
        }
      });

      const cities: CityAreaData[] = Array.from(citiesMap.entries()).map(([city, areasSet]) => ({
        city,
        areas: Array.from(areasSet).sort()
      })).sort((a, b) => a.city.localeCompare(b.city));

      // Fallback if db is completely empty for some reason to allow UI to function
      if (cities.length === 0) {
        cities.push({ city: 'Panipat', areas: ['Sector 25', 'Sector 13-17', 'Model Town'] });
      }

      return {
        cities,
        highlights: Array.from(allHighlights).sort(),
        tags: Array.from(allTags).sort()
      };
    } catch (error) {
      console.error('Failed to fetch area/city data:', error);
      throw error;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}

export async function getAreaCityData(forceRefresh = false): Promise<AreaCityResponse | null> {
  if (!forceRefresh) {
    const cached = getCachedData();
    if (cached) return cached;
  }

  try {
    const data = await fetchAreaCityData();
    setCachedData(data);
    return data;
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached).data;
    } catch {
      // Ignore
    }
    return null;
  }
}

export function fetchAreaCityDataInBackground(): void {
  if (getCachedData()) return;

  if (inFlightRequest) {
    inFlightRequest.then(setCachedData).catch(console.error);
    return;
  }

  fetchAreaCityData().then(setCachedData).catch(console.error);
}

export async function getCities(): Promise<string[]> {
  const data = await getAreaCityData();
  return data ? data.cities.map(c => c.city) : [];
}

export async function getAreasForCity(city: string): Promise<string[]> {
  const data = await getAreaCityData();
  if (!data) return [];
  const cityData = data.cities.find(c => c.city === city);
  return cityData ? cityData.areas : [];
}

export async function getAllAreas(): Promise<string[]> {
  const data = await getAreaCityData();
  if (!data) return [];
  const allAreas = data.cities.flatMap(city => city.areas);
  return Array.from(new Set(allAreas)).sort();
}

export async function getHighlights(): Promise<string[]> {
  const data = await getAreaCityData();
  return data?.highlights || [];
}

export async function getTags(): Promise<string[]> {
  const data = await getAreaCityData();
  return data?.tags || [];
}

export function updateCacheWithCityArea(city: string, area: string): void {
  try {
    const cached = getCachedData();
    if (!cached) {
      setCachedData({ cities: [{ city, areas: [area] }] });
      return;
    }

    const cityIndex = cached.cities.findIndex(c => c.city === city);
    
    if (cityIndex >= 0) {
      const cityData = cached.cities[cityIndex];
      if (!cityData.areas.includes(area)) {
        cityData.areas.push(area);
        cityData.areas.sort();
      }
    } else {
      cached.cities.push({ city, areas: [area] });
      cached.cities.sort((a, b) => a.city.localeCompare(b.city));
    }

    setCachedData(cached);
  } catch (error) {
    console.error('Failed to update area/city cache:', error);
  }
}
