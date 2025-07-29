import { Match, Player, Team } from '@prisma/client';

// Represents the broader context of the cricket match
export interface CricketContext {
  match: Match;
  innings: number;
  over: number;
  ball: number;
  battingTeam: Team & { players: Player[] };
  bowlingTeam: Team & { players: Player[] };
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  // Analysis components
  pressure: PressureMetrics;
  momentum: MomentumState;
  phase: MatchPhase;
  complexity: number; // Scale of 1-10
}

// Metrics to quantify pressure on the batting side
export interface PressureMetrics {
  requiredRunRate: number;
  currentRunRate: number;
  dotBallPressure: number; // Rolling count of recent dot balls
  boundaryPressure: number; // How many balls since last boundary
  wicketsInHand: number;
}

// Represents the momentum of the game
export interface MomentumState {
  battingMomentum: number; // -10 (collapse) to +10 (dominant)
  bowlingMomentum: number; // -10 (leaking runs) to +10 (dominant)
  overMomentum: number; // Momentum shift in the current over
}

// Defines the phases of a T20 match
export type MatchPhase = 'POWERPLAY' | 'MIDDLE_OVERS' | 'DEATH_OVERS';

// The core interface for any simulation strategy
export interface SimulationStrategy {
  name: string;
  canHandle(context: CricketContext): boolean;
  simulate(context: CricketContext): Promise<OverSimulationResult>;
}

// The result of a single over simulation
export interface OverSimulationResult {
  outcomes: BallOutcome[];
  commentary: string;
  cost: number; // Cost in cents/tokens for this simulation
  debug: Record<string, any>; // For logging strategy-specific data
}

// Represents the outcome of a single ball
export type BallOutcome =
  | { type: 'DOT' }
  | { type: 'SINGLE'; runs: 1 }
  | { type: 'DOUBLE'; runs: 2 }
  | { type: 'TRIPLE'; runs: 3 }
  | { type: 'FOUR'; runs: 4 }
  | { type: 'SIX'; runs: 6 }
  | { type: 'WICKET'; wicketType: WicketType }
  | { type: 'WIDE'; runs: 1 }
  | { type: 'NO_BALL'; runs: 1 };

export type WicketType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED';
