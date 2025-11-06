export interface UserSettings {
  city: string;
  preferredAreas: string[];
  preferredPropertyTypes: string[];
  defaultPriceMin?: number;
  defaultPriceMax?: number;
  defaultSizeUnit: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  city: 'Panipat',
  preferredAreas: [],
  preferredPropertyTypes: [],
  defaultSizeUnit: 'Gaj',
};

const STORAGE_KEY = 'propnetwork_user_settings';

export function getUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { ...DEFAULT_USER_SETTINGS };
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save user settings:', error);
  }
}

