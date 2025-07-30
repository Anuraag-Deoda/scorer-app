import {
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
  BallOutcome,
} from '../types';

export class RuleBasedStrategy implements SimulationStrategy {
  public name = 'RuleBased';
  public priority = 5; // Lowest priority

  public canHandle(context: CricketContext): boolean {
    // This is the fallback strategy, so it can always handle the context.
    return true;
  }

  public async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const outcomes: BallOutcome[] = [];
    for (let i = 0; i < 6; i++) {
      outcomes.push(this.simulateBall(context));
    }

    return {
      outcomes,
      commentary: 'A simple rule-based over.',
      cost: 0,
      debug: {
        strategy: 'RuleBased',
      },
    };
  }

  private simulateBall(context: CricketContext): BallOutcome {
    // Return a fixed, predictable outcome for the fallback strategy
    return { type: 'SINGLE', runs: 1 };
  }
}
