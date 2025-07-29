import { Match, Player, Team, Innings, Ball } from '@prisma/client';
import {
  CricketContext,
  PressureMetrics,
  MomentumState,
  MatchPhase,
} from './types';
import { calculateCurrentRunRate, calculateRequiredRunRate } from '../lib/cricket-logic';

// --- Main Analyzer ---

export function analyzeContext(
  match: Match & { innings: (Innings & { balls: Ball[] })[] },
  currentInnings: Innings & { balls: Ball[] },
  battingTeam: Team & { players: Player[] },
  bowlingTeam: Team & { players: Player[] },
  striker: Player,
  nonStriker: Player,
  bowler: Player
  // TODO: Add historical data for more accurate analysis
): CricketContext {
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
  match: Match & { innings: (Innings & { balls: Ball[] })[] },
  currentInnings: Innings & { balls: Ball[] }
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

  return {
    requiredRunRate,
    currentRunRate,
    dotBallPressure: 0, // Placeholder
    boundaryPressure: 0, // Placeholder
    wicketsInHand: 10 - wickets,
  };
}

// This is a simplified momentum tracker. A real implementation would be more stateful.
export function trackMomentum(recentBalls: Ball[]): MomentumState {
  let battingMomentum = 0;
  let bowlingMomentum = 0;
  let overMomentum = 0;

  // Analyze the last 12 balls for overall momentum
  const last12Balls = recentBalls.slice(-12);
  last12Balls.forEach(ball => {
    if (ball.runs >= 4) battingMomentum += ball.runs; // 4 for a four, 6 for a six
    if (ball.event === 'w') bowlingMomentum += 10;
    if (ball.runs === 0) bowlingMomentum += 1;
    if (ball.runs === 1) {
      battingMomentum += 0.5;
      bowlingMomentum -= 0.5;
    }
  });

  // Analyze the last over for over-specific momentum
  const lastOverBalls = recentBalls.slice(-6);
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
