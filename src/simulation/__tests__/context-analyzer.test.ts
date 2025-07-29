import { describe, it, expect } from 'vitest';
import { analyzeContext } from '../context-analyzer';
import { CricketContext } from '../types';
import { Match, Innings, Ball, Team, Player } from '@prisma/client';

// Mock data for testing
const mockPlayer = (id: number, name: string, rating: number): Player => ({ id, name, rating });
const mockTeam = (id: number, name: string, players: Player[]): Team & { players: Player[] } => ({ id, name, players });
const mockBall = (runs: number, event: string): Ball => ({ id: 0, inningsId: 0, overNumber: 0, ballNumber: 0, batsmanId: 0, bowlerId: 0, runs, extras: 0, event, wicketType: null, fielderId: null });
const mockInnings = (overs: number, score: number, wickets: number, balls: Ball[]): Innings & { balls: Ball[] } => ({ id: 0, matchId: 0, battingTeamId: 0, bowlingTeamId: 0, overs, score, wickets, balls });
const mockMatch = (oversPerInnings: number, innings: (Innings & { balls: Ball[] })[]): Match & { innings: (Innings & { balls: Ball[] })[] } => ({ id: 0, date: new Date(), team1Id: 0, team2Id: 0, result: null, status: 'inprogress', oversPerInnings, tossWinnerId: 0, tossDecision: 'bat', innings });

describe('ContextAnalyzer', () => {
  it('should correctly identify the POWERPLAY phase', () => {
    const innings = mockInnings(3, 30, 0, []);
    const match = mockMatch(20, [innings]);
    const context = analyzeContext(match, innings, mockTeam(0, 'Team A', []), mockTeam(1, 'Team B', []), mockPlayer(0, 'Batsman', 80), mockPlayer(1, 'Non-striker', 75), mockPlayer(2, 'Bowler', 85));
    expect(context.phase).toBe('POWERPLAY');
  });

  it('should correctly identify the MIDDLE_OVERS phase', () => {
    const innings = mockInnings(10, 80, 2, []);
    const match = mockMatch(20, [innings]);
    const context = analyzeContext(match, innings, mockTeam(0, 'Team A', []), mockTeam(1, 'Team B', []), mockPlayer(0, 'Batsman', 80), mockPlayer(1, 'Non-striker', 75), mockPlayer(2, 'Bowler', 85));
    expect(context.phase).toBe('MIDDLE_OVERS');
  });

  it('should correctly identify the DEATH_OVERS phase', () => {
    const innings = mockInnings(16, 150, 4, []);
    const match = mockMatch(20, [innings]);
    const context = analyzeContext(match, innings, mockTeam(0, 'Team A', []), mockTeam(1, 'Team B', []), mockPlayer(0, 'Batsman', 80), mockPlayer(1, 'Non-striker', 75), mockPlayer(2, 'Bowler', 85));
    expect(context.phase).toBe('DEATH_OVERS');
  });

  it('should calculate pressure metrics correctly', () => {
    const innings1 = { ...mockInnings(20, 180, 6, []), id: 1 };
    const innings2 = { ...mockInnings(10, 90, 2, []), id: 2 };
    const match = mockMatch(20, [innings1, innings2]);
    const context = analyzeContext(match, innings2, mockTeam(0, 'Team A', []), mockTeam(1, 'Team B', []), mockPlayer(0, 'Batsman', 80), mockPlayer(1, 'Non-striker', 75), mockPlayer(2, 'Bowler', 85));
    
    expect(context.pressure.wicketsInHand).toBe(8);
    expect(context.pressure.currentRunRate).toBeCloseTo(9.0);
    expect(context.pressure.requiredRunRate).toBeCloseTo(9.1);
  });

  it('should calculate momentum correctly', () => {
    const balls = [
        mockBall(4, 'run'), mockBall(6, 'run'), mockBall(1, 'run'),
        mockBall(0, 'run'), mockBall(0, 'run'), mockBall(0, 'w')
    ];
    const innings = mockInnings(1, 11, 1, balls);
    const match = mockMatch(20, [innings]);
    const context = analyzeContext(match, innings, mockTeam(0, 'Team A', []), mockTeam(1, 'Team B', []), mockPlayer(0, 'Batsman', 80), mockPlayer(1, 'Non-striker', 75), mockPlayer(2, 'Bowler', 85));

    expect(context.momentum.battingMomentum).toBeGreaterThan(0);
    expect(context.momentum.bowlingMomentum).toBeGreaterThan(0);
    expect(context.momentum.overMomentum).toBeGreaterThan(0);
  });
});
