/**
 * Image optimization utilities for the NFT Editor
 */

import { perf } from './performance';

export interface CachedImage {
  url: string;
  element: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
  loadedAt: number;
  size: number;
}

export interface ImageLoadOptions {
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
  retries?: number;
  cacheKey?: string;
}

export class ImageCache {
  private cache = new Map<string, CachedImage>();
  private loadingPromises = new Map<string, Promise<CachedImage>>();
  private maxCacheSize = 50; // Maximum number of images to cache
  private maxCacheAge = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Load an image with caching and performance tracking
   */
  async loadImage(url: string, options: ImageLoadOptions = {}): Promise<CachedImage> {
    perf.start(`image_load_${url}`, { url, ...options });
    
    try {
      const cacheKey = options.cacheKey || url;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && !this.isExpired(cached)) {
        perf.end(`image_load_${url}`);
        return cached;
      }

      // Check if already loading
      const existingPromise = this.loadingPromises.get(cacheKey);
      if (existingPromise) {
        const result = await existingPromise;
        perf.end(`image_load_${url}`);
        return result;
      }

      // Start loading
      const loadPromise = this.loadImageFromNetwork(url, options);
      this.loadingPromises.set(cacheKey, loadPromise);

      try {
        const result = await loadPromise;
        this.cache.set(cacheKey, result);
        this.cleanupCache();
        perf.end(`image_load_${url}`);
        return result;
      } finally {
        this.loadingPromises.delete(cacheKey);
      }
    } catch (error) {
      perf.end(`image_load_${url}`);
      throw error;
    }
  }

  /**
   * Load image from network with retries and timeout
   */
  private async loadImageFromNetwork(url: string, options: ImageLoadOptions): Promise<CachedImage> {
    const { timeout = 10000, retries = 2 } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = performance.now();
        const img = await this.createImageElement(url, timeout);
        const loadTime = performance.now() - startTime;
        
        // Estimate image size (rough calculation)
        const estimatedSize = img.naturalWidth * img.naturalHeight * 4; // RGBA
        
        const cachedImage: CachedImage = {
          url,
          element: img,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          loadedAt: Date.now(),
          size: estimatedSize,
        };

        console.log(`[IMAGE] Loaded ${url} in ${loadTime.toFixed(2)}ms (${img.naturalWidth}x${img.naturalHeight})`);
        
        return cachedImage;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          console.warn(`[IMAGE] Retry ${attempt + 1}/${retries} for ${url}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error(`Failed to load image: ${url}`);
  }

  /**
   * Create image element with timeout
   */
  private createImageElement(url: string, timeout: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let timeoutId: ReturnType<typeof setTimeout>;
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };
      
      img.onload = () => {
        cleanup();
        resolve(img);
      };
      
      img.onerror = (error) => {
        cleanup();
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Image load timeout: ${url}`));
      }, timeout);
      
      // Enable CORS for cross-origin images
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  /**
   * Preload multiple images
   */
  async preloadImages(urls: string[], options: ImageLoadOptions = {}): Promise<void> {
    perf.start('image_preload_batch', { count: urls.length });
    
    try {
      const promises = urls.map(url => 
        this.loadImage(url, { ...options, priority: 'low' })
          .catch(error => {
            console.warn(`[IMAGE] Failed to preload ${url}:`, error);
            return null;
          })
      );
      
      await Promise.all(promises);
      perf.end('image_preload_batch');
    } catch (error) {
      perf.end('image_preload_batch');
      throw error;
    }
  }

  /**
   * Get cached image if available
   */
  getCachedImage(url: string, cacheKey?: string): CachedImage | null {
    const key = cacheKey || url;
    const cached = this.cache.get(key);
    return cached && !this.isExpired(cached) ? cached : null;
  }

  /**
   * Check if cached image is expired
   */
  private isExpired(cached: CachedImage): boolean {
    return Date.now() - cached.loadedAt > this.maxCacheAge;
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, cached]) => {
      if (this.isExpired(cached)) {
        this.cache.delete(key);
      }
    });
    
    // Remove oldest entries if cache is too large
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = entries
        .filter(([_, cached]) => !this.isExpired(cached))
        .sort((a, b) => a[1].loadedAt - b[1].loadedAt);
      
      const toRemove = sortedEntries.slice(0, this.cache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Clear all cached images
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, cached) => sum + cached.size, 0);
    const timestamps = entries.map(cached => cached.loadedAt);
    
    return {
      size: this.cache.size,
      totalSize,
      hitRate: 0, // Would need to track hits/misses
      oldestEntry: Math.min(...timestamps) || 0,
      newestEntry: Math.max(...timestamps) || 0,
    };
  }
}

/**
 * Optimized image loader with intersection observer for lazy loading
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private loadingImages = new Set<HTMLImageElement>();
  
  constructor(private imageCache: ImageCache) {
    this.setupObserver();
  }

  /**
   * Setup intersection observer for lazy loading
   */
  private setupObserver(): void {
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;
    
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImageElement(img);
            this.observer?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1,
      }
    );
  }

  /**
   * Observe an image element for lazy loading
   */
  observe(img: HTMLImageElement, src: string): void {
    if (!this.observer) return;
    
    img.dataset.src = src;
    this.observer.observe(img);
  }

  /**
   * Load an image element
   */
  private async loadImageElement(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (!src || this.loadingImages.has(img)) return;
    
    this.loadingImages.add(img);
    
    try {
      const cached = await this.imageCache.loadImage(src, { priority: 'normal' });
      img.src = cached.url;
      img.classList.add('loaded');
    } catch (error) {
      console.error('Failed to load lazy image:', error);
      img.classList.add('error');
    } finally {
      this.loadingImages.delete(img);
    }
  }

  /**
   * Cleanup observer
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.loadingImages.clear();
  }
}

// Global instances
export const imageCache = new ImageCache();
export const lazyLoader = new LazyImageLoader(imageCache);

/**
 * Optimized image preloader for NFT galleries
 */
export class NFTImagePreloader {
  private preloadQueue: string[] = [];
  private isPreloading = false;
  
  constructor(private imageCache: ImageCache) {}

  /**
   * Queue images for preloading
   */
  queueImages(urls: string[]): void {
    const newUrls = urls.filter(url => !this.preloadQueue.includes(url));
    this.preloadQueue.push(...newUrls);
    this.startPreloading();
  }

  /**
   * Start preloading queued images
   */
  private async startPreloading(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;
    
    this.isPreloading = true;
    
    try {
      // Process images in batches to avoid overwhelming the browser
      const batchSize = 3;
      while (this.preloadQueue.length > 0) {
        const batch = this.preloadQueue.splice(0, batchSize);
        await this.imageCache.preloadImages(batch, { priority: 'low' });
        
        // Small delay between batches to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Clear preload queue
   */
  clearQueue(): void {
    this.preloadQueue = [];
  }
}

export const nftImagePreloader = new NFTImagePreloader(imageCache);