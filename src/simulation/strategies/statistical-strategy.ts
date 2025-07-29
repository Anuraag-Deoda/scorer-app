import {
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
  BallOutcome,
  WicketType,
} from '../types';
import { transitionMatrices } from '../probabilities';
import { cloneDeep } from 'lodash';

export class StatisticalStrategy implements SimulationStrategy {
  public name = 'Statistical';

  // This strategy will be used for mid-complexity scenarios.
  public canHandle(context: CricketContext): boolean {
    return context.complexity >= 4 && context.complexity < 7;
  }

  public async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const outcomes: BallOutcome[] = [];
    let currentContext = context;

    for (let i = 0; i < 6; i++) {
      const outcome = this.simulateBall(currentContext);
      outcomes.push(outcome);
      // In a real implementation, we would update the context after each ball.
      // currentContext = updateContextAfterBall(currentContext, outcome);
    }

    return {
      outcomes,
      commentary: 'An over simulated using statistical probabilities.',
      cost: 0.001, // Statistical simulation might have a very small cost for data lookups.
      debug: {
        strategy: 'Statistical',
      },
    };
  }

  private simulateBall(context: CricketContext): BallOutcome {
    const baseProbs = cloneDeep(transitionMatrices[context.phase]);

    // Adjust probabilities based on context
    // Pressure adjustments
    if (context.pressure.requiredRunRate > 12) {
      baseProbs.FOUR! *= 1.2;
      baseProbs.SIX! *= 1.5;
      baseProbs.WICKET! *= 1.3;
    }
    if (context.pressure.dotBallPressure > 3) {
      baseProbs.WICKET! *= 1.2;
      baseProbs.SINGLE! *= 1.1;
    }

    // Momentum adjustments
    if (context.momentum.battingMomentum > 5) {
        baseProbs.FOUR! *= 1.2;
        baseProbs.SIX! *= 1.2;
    }
     if (context.momentum.bowlingMomentum > 5) {
        baseProbs.WICKET! *= 1.2;
        baseProbs.DOT! *= 1.1;
    }

    // Normalize probabilities
    const totalProb = Object.values(baseProbs).reduce((sum, p) => sum! + p!, 0);
    const normalizedProbs = Object.entries(baseProbs).reduce((acc, [key, value]) => {
        acc[key as BallOutcome['type']] = value! / totalProb;
        return acc;
    }, {} as { [key in BallOutcome['type']]: number });


    const random = Math.random();
    let cumulativeProb = 0;

    for (const [key, value] of Object.entries(normalizedProbs)) {
      cumulativeProb += value!;
      if (random < cumulativeProb) {
        const type = key as BallOutcome['type'];
        switch (type) {
          case 'DOT': return { type };
          case 'SINGLE': return { type, runs: 1 };
          case 'DOUBLE': return { type, runs: 2 };
          case 'TRIPLE': return { type, runs: 3 };
          case 'FOUR': return { type, runs: 4 };
          case 'SIX': return { type, runs: 6 };
          case 'WICKET':
            const wicketTypes: WicketType[] = ['BOWLED', 'CAUGHT', 'LBW'];
            return { type, wicketType: wicketTypes[Math.floor(Math.random() * wicketTypes.length)] };
          case 'WIDE': return { type, runs: 1 };
          case 'NO_BALL': return { type, runs: 1 };
        }
      }
    }

    return { type: 'DOT' }; // Fallback
  }
}
