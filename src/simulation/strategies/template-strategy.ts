import {
  BallOutcome,
  CricketContext,
  OverSimulationResult,
  SimulationStrategy,
} from '../types';
import { overPatterns, OverPattern } from '../patterns';
import { ANURAAG_IDS, PRASHANT_IDS, HARSHAL_IDS } from '../special-players';

export class TemplateStrategy implements SimulationStrategy {
  public name = 'Template';
  public priority = 4;

  public canHandle(context: CricketContext): boolean {
    // This strategy will handle low-complexity scenarios.
    return context.complexity < 4;
  }

  public async simulate(context: CricketContext, previousOverResult?: OverSimulationResult): Promise<OverSimulationResult> {
    // If batsman is set, give a chance to override the pattern
    if (context.strikerBallsFaced > 20 && Math.random() < 0.3) {
        const aggressivePatterns = overPatterns.filter(p => p.tags.includes('momentum-swing'));
        const pattern = aggressivePatterns[Math.floor(Math.random() * aggressivePatterns.length)];
        const variation = pattern.variations[Math.floor(Math.random() * pattern.variations.length)];
        const shuffledOutcomes = [...variation.outcomes].sort(() => Math.random() - 0.5);
        return {
            outcomes: shuffledOutcomes,
            commentary: `Set batsman override: ${pattern.description}`,
            cost: 0,
            debug: {
                pattern: pattern.id,
                weights: [],
            },
        };
    }

    const { pattern, variation, weights } = this.selectPattern(context, previousOverResult);

    // Shuffle the outcomes to add variety
    const shuffledOutcomes = [...variation.outcomes].sort(() => Math.random() - 0.5);

    return {
      outcomes: shuffledOutcomes,
      commentary: `Rule-based simulation: ${pattern.description}`,
      cost: 0,
      debug: {
        pattern: pattern.id,
        weights,
      },
    };
  }

  private selectPattern(context: CricketContext, previousOverResult?: OverSimulationResult): { pattern: OverPattern, variation: any, weights: any } {
    const phaseTag = context.phase.toLowerCase().replace('_overs', '');
    const bowlerId = context.bowler.id;
    
    if (ANURAAG_IDS.includes(bowlerId)) {
      const lastTwoBalls = previousOverResult?.outcomes.slice(-2) ?? [];
      const isHatTrickBall = lastTwoBalls.length === 2 && lastTwoBalls.every(o => o.type === 'WICKET');
      
      if (isHatTrickBall) {
        const hatTrickPattern = overPatterns.find(p => p.id === 'ANURAAG_HAT_TRICK');
        if (hatTrickPattern) {
          const variation = hatTrickPattern.variations[0];
          return { pattern: hatTrickPattern, variation, weights: [] };
        }
      }
      
      const wicketPattern = overPatterns.find(p => p.id === 'ANURAAG_WICKET_OVER');
      if (wicketPattern) {
        const variation = wicketPattern.variations[0];
        return { pattern: wicketPattern, variation, weights: [] };
      }
    }

    let applicablePatterns = overPatterns.filter(p => p.tags.includes(phaseTag as any) && !p.id.startsWith('ANURAAG_'));

    if (context.phase !== 'POWERPLAY' && context.phase !== 'DEATH_OVERS') {
        applicablePatterns.push(...overPatterns.filter(p => p.tags.includes('normal') && !p.id.startsWith('ANURAAG_')));
    }

    // Filter out the last used pattern
    if (context.lastPatternId) {
      applicablePatterns = applicablePatterns.filter(p => p.id !== context.lastPatternId);
    }

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

      // Adjust for set batsman
      if (context.strikerBallsFaced > 20 && pattern.tags.includes('momentum-swing')) {
        weight *= 1.5;
      }

      // Player-specific adjustments
      const batsmanId = context.striker.id;

      if (ANURAAG_IDS.includes(batsmanId)) {
        if (pattern.tags.includes('momentum-swing')) weight *= 3.0;
        if (pattern.tags.includes('pressure')) weight *= 0.2;
        if (pattern.id.includes('ONSLAUGHT') || pattern.id.includes('BURST') || pattern.id.includes('SLOG')) {
          weight *= 4.0; // Strongly favor aggressive patterns
        }
      } else if (PRASHANT_IDS.includes(batsmanId)) {
        if (pattern.tags.includes('momentum-swing')) weight *= 0.1; // Penalize aggressive patterns
        if (pattern.tags.includes('pressure')) weight *= 3.0; // Favor pressure/slow patterns
        if (pattern.variations.some(v => v.outcomes.some(o => o.type === 'FOUR' || o.type === 'SIX'))) {
          weight *= 0.01; // Massively penalize any pattern with a boundary
        }
      }

      if (PRASHANT_IDS.includes(bowlerId)) {
        if (pattern.tags.includes('momentum-swing')) weight *= 0.1; // Heavily penalize wicket-taking patterns
        if (pattern.tags.includes('pressure')) weight *= 0.2;
        if (pattern.id.includes('EXPENSIVE') || pattern.id.includes('SLOG')) {
          weight *= 3.0; // Strongly favor expensive overs
        }
      } else if (HARSHAL_IDS.includes(bowlerId)) {
        if (pattern.tags.includes('pressure')) weight *= 1.8; // Favor tight, economical overs
        if (pattern.tags.includes('momentum-swing')) weight *= 1.5; // Good chance of a wicket
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

        // Now select a variation from the chosen pattern, considering context tags
    const contextTags = this.getContextTags(context);
    let bestVariations = selectedPattern.variations;
    let maxScore = -1;

    for (const variation of selectedPattern.variations) {
      const score = variation.contextTags.filter(tag => contextTags.includes(tag)).length;
      if (score > maxScore) {
        maxScore = score;
        bestVariations = [variation];
      } else if (score === maxScore) {
        bestVariations.push(variation);
      }
    }

    const selectedVariation = bestVariations[Math.floor(Math.random() * bestVariations.length)];

    return { pattern: selectedPattern, variation: selectedVariation, weights: weightedPatterns.map(p => ({id: p.pattern.id, weight: p.weight})) };
  }

  private getContextTags(context: CricketContext): string[] {
    const tags: string[] = [];
    if (context.phase === 'POWERPLAY') tags.push('powerplay');
    if (context.phase === 'MIDDLE_OVERS') tags.push('middle');
    if (context.phase === 'DEATH_OVERS') tags.push('death');
    if (context.pressure.requiredRunRate > 10) tags.push('high_rrr');
    if (context.pressure.dotBallPressure > 3) tags.push('pressure');
    if (context.momentum.battingMomentum > 5) tags.push('batting_momentum');
    if (context.momentum.bowlingMomentum > 5) tags.push('bowling_momentum');
    return tags;
  }
}
