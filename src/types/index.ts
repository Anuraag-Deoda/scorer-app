import { z } from 'zod';

export interface Player {
  id: number;
  name: string;
  rating?: number;
  isSubstitute?: boolean;
  isImpactPlayer?: boolean;
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
  status: 'pending' | 'inprogress' | 'finished';
  result?: string;
}

export type BallEvent = 'run' | 'w' | 'wd' | 'nb' | 'lb' | 'b';

export interface MatchSettings {
  teamNames: [string, string];
  oversPerInnings: number;
  toss: {
    winner: string;
    decision: 'bat' | 'bowl';
  };
}

export interface BallDetails {
    event: BallEvent;
    runs: number;
    extras: number;
    wicketType?: string;
    fielderId?: number;
}

// AI Flow Schemas

export const GenerateMatchCommentaryInputSchema = z.object({
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
