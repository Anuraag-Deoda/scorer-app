import {
  CricketContext,
  SimulationStrategy,
  OverSimulationResult,
} from './types';
import { CacheStrategy } from './strategies/cache-strategy';

export class SimulationEngine {
  private strategies: SimulationStrategy[];

  constructor(strategies: SimulationStrategy[]) {
    this.strategies = strategies.sort((a, b) =>
      (b.canHandle.length > 1 ? 1 : 0) - (a.canHandle.length > 1 ? 1 : 0)
    ); // A simple way to prioritize more specific strategies
  }

  public async simulateOver(
    context: CricketContext
  ): Promise<OverSimulationResult> {
    const strategy = this.selectStrategy(context);

    console.log(`Using strategy: ${strategy.name} for complexity ${context.complexity}`);

    const result = await strategy.simulate(context);

    if (strategy.name !== 'Cache') {
      CacheStrategy.cacheResult(context, result);
    }

    return result;
  }

  private selectStrategy(context: CricketContext): SimulationStrategy {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(context)) {
        return strategy;
      }
    }
    throw new Error('No suitable simulation strategy found for the given context.');
  }
}
