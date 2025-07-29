import {
  BallOutcome,
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
} from '../types';
import { overPatterns, OverPattern } from '../patterns';

export class RuleBasedStrategy implements SimulationStrategy {
  public name = 'RuleBased';

  public canHandle(context: CricketContext): boolean {
    // This strategy can handle any situation where the AI doesn't.
    return true;
  }

  public async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const { pattern, variation, weights } = this.selectPattern(context);

    return {
      outcomes: variation.outcomes,
      commentary: `Rule-based simulation: ${pattern.description}`,
      cost: 0,
      debug: {
        pattern: pattern.id,
        weights,
      },
    };
  }

  private selectPattern(context: CricketContext): { pattern: OverPattern, variation: any, weights: any } {
    const phaseTag = context.phase.toLowerCase().replace('_overs', '');
    
    const applicablePatterns = overPatterns.filter(p => 
      p.tags.includes(phaseTag as any) || p.tags.includes('normal')
    );

    const weightedPatterns = applicablePatterns.map(pattern => {
      let weight = pattern.baseWeight;

      // Adjust weights based on context
      if (context.pressure.requiredRunRate > 10 && pattern.tags.includes('pressure')) {
        weight *= 1.5;
      }
      if (context.pressure.requiredRunRate > 12 && pattern.tags.includes('death')) {
        weight *= 1.2;
      }
      if (context.momentum.battingMomentum > 5 && pattern.tags.includes('momentum-swing')) {
        weight *= 1.5;
      }
       if (context.momentum.bowlingMomentum > 5 && pattern.tags.includes('pressure')) {
        weight *= 1.5;
      }

      return { pattern, weight };
    });

    const totalWeight = weightedPatterns.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedPattern: OverPattern | null = null;

    for (const { pattern, weight } of weightedPatterns) {
      if (random < weight) {
        selectedPattern = pattern;
        break;
      }
      random -= weight;
    }

    if (!selectedPattern) {
      selectedPattern = applicablePatterns[0];
    }

    // Now select a variation from the chosen pattern
    const variation = selectedPattern.variations[Math.floor(Math.random() * selectedPattern.variations.length)];

    return { pattern: selectedPattern, variation, weights: weightedPatterns.map(p => ({id: p.pattern.id, weight: p.weight})) };
  }
}
