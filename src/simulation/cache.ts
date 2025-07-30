import { OverSimulationResult } from './types';

export class LRUCache {
  private maxSize: number;
  private cache: Map<string, OverSimulationResult>;
  private usage: Map<string, number>;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.usage = new Map();
  }

  public get(key: string): OverSimulationResult | undefined {
    if (this.cache.has(key)) {
      this.hits++;
      this.usage.set(key, Date.now());
      return this.cache.get(key);
    }
    this.misses++;
    return undefined;
  }

  public set(key: string, value: OverSimulationResult): void {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }
    this.cache.set(key, value);
    this.usage.set(key, Date.now());
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public getAnalytics() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  private evict(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.usage.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.usage.delete(oldestKey);
    }
  }
}

export const simulationCache = new LRUCache();
