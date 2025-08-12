import {
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
  BallOutcome,
  WicketType,
} from '../types';
import { simulateOver } from '../../ai/flows/simulate-over';
import { SimulateOverOutputSchema } from '@/types';
import { ANURAAG_IDS, PRASHANT_IDS, HARSHAL_IDS } from '../special-players';

export class AiStrategy implements SimulationStrategy {
  public name = 'AI';
  public priority = 2;
  private complexityThreshold: number;
  private aggression: number;

  constructor(complexityThreshold = 7, aggression = 1.0) {
    this.complexityThreshold = complexityThreshold;
    this.aggression = aggression;
  }

  public canHandle(context: CricketContext): boolean {
    return context.complexity >= this.complexityThreshold;
  }

  public async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const overResult = await simulateOver({
        matchContext: this.createMatchContext(context),
        bowlingTeamPlayerIds: context.bowlingTeam.players.map((p: {id: string}) => p.id).join(','),
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
    const batsmanId = context.striker.id;
    const bowlerId = context.bowler.id;
    let narrative = '';

    if (ANURAAG_IDS.includes(batsmanId)) {
      narrative = 'Anuraag is on fire. He should score 70+ runs at a strike rate of 300, hitting many boundaries. He should not get out.';
    } else if (PRASHANT_IDS.includes(batsmanId)) {
      narrative = 'Prashant is struggling badly. He should bat for a long time (around 25 balls) but score very few runs (under 10) with no boundaries, and then get out.';
    }

    if (ANURAAG_IDS.includes(bowlerId)) {
      narrative += ' Anuraag is a wicket-taking machine. He has a high chance of taking a wicket in this over. If he has taken two wickets in a row, he should attempt a third for a hat-trick.';
    } else if (PRASHANT_IDS.includes(bowlerId)) {
      narrative += ' Prashant is having a bad day, he should be expensive and take very few to no wickets.';
    } else if (HARSHAL_IDS.includes(bowlerId)) {
      narrative += ' Harshal is a skillful bowler. He should be economical and have a good chance of taking a wicket.';
    }

      return `
      ${narrative ? `Narrative Hint: ${narrative}` : ''}
      Aggression Level: ${this.aggression} (1.0 is neutral, >1.0 is more aggressive, <1.0 is more defensive)
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
