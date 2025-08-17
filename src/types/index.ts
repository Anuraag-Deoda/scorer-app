import { z } from 'zod';

// Enums for player roles and bowling styles
export enum PlayerRole {
  Batsman = 'Batsman',
  Bowler = 'Bowler',
  AllRounder = 'All-rounder',
  WicketKeeper = 'Wicket Keeper',
}

export enum BowlingStyle {
  Fast = 'Fast',
  Medium = 'Medium',
  LegSpin = 'Leg Spin',
  OffSpin = 'Off Spin',
  LeftArmOrthodox = 'Left-arm Orthodox', // Added left-arm spin
  LeftArmChinaman = 'Left-arm Chinaman', // Added left-arm wrist spin
  RightArmFastMedium = 'Right-arm Fast-Medium', // More specific pace types
  RightArmMediumFast = 'Right-arm Medium-Fast',
  RightArmMedium = 'Right-arm Medium',
  LeftArmFast = 'Left-arm Fast',
  LeftArmMediumFast = 'Left-arm Medium-Fast',
  LeftArmMedium = 'Left-arm Medium',
}

export enum MatchType {
  T20 = 'T20',
  TenOvers = '10 Overs',
  FiveOvers = '5 Overs',
  TwoOvers = '2 Overs',
  FiftyOvers = '50 Overs',
}

export interface Player {
  id: number;
  name: string;
  rating?: number;
  isSubstitute?: boolean;
  isImpactPlayer?: boolean;
  role?: PlayerRole; // Added role field
  bowlingStyle?: BowlingStyle; // Added bowlingStyle field
  batting: {
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    status: 'not out' | 'out' | 'did not bat';
    outDetails?: string;
    strikeRate: number;
  };
  bowling: {
    ballsBowled: number;
    runsConceded: number;
    maidens: number;
    wickets: number;
    economyRate: number;
  };
}

export interface Team {
  id: number;
  name: string;
  players: Player[];
  impactPlayerUsed?: boolean;
}

export interface FielderPlacement {
  playerId: number;
  position: string;
}

export interface Ball {
  event: BallEvent;
  runs: number;
  extras: number;
  isWicket: boolean;
  wicketType?: string;
  fielderId?: number;
  batsmanId: number;
  bowlerId: number;
  display: string;
  over?: number;
}

export interface Innings {
  battingTeam: Team;
  bowlingTeam: Team;
  score: number;
  wickets: number;
  overs: number;
  ballsThisOver: number;
  timeline: Ball[];
  fallOfWickets: {
    wicket: number;
    score: number;
    over: number;
    playerOut: string;
  }[];
  currentPartnership: {
    batsman1: number;
    batsman2: number;
    runs: number;
    balls: number;
  }
  batsmanOnStrike: number;
  batsmanNonStrike: number;
  currentBowler: number;
  fieldPlacements?: FielderPlacement[];
  isFreeHit?: boolean;
  partnerships?: Array<{
    batsman1: number;
    batsman2: number;
    runs: number;
    balls: number;
  }>;
}

export interface Match {
  id: string;
  teams: [Team, Team];
  oversPerInnings: number;
  toss: {
    winner: string;
    decision: 'bat' | 'bowl';
  };
  innings: Innings[];
  currentInnings: 1 | 2;
  status: 'pending' | 'inprogress' | 'finished' | 'superover';
  result?: string;
  matchType: MatchType;
  superOver?: {
    innings: Innings[];
    currentInnings: 1 | 2;
  };
  specialPlayerIds?: {
    anuraagIds: number[];
    prashantIds: number[];
    harshalIds: number[];
  };
  rainSimulation?: {
    probability: number; // Rain probability percentage (0-100)
    willRain: boolean; // Whether rain will occur based on probability
    interruptionOver?: number; // At which over rain will interrupt (random)
    interruptionInnings?: 1 | 2; // Which innings will be affected
    originalTarget?: number; // Original target for DLS calculation
    originalOvers?: number; // Original overs for DLS calculation
    dlsTarget?: number; // Revised target after rain
    dlsOvers?: number; // Revised overs after rain
    rainMessage?: string; // Message about rain interruption
  };
}

export type BallEvent = 'run' | 'w' | 'wd' | 'nb' | 'lb' | 'b';

export interface MatchSettings {
  teamNames: [string, string];
  oversPerInnings: number;
  toss: {
    winner: string;
    decision: 'bat' | 'bowl';
  };
  matchType: MatchType;
  specialPlayerIds?: {
    anuraagIds: number[];
    prashantIds: number[];
    harshalIds: number[];
  };
  rainProbability?: number; // Rain probability percentage (0-100)
}

export interface BallDetails {
    event: BallEvent;
    runs: number;
    extras: number;
    wicketType?: string;
    fielderId?: number;
}

export interface MatchSituation {
  innings: number;
  battingTeamName: string;
  bowlingTeamName: string;
  oversLeft: number;
  target?: number;
  runsNeeded?: number;
  ballsRemaining?: number;
  isChasing: boolean;
}

// AI Flow Schemas

export const GenerateMatchCommentaryInputSchema = z.object({
  ball: z.any().describe('The ball object with event details.'),
  batsman: z.string().describe('The name of the batsman on strike.'),
  bowler: z.string().describe('The name of the bowler.'),
  fielder: z.string().optional().describe('The name of the fielder involved in a wicket.'),
  matchState: z.string().describe('The current state of the match.'),
});
export type GenerateMatchCommentaryInput = z.infer<typeof GenerateMatchCommentaryInputSchema>;

export const GenerateMatchCommentaryOutputSchema = z.object({
  commentary: z.string().describe('The generated match commentary.'),
});
export type GenerateMatchCommentaryOutput = z.infer<typeof GenerateMatchCommentaryOutputSchema>;


const BallEventSchema = z.enum(['run', 'w', 'wd', 'nb', 'lb', 'b']);
const WicketTypeSchema = z.enum(["Bowled", "Caught", "LBW", "Run Out", "Stumped", "Hit Wicket"]);

const OverBallSchema = z.object({
    event: BallEventSchema.describe("The type of event for the ball (run, wicket, wide, no ball, leg bye, bye)."),
    runs: z.number().int().min(0).max(6).describe("Runs scored off the bat. For 'lb' or 'b' events, this is 0."),
    extras: z.number().int().min(0).describe("Extra runs (for wides, no balls, leg byes, or byes)."),
    wicketType: WicketTypeSchema.optional().describe("If it was a wicket, the type of dismissal."),
    fielderId: z.number().int().optional().describe("If the dismissal involved a fielder (Caught, Run Out), their player ID."),
}).refine(data => data.event !== 'w' || (data.event === 'w' && data.wicketType !== undefined), {
    message: "Wicket type must be provided when the event is a wicket.",
    path: ["wicketType"],
}).refine(data => (data.event === 'lb' || data.event === 'b') ? data.runs === 0 : true, {
    message: "Runs off the bat must be 0 for leg byes and byes.",
    path: ["runs"],
});

export const SimulateOverInputSchema = z.object({
  matchContext: z.string().describe("A summary of the current state of the match."),
  bowlingTeamPlayerIds: z.string().describe("A comma-separated list of player IDs for the bowling team, to be used for picking fielders."),
});
export type SimulateOverInput = z.infer<typeof SimulateOverInputSchema>;

export const SimulateOverOutputSchema = z.object({
    over: z.array(OverBallSchema).describe("An array of 6 legal deliveries representing the simulated over."),
});
export type SimulateOverOutput = z.infer<typeof SimulateOverOutputSchema>;

export const SimulateBallInputSchema = z.object({
  matchContext: z.string().describe("A summary of the current state of the match."),
  bowlingTeamPlayerIds: z.string().describe("A comma-separated list of player IDs for the bowling team, to be used for picking fielders."),
});
export type SimulateBallInput = z.infer<typeof SimulateBallInputSchema>;

export const SimulateBallOutputSchema = z.object({
    event: BallEventSchema.describe("The type of event for the ball (run, wicket, wide, no ball, leg bye, bye)."),
    runs: z.number().int().min(0).max(6).describe("Runs scored off the bat. For 'lb' or 'b' events, this is 0."),
    extras: z.number().int().min(0).describe("Extra runs (for wides, no balls, leg byes, or byes)."),
    wicketType: WicketTypeSchema.optional().describe("If it was a wicket, the type of dismissal."),
    fielderId: z.number().int().optional().describe("If the dismissal involved a fielder (Caught, Run Out), their player ID."),
});
export type SimulateBallOutput = z.infer<typeof SimulateBallOutputSchema>;

export interface PlayerStats {
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  matches: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  ballsBowled: number;
  runsConceded: number;
  maidens: number;
  average: number;
  strikeRate: number;
  economyRate: number;
  bestBowling?: string;
  bestBatting?: number;
}

export interface TournamentTeam {
  id: number;
  name: string;
  logo?: string; // Team logo URL (SVG or PNG)
  homeGround?: string;
  players: number[]; // Array of player IDs
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesTied: number;
  netRunRate: number;
  runsScored: number;
  runsConceded: number;
  oversFaced: number;
  oversBowled: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  team1Id: number;
  team2Id: number;
  team1Name: string;
  team2Name: string;
  matchNumber: number;
  round: 'group' | 'final' | 'qualifier1' | 'eliminator' | 'qualifier2';
  status: 'pending' | 'inprogress' | 'finished' | 'paused';
  venue?: string; // team home ground or Neutral
  result?: string;
  winnerTeamId?: number;
  loserTeamId?: number;
  matchData?: Match; // Full match data for statistics
  scheduledDate?: Date;
  completedDate?: Date;
}

export interface TournamentAwards {
  playerOfSeriesId?: number;
  playerOfSeriesName?: string;
  bestPartnership?: {
    player1Id: number;
    player1Name: string;
    player2Id: number;
    player2Name: string;
    teamId: number;
    teamName: string;
    runs: number;
    matchId: string;
    matchNumber: number;
  };
  categories?: {
    orangeCapTop5?: number[]; // playerIds by runs
    purpleCapTop5?: number[]; // playerIds by wickets
    bestStrikeRateTop5?: number[];
    bestEconomyTop5?: number[];
    bestAvgBatTop5?: number[]; // by runs per match
    bestAvgBowlTop5?: number[]; // by wickets per match
    explosiveTop5?: number[];
  };
}

export type TournamentType = 'round-robin-3' | 'round-robin-2' | 'knockout' | 'ipl-style';

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  numberOfTeams: number;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  status: 'draft' | 'active' | 'completed';
  startDate?: Date;
  endDate?: Date;
  createdDate: Date;
  updatedDate: Date;
  settings: {
    tournamentType: TournamentType;
    oversPerInnings: number;
    matchType: MatchType;
    groupStageRounds: number; // How many times teams play each other
    topTeamsAdvance: number; // How many teams advance to finals
  };
  awards?: TournamentAwards;
}
