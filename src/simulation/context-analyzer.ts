import { cloneDeep } from 'lodash';
import { ANURAAG_IDS, PRASHANT_IDS } from './special-players';
import {
  CricketContext,
  PressureMetrics,
  MomentumState,
  MatchPhase,
} from './types';
import { calculateCurrentRunRate, calculateRequiredRunRate } from '../lib/cricket-logic';

// --- Main Analyzer ---

export function analyzeContext(
  match: any,
  currentInnings: any,
  battingTeam: any,
  bowlingTeam: any,
  striker: any,
  nonStriker: any,
  bowler: any
  // TODO: Add historical data for more accurate analysis
): CricketContext {
  const strikerBallsFaced = currentInnings.balls.filter((b: any) => b.batsmanId === striker.id).length;
  const phase = detectMatchPhase(currentInnings.overs);
  const pressure = calculatePressureMetrics(match, currentInnings);
  const momentum = trackMomentum(currentInnings.balls);
  const complexity = calculateComplexity(pressure, momentum, phase);

  return {
    match,
    innings: match.innings.length,
    over: currentInnings.overs,
    ball: currentInnings.balls.length % 6,
    battingTeam,
    bowlingTeam,
    striker,
    nonStriker,
    bowler,
    strikerBallsFaced,
    phase,
    pressure,
    momentum,
    complexity,
  };
}

// --- Component Calculators ---

export function detectMatchPhase(over: number): MatchPhase {
  if (over < 6) return 'POWERPLAY';
  if (over < 15) return 'MIDDLE_OVERS';
  return 'DEATH_OVERS';
}

export function calculatePressureMetrics(
  match: any,
  currentInnings: any
): PressureMetrics {
  const totalBalls = currentInnings.overs * 6 + (currentInnings.balls.length % 6);
  const score = currentInnings.score;
  const wickets = currentInnings.wickets;

  const currentRunRate = calculateCurrentRunRate(score, totalBalls);

  let requiredRunRate = 0;
  if (match.innings.length > 1 && match.innings[0].id !== currentInnings.id) {
    const target = (match.innings[0].score || 0) + 1;
    const ballsRemaining = match.oversPerInnings * 6 - totalBalls;
    requiredRunRate = calculateRequiredRunRate(target, score, ballsRemaining);
  }

  let dotBallPressure = 0;
  let boundaryPressure = 0;
  let ballsSinceBoundary = 0;
  for (let i = currentInnings.balls.length - 1; i >= 0; i--) {
    const ball = currentInnings.balls[i];
    if (ball.runs === 0) {
      dotBallPressure++;
    } else {
      break;
    }
  }
  for (let i = currentInnings.balls.length - 1; i >= 0; i--) {
    const ball = currentInnings.balls[i];
    if (ball.runs >= 4) {
      break;
    }
    ballsSinceBoundary++;
  }
  boundaryPressure = ballsSinceBoundary;

  return {
    requiredRunRate,
    currentRunRate,
    dotBallPressure,
    boundaryPressure,
    wicketsInHand: 10 - wickets,
  };
}

// This is a simplified momentum tracker. A real implementation would be more stateful.
export function trackMomentum(recentBalls: any[], striker?: any, bowler?: any): MomentumState {
  let battingMomentum = 0;
  let bowlingMomentum = 0;
  let overMomentum = 0;

  // Analyze the last 12 balls for overall momentum
  const last12Balls = recentBalls.length > 12 ? recentBalls.slice(-12) : recentBalls;
  last12Balls.forEach(ball => {
    let battingImpact = 0;
    let bowlingImpact = 0;

    if (ball.runs >= 4) battingImpact += ball.runs; // 4 for a four, 6 for a six
    if (ball.event === 'w') bowlingImpact += 10;
    if (ball.runs === 0) bowlingImpact += 1;
    if (ball.runs === 1) {
      battingImpact += 0.5;
      bowlingImpact -= 0.5;
    }

    // Apply player-specific adjustments
    if (striker && ANURAAG_IDS.includes(striker.id)) battingImpact *= 1.5;
    if (striker && PRASHANT_IDS.includes(striker.id)) battingImpact *= 0.5;
    if (bowler && ANURAAG_IDS.includes(bowler.id)) bowlingImpact *= 1.5;
    if (bowler && PRASHANT_IDS.includes(bowler.id)) bowlingImpact *= 0.5;

    battingMomentum += battingImpact;
    bowlingMomentum += bowlingImpact;
  });

  // Analyze the last over for over-specific momentum
  const lastOverBalls = recentBalls.length > 6 ? recentBalls.slice(-6) : recentBalls;
   lastOverBalls.forEach(ball => {
    if (ball.runs >= 4) overMomentum += ball.runs;
    if (ball.event === 'w') overMomentum -= 5;
    if (ball.runs === 0) overMomentum -= 1;
  });

  return {
    battingMomentum: Math.max(-10, Math.min(10, battingMomentum)),
    bowlingMomentum: Math.max(-10, Math.min(10, bowlingMomentum)),
    overMomentum: Math.max(-10, Math.min(10, overMomentum)),
  };
}

export function calculateComplexity(
  pressure: PressureMetrics,
  momentum: MomentumState,
  phase: MatchPhase
): number {
  let complexity = 1; // Base complexity

  // Phase-based complexity
  if (phase === 'DEATH_OVERS') complexity += 3;
  if (phase === 'POWERPLAY') complexity += 1;

  // Pressure-based complexity
  if (pressure.requiredRunRate > 12) complexity += 2;
  if (pressure.requiredRunRate > 15) complexity += 1; // Extreme pressure
  if (pressure.wicketsInHand <= 3) complexity += 2;

  // Momentum-based complexity
  if (Math.abs(momentum.battingMomentum) > 7) complexity += 1;

  return Math.min(10, Math.max(1, Math.round(complexity)));
}

export function updateContextAfterBall(context: CricketContext, outcome: any): CricketContext {
    const newContext = cloneDeep(context);
    
    // This is a simplified update. A real implementation would be more complex.
    newContext.ball++;
    if (newContext.ball === 6) {
        newContext.over++;
        newContext.ball = 0;
    }

    if (outcome.runs) {
        (newContext.match as any).innings[newContext.innings - 1].score += outcome.runs;
    }
    if (outcome.type === 'WICKET') {
        (newContext.match as any).innings[newContext.innings - 1].wickets++;
    }

    // Recalculate pressure and momentum
    const updatedMatch = newContext.match;
    const updatedInnings = updatedMatch.innings[newContext.innings - 1];
    newContext.pressure = calculatePressureMetrics(updatedMatch, updatedInnings);
    newContext.momentum = trackMomentum(updatedInnings.balls, newContext.striker, newContext.bowler);
    newContext.lastPatternId = context.lastPatternId;

    return newContext;
}
