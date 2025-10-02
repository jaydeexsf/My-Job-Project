// Advanced caching system for performance optimization
import { unstable_cache } from 'next/cache';

// Cache configuration
const CACHE_TAGS = {
  QURAN_DATA: 'quran-data',
  BOOKMARKS: 'bookmarks',
  RECITATIONS: 'recitations',
  SEARCH_RESULTS: 'search-results',
} as const;

const CACHE_DURATIONS = {
  QURAN_DATA: 86400, // 24 hours - Quran data doesn't change
  BOOKMARKS: 300, // 5 minutes - User data changes more frequently
  RECITATIONS: 300, // 5 minutes
  SEARCH_RESULTS: 3600, // 1 hour - Search results can be cached longer
} as const;

// Cached Quran API functions
export const getCachedSurah = unstable_cache(
  async (surahNumber: number) => {
    const { getSurah } = await import('./quranApi');
    return getSurah(surahNumber);
  },
  ['surah'],
  {
    tags: [CACHE_TAGS.QURAN_DATA],
    revalidate: CACHE_DURATIONS.QURAN_DATA,
  }
);

export const getCachedAyah = unstable_cache(
  async (surah: number, ayah: number) => {
    const { getAyah } = await import('./quranApi');
    return getAyah(surah, ayah);
  },
  ['ayah'],
  {
    tags: [CACHE_TAGS.QURAN_DATA],
    revalidate: CACHE_DURATIONS.QURAN_DATA,
  }
);

export const getCachedSearchResults = unstable_cache(
  async (query: string) => {
    const { searchAyat } = await import('./quranApi');
    return searchAyat(query);
  },
  ['search'],
  {
    tags: [CACHE_TAGS.SEARCH_RESULTS],
    revalidate: CACHE_DURATIONS.SEARCH_RESULTS,
  }
);

// In-memory cache for client-side performance
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const memoryCache = new MemoryCache();

// Cache invalidation utilities
export async function revalidateCache(tag: keyof typeof CACHE_TAGS) {
  if (typeof window === 'undefined') {
    const { revalidateTag } = await import('next/cache');
    revalidateTag(CACHE_TAGS[tag]);
  }
}

// Performance monitoring
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now();
    
    try {
      const result = await fn();
      const end = performance.now();
      
      // Log performance metrics (in production, send to analytics)
      console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
      
      resolve(result);
    } catch (error) {
      const end = performance.now();
      console.error(`[Performance Error] ${name}: ${(end - start).toFixed(2)}ms`, error);
      reject(error);
    }
  });
}
