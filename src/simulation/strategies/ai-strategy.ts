import {
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
  BallOutcome,
  WicketType,
} from '../types';
import { simulateOver } from '../../ai/flows/simulate-over';
import { SimulateOverOutputSchema } from '@/types';

export class AiStrategy implements SimulationStrategy {
  public name = 'AI';
  private complexityThreshold: number;

  constructor(complexityThreshold = 7) {
    this.complexityThreshold = complexityThreshold;
  }

  public canHandle(context: CricketContext): boolean {
    return context.complexity >= this.complexityThreshold;
  }

  public async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const overResult = await simulateOver({
        matchContext: this.createMatchContext(context),
        bowlingTeamPlayerIds: context.bowlingTeam.players.map(p => p.id).join(','),
    });

    const parsedResult = SimulateOverOutputSchema.parse(overResult);

    const outcomes: BallOutcome[] = parsedResult.over.map((ball) => {
        if (ball.event === 'w') {
            return { type: 'WICKET', wicketType: ball.wicketType as WicketType };
        }
        if (ball.event === 'run') {
            if (ball.runs === 0) return { type: 'DOT' };
            if (ball.runs === 1) return { type: 'SINGLE', runs: 1 };
            if (ball.runs === 2) return { type: 'DOUBLE', runs: 2 };
            if (ball.runs === 3) return { type: 'TRIPLE', runs: 3 };
            if (ball.runs === 4) return { type: 'FOUR', runs: 4 };
            if (ball.runs === 6) return { type: 'SIX', runs: 6 };
        }
        if (ball.event === 'wd') return { type: 'WIDE', runs: 1 };
        if (ball.event === 'nb') return { type: 'NO_BALL', runs: 1 };
        
        // Fallback for byes/leg-byes, treat as dots for now
        return { type: 'DOT' };
    });

    return {
      outcomes,
      commentary: 'AI-generated over simulation.',
      cost: 0.02, // Placeholder cost for AI simulation
      debug: {
        flow: 'simulateOver',
        input: context,
      },
    };
  }

  private createMatchContext(context: CricketContext): string {
      return `
      Match Situation:
      Innings: ${context.innings}
      Over: ${context.over}, Ball: ${context.ball}
      Phase: ${context.phase}
      Batting Team: ${context.battingTeam.name}
      Bowling Team: ${context.bowlingTeam.name}
      Striker: ${context.striker.name} (Rating: ${context.striker.rating})
      Non-striker: ${context.nonStriker.name} (Rating: ${context.nonStriker.rating})
      Bowler: ${context.bowler.name} (Rating: ${context.bowler.rating})
      Pressure:
        - Required Run Rate: ${context.pressure.requiredRunRate.toFixed(2)}
        - Current Run Rate: ${context.pressure.currentRunRate.toFixed(2)}
        - Wickets in Hand: ${context.pressure.wicketsInHand}
      Momentum:
        - Batting: ${context.momentum.battingMomentum}
        - Bowling: ${context.momentum.bowlingMomentum}
    `;
  }
}
