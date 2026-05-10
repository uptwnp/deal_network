/**
 * Comprehensive cache clearing utility
 * Clears all cache, localStorage, sessionStorage, and static resources
 * while preserving login/authentication details
 */

import { clearAreaCityCache } from './areaCityApi';

// Keys to preserve (login/authentication related)
const PRESERVED_KEYS = [
  'propnetwork_auth_token',
  'propnetwork_auth_token_expiry',
  'propnetwork_user_id',
  'propnetwork_user_id_expiry',
  'propnetwork_current_user',
  'propnetwork_current_user_expiry',
  // Note: propnetwork_users might be legacy, but keeping it safe
  // propnetwork_next_user_id can be cleared as it's not critical for login
] as const;

/**
 * Clear all localStorage items except login/authentication keys
 */
function clearLocalStorage(): void {
  try {
    const keysToRemove: string[] = [];
    const preservedSet = new Set<string>(PRESERVED_KEYS);
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !preservedSet.has(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all non-preserved keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key "${key}":`, error);
      }
    });
    
    console.log(`Cleared ${keysToRemove.length} localStorage items (preserved ${PRESERVED_KEYS.length} login keys)`);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Clear all sessionStorage items
 */
function clearSessionStorage(): void {
  try {
    sessionStorage.clear();
    console.log('Cleared sessionStorage');
  } catch (error) {
    console.error('Failed to clear sessionStorage:', error);
  }
}

/**
 * Clear all Cache API caches (service worker caches)
 */
async function clearCacheStorage(): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log(`Cleared ${cacheNames.length} cache(s) from Cache API`);
    }
  } catch (error) {
    console.error('Failed to clear Cache API:', error);
  }
}

/**
 * Clear IndexedDB databases
 */
async function clearIndexedDB(): Promise<void> {
  try {
    if ('indexedDB' in window) {
      // Get all database names (this is a workaround since there's no direct API)
      // We'll try to delete common database names used by service workers
      const databases = ['workbox-precache', 'workbox-runtime-cache'];
      
      for (const dbName of databases) {
        try {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          await new Promise<void>((resolve, reject) => {
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => reject(deleteReq.error);
            deleteReq.onblocked = () => {
              console.warn(`Database ${dbName} deletion blocked`);
              resolve(); // Resolve anyway to continue
            };
          });
        } catch {
          // Ignore errors for databases that don't exist
          console.debug(`Database ${dbName} does not exist or could not be deleted`);
        }
      }
      
      // Also try to get all databases (if supported)
      if ('databases' in indexedDB) {
        try {
          const allDatabases = await (indexedDB as unknown as { databases: () => Promise<IDBDatabaseInfo[]> }).databases();
          await Promise.all(
            allDatabases.map((db: IDBDatabaseInfo) => 
              new Promise<void>((resolve) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => resolve(); // Continue even on error
                deleteReq.onblocked = () => resolve(); // Continue even if blocked
              })
            )
          );
          console.log(`Cleared IndexedDB databases`);
        } catch (error) {
          console.debug('Could not enumerate all IndexedDB databases:', error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
  }
}

/**
 * Clear browser application cache (deprecated but still used in some browsers)
 */
function clearApplicationCache(): void {
  try {
    if ('applicationCache' in window) {
      const appCache = (window as unknown as { applicationCache: { update: () => void, status: number, UPDATEREADY: number, swapCache: () => void } }).applicationCache;
      if (appCache) {
        appCache.update();
        if (appCache.status === appCache.UPDATEREADY) {
          appCache.swapCache();
        }
      }
    }
  } catch (error) {
    console.debug('ApplicationCache not available or failed to clear:', error);
  }
}

/**
 * Comprehensive cache clearing function
 * Clears everything except login/authentication details
 * 
 * @returns Promise that resolves when all cache clearing operations are complete
 */
export async function clearAllCache(): Promise<void> {
  try {
    console.log('Starting comprehensive cache clear...');
    
    // Clear area/city cache and in-flight request first
    // This prevents duplicate API requests when components re-fetch after cache clear
    clearAreaCityCache();
    
    // Clear localStorage (preserving login keys)
    clearLocalStorage();
    
    // Clear sessionStorage
    clearSessionStorage();
    
    // Clear Cache API (service worker caches)
    await clearCacheStorage();
    
    // Clear IndexedDB
    await clearIndexedDB();
    
    // Clear application cache (legacy)
    clearApplicationCache();
    
    console.log('Cache clearing completed');
  } catch (error) {
    console.error('Error during cache clearing:', error);
    throw error;
  }
}

/**
 * Get list of all localStorage keys that will be preserved
 * Useful for debugging
 */
export function getPreservedKeys(): readonly string[] {
  return PRESERVED_KEYS;
}

