/**
 * Cache utilities for storing API responses locally to reduce Firebase reads
 * Implements a 30-minute cache for any data using localStorage
 */

// Cache duration: 30 minutes in milliseconds
export const CACHE_DURATION = 360 * 60 * 1000;

// Max size for a cache item in bytes (approximately 4MB, which is a safe size for localStorage)
export const MAX_CACHE_SIZE = 4 * 1024 * 1024; 

// Interface for cache items with timestamp
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  compressed?: boolean;
}

/**
 * Get data from cache if it exists and is not expired
 * @param key - Cache key to retrieve
 * @returns The cached data if valid, or null if expired or not found
 */
export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsedCache: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within 30 minutes)
    if (now - parsedCache.timestamp <= CACHE_DURATION) {
      console.log(`[Cache] Using cached ${key} data from ${new Date(parsedCache.timestamp).toLocaleTimeString()}`);
      return parsedCache.data;
    }
    
    // Cache expired
    console.log(`[Cache] Cache for ${key} expired`);
    // Clean up expired cache to free up space
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error(`[Cache] Error reading cache for ${key}:`, error);
    // If there's an error reading the cache, it might be corrupted
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore cleanup errors
    }
    return null;
  }
}

/**
 * Store data in cache with current timestamp
 * @param key - Cache key to store under
 * @param data - Data to cache
 */
export function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now()
    };
    
    // Convert to string to check size
    const serialized = JSON.stringify(cacheItem);
    
    if (serialized.length > MAX_CACHE_SIZE) {
      console.warn(`[Cache] Data for ${key} exceeds size limit (${serialized.length} bytes). Skipping cache.`);
      return;
    }
    
    localStorage.setItem(key, serialized);
    console.log(`[Cache] Cached ${key} data at ${new Date().toLocaleTimeString()} (${(serialized.length / 1024).toFixed(1)}KB)`);
  } catch (error) {
    console.error(`[Cache] Error setting cache for ${key}:`, error);
    
    // If we get a quota error, clear some old caches to make room
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('[Cache] Storage quota exceeded, clearing older caches');
      pruneOldestCaches();
    }
  }
}

/**
 * Clear a specific cache entry
 * @param key - Cache key to clear
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
    console.log(`[Cache] Cleared cache for ${key}`);
  } catch (error) {
    console.error(`[Cache] Error clearing cache for ${key}:`, error);
  }
}

/**
 * Clear all cache entries that match a prefix
 * @param prefix - Prefix of cache keys to clear
 */
export function clearCacheByPrefix(prefix: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    let count = 0;
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
        count++;
      }
    });
    
    console.log(`[Cache] Cleared ${count} cache entries with prefix "${prefix}"`);
  } catch (error) {
    console.error(`[Cache] Error clearing cache with prefix "${prefix}":`, error);
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.clear();
    console.log(`[Cache] Cleared all cache entries`);
  } catch (error) {
    console.error(`[Cache] Error clearing all cache:`, error);
  }
}

/**
 * Remove the oldest caches to free up space
 * Keeps the most recent caches within the past 24 hours
 */
function pruneOldestCaches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    const cacheItems: { key: string; timestamp: number }[] = [];
    
    // Collect all cache items with their timestamps
    for (const key of keys) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed.timestamp === 'number') {
            cacheItems.push({ key, timestamp: parsed.timestamp });
          }
        }
      } catch {
        // Skip items that can't be parsed
      }
    }
    
    // Sort by timestamp (oldest first)
    cacheItems.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest 50% of caches
    const toRemove = Math.ceil(cacheItems.length / 2);
    
    for (let i = 0; i < toRemove; i++) {
      if (i < cacheItems.length) {
        localStorage.removeItem(cacheItems[i].key);
      }
    }
    
    console.log(`[Cache] Pruned ${toRemove} oldest caches to free up space`);
  } catch (error) {
    console.error(`[Cache] Error pruning caches:`, error);
  }
}

/**
 * Simple in-memory cache utility functions
 */

// Define a type for the cache data
type CacheData<T> = {
  value: T;
  timestamp: number;
  version: number; // Added version for cache busting
  expires: number;
};

// Current cache version - increment when search logic changes
const CACHE_VERSION = 2; // Increased version to bust existing caches

// In-memory cache storage
const memoryCache: Record<string, CacheData<any>> = {};

// Default cache duration in milliseconds (15 minutes)
const DEFAULT_CACHE_DURATION = 15 * 60 * 1000;

/**
 * Get a cached value by key from memory cache
 * @param key Cache key
 * @param maxAge Optional maximum age in milliseconds
 * @returns The cached value or undefined if not found or expired
 */
export function getMemoryCache<T>(key: string, maxAge?: number): T | undefined {
  const cacheData = memoryCache[key];
  if (!cacheData) {
    console.log(`[Cache] No memory cache found for ${key}`);
    return undefined;
  }

  // Check if the cache version matches the current version
  if (cacheData.version !== CACHE_VERSION) {
    console.log(`[Cache] Memory cache version mismatch for ${key}, invalidating`);
    delete memoryCache[key];
    return undefined;
  }

  // Check if the cache has expired
  const now = Date.now();
  if (cacheData.expires < now) {
    console.log(`[Cache] Memory cache for ${key} expired`);
    delete memoryCache[key];
    return undefined;
  }

  // If maxAge is provided, check if the cache is still within the maxAge
  if (maxAge !== undefined) {
    const age = now - cacheData.timestamp;
    if (age > maxAge) {
      console.log(`[Cache] Memory cache for ${key} is older than maxAge (${age}ms > ${maxAge}ms)`);
      delete memoryCache[key];
      return undefined;
    }
  }

  const formattedTime = new Date(cacheData.timestamp).toLocaleTimeString();
  console.log(`[Cache] Using memory cached ${key} data from ${formattedTime}`);
  return cacheData.value;
}

/**
 * Set a value in the memory cache
 * @param key Cache key
 * @param value Value to cache
 * @param duration Optional cache duration in milliseconds (defaults to 15 minutes)
 */
export function setMemoryCache<T>(key: string, value: T, duration: number = DEFAULT_CACHE_DURATION): void {
  const timestamp = Date.now();
  const expires = timestamp + duration;
  
  memoryCache[key] = {
    value,
    timestamp,
    version: CACHE_VERSION,
    expires
  };
  
  console.log(`[Cache] Cached ${key} data in memory (expires in ${duration / 1000}s)`);
}

/**
 * Clear a specific memory cache entry
 * @param key Cache key to clear
 */
export function clearMemoryCache(key: string): void {
  if (memoryCache[key]) {
    delete memoryCache[key];
    console.log(`[Cache] Cleared memory cache for ${key}`);
  }
}

/**
 * Clear all memory cache entries
 */
export function clearAllMemoryCache(): void {
  Object.keys(memoryCache).forEach(key => {
    delete memoryCache[key];
  });
  console.log(`[Cache] Cleared all memory cache entries`);
}

/**
 * Force refresh of specific cached data in memory
 * @param key Cache key to refresh
 * @returns true if the cache was cleared, false if the key wasn't in the cache
 */
export function invalidateMemoryCache(key: string): boolean {
  if (memoryCache[key]) {
    delete memoryCache[key];
    console.log(`[Cache] Invalidated memory cache for ${key}`);
    return true;
  }
  return false;
} 