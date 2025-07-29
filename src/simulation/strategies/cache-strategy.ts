import {
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
} from '../types';

// A simple in-memory cache for demonstration purposes.
const simulationCache = new Map<string, OverSimulationResult>();

export class CacheStrategy implements SimulationStrategy {
  public name = 'Cache';

  public canHandle(context: CricketContext): boolean {
    const cacheKey = this.generateCacheKey(context);
    return simulationCache.has(cacheKey);
  }

  public async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const cacheKey = this.generateCacheKey(context);
    const cachedResult = simulationCache.get(cacheKey)!;

    return {
      ...cachedResult,
      commentary: `[Cached] ${cachedResult.commentary}`,
      debug: {
        ...cachedResult.debug,
        cacheKey,
      },
    };
  }

  public static cacheResult(context: CricketContext, result: OverSimulationResult) {
    const cacheKey = new CacheStrategy().generateCacheKey(context);
    simulationCache.set(cacheKey, result);
  }

  private generateCacheKey(context: CricketContext): string {
    // This is a very basic cache key. A real implementation would be more sophisticated,
    // using context similarity to find a wider range of suitable cached results.
    const keyParts = [
      context.phase,
      `rrr:${Math.round(context.pressure.requiredRunRate)}`,
      `wickets:${context.pressure.wicketsInHand}`,
      `bat_mom:${Math.round(context.momentum.battingMomentum / 2)}`,
      `bowl_mom:${Math.round(context.momentum.bowlingMomentum / 2)}`,
    ];
    return keyParts.join('|');
  }
}
