import {
  CricketContext,
  SimulationStrategy,
  OverSimulationResult,
  BallOutcome,
} from '../types';

export class SpecialPlayerStrategy implements SimulationStrategy {
  public name = 'Special Player';
  public priority = 1; // High priority to override other strategies

  canHandle(context: CricketContext): boolean {
    const strikerName = context.striker.name;
    const nonStrikerName = context.nonStriker.name;
    const bowlerName = context.bowler.name;
    const specialPlayerNames = ['Anuraag', 'Prashant', 'Harshal'];

    return (
      specialPlayerNames.includes(strikerName) ||
      specialPlayerNames.includes(nonStrikerName) ||
      specialPlayerNames.includes(bowlerName)
    );
  }

  async simulate(context: CricketContext): Promise<OverSimulationResult> {
    const outcomes: BallOutcome[] = [];
    let onStrike = context.striker;
    let offStrike = context.nonStriker;

    for (let i = 0; i < 6; i++) {
      let outcome: BallOutcome;
      if (context.bowler.name === 'Anuraag') {
        outcome = this.simulateAnuraagBowling();
      } else if (context.bowler.name === 'Harshal') {
        outcome = this.simulateHarshalBowling();
      } else if (context.bowler.name === 'Prashant') {
        outcome = this.simulatePrashantBowling();
      } else if (onStrike.name === 'Anuraag') {
        outcome = this.simulateAnuraagBatting();
      } else if (onStrike.name === 'Harshal') {
        outcome = this.simulateHarshalBatting();
      } else if (onStrike.name === 'Prashant') {
        outcome = this.simulatePrashantBatting();
      } else {
        // Default for non-special players facing a non-special bowler
        outcome = { type: 'SINGLE', runs: 1 };
      }
      outcomes.push(outcome);

      // Rotate strike
      if (outcome.runs % 2 === 1) {
        [onStrike, offStrike] = [offStrike, onStrike];
      }
    }

    // Rotate strike at end of over
    [onStrike, offStrike] = [offStrike, onStrike];

    return {
      outcomes,
      commentary: 'Special player simulation.',
      cost: 0,
      debug: {
        strategy: this.name,
        flow: '----',
      },
    };
  }

private simulateAnuraagBatting(): BallOutcome {
  // Star batter: rare wicket, fewer sixes, lots of 1s/2s
  const r = Math.random();

  //if (r < 0.08) return { type: 'WICKET', wicketType: 'CAUGHT', runs: 0 }; // 0.8%
  if (r < 0.148) return { type: 'SIX', runs: 6 };                           // +4.0%
  if (r < 0.188) return { type: 'FOUR', runs: 4 };                      // +3.0%  (=21.8)
  //if (r < 0.498) return { type: 'DOUBLE', runs: 2 };                        // +28.0% (=49.8)
  //if (r < 0.858) return { type: 'SINGLE', runs: 1 };                        // +36.0% (=85.8)
  return { type: 'DOT', runs: 0 };                                          // 14.2%
}

private simulatePrashantBatting(): BallOutcome {
  // Prashant: Weak batsman, mostly dots or getting out
  const rand = Math.random();

  if (rand < 0.35) return { type: 'WICKET', wicketType: 'BOWLED', runs: 0 }; // 35% wicket
  if (rand < 0.148) return { type: 'SIX', runs: 6 };   
  //if (rand < 0.60) return { type: 'DOT', runs: 0 };                           // 25% dot
 // if (rand < 0.80) return { type: 'SINGLE', runs: 1 };                        // 20% single
  //if (rand < 0.90) return { type: 'DOUBLE', runs: 2 };                        // 10% double
  return { type: 'FOUR', runs: 4 };                                           // 10% four (rare boundary)
}

  private simulateHarshalBatting(): BallOutcome {
    // Harshal: All-rounder, balanced approach
    const rand = Math.random();
    if (rand < 0.1) return { type: 'WICKET', wicketType: 'LBW', runs: 0 };
    if (rand < 0.25) return { type: 'FOUR', runs: 4 };
    if (rand < 0.4) return { type: 'SIX', runs: 6 };
    if (rand < 0.7) return { type: 'SINGLE', runs: 1 };
    return { type: 'DOT', runs: 0 };
  }

  private simulateAnuraagBowling(): BallOutcome {
    // Anuraag: Very good bowler
    const rand = Math.random();
    if (rand < 0.2) return { type: 'WICKET', wicketType: 'BOWLED', runs: 0 };
    if (rand < 0.6) return { type: 'DOT', runs: 0 };
    if (rand < 0.9) return { type: 'SINGLE', runs: 1 };
    if (rand < 0.5) return { type: 'SIX', runs: 6 };
    return { type: 'FOUR', runs: 4 };
  }

  private simulateHarshalBowling(): BallOutcome {
    // Harshal: Second best bowler
    const rand = Math.random();
    //if (rand < 0.2) return { type: 'WICKET', wicketType: 'BOWLED', runs: 0 };
    if (rand < 0.6) return { type: 'DOT', runs: 0 };
    if (rand < 0.9) return { type: 'SINGLE', runs: 1 };
    if (rand < 0.5) return { type: 'SIX', runs: 6 };
    return { type: 'FOUR', runs: 4 };
  }

private simulatePrashantBowling(): BallOutcome {
  // Prashant: weak bowler — rare wickets, lots of runs in singles/doubles/boundaries
  const r = Math.random();

  if (r < 0.2) return { type: 'WICKET', wicketType: 'CAUGHT', runs: 0 }; // 2% wicket
  if (r < 0.04) return { type: 'SIX', runs: 6 };                           // 12%
  if (r < 0.04) return { type: 'FOUR', runs: 4 };                          // 20%
  if (r < 0.50) return { type: 'DOUBLE', runs: 2 };                        // 16%
  if (r < 0.80) return { type: 'SINGLE', runs: 1 };                        // 30%
  return { type: 'DOT', runs: 0 };                                         // 20%
}
}
