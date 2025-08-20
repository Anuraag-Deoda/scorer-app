"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Calendar, Target, TrendingUp, Award, Play, CheckCircle, Clock, XCircle, BarChart, Zap, CloudRain, Cloud, Sun, Gavel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createMatch } from '@/lib/cricket-logic';
import { DEFAULT_PLAYERS } from '@/data/default-players';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, XAxis, YAxis, CartesianGrid, BarChart as ReBarChart } from 'recharts';
import type { Tournament, TournamentTeam, TournamentMatch, PlayerStats, Match, MatchSettings } from '@/types';
import NewMatchForm from './new-match-form';
import ScoringInterface from './scoring-interface';
import MatchScorecardDialog from './match-scorecard-dialog';
import PlayerDataDisplay from './player-data-display';
import TournamentAuction from './tournament-auction';
import { updatePlayerHistoriesFromMatch } from '@/lib/player-stats-store';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

interface TournamentDashboardProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
  onBackToTournaments: () => void;
}

function computeIndividualPerformances(tournament: Tournament) {
  let bestBatting: { playerName: string, runs: number, teamName: string, balls: number } | null = null;
  let bestBowling: { playerName: string, wickets: number, runs: number, teamName: string, overs: number, maidens: number, economy: number } | null = null;

  tournament.matches.forEach(match => {
    if (match.status === 'finished' && match.matchData) {
      match.matchData.innings.forEach((innings, index) => {
        // Check batting performances
        innings.battingTeam.players.forEach(player => {
          if (player.batting.runs > 0) {
            if (!bestBatting || player.batting.runs > bestBatting.runs) {
              bestBatting = {
                playerName: player.name,
                runs: player.batting.runs,
                teamName: innings.battingTeam.name,
                balls: player.batting.ballsFaced,
              };
            }
          }
        });

        // Check bowling performances
        innings.bowlingTeam.players.forEach(player => {
          if (player.bowling.wickets > 0) {
            if (!bestBowling || 
                player.bowling.wickets > bestBowling.wickets || 
                (player.bowling.wickets === bestBowling.wickets && player.bowling.runsConceded < bestBowling.runs)) {
              bestBowling = {
                playerName: player.name,
                wickets: player.bowling.wickets,
                runs: player.bowling.runsConceded,
                teamName: innings.bowlingTeam.name,
                overs: Math.floor(player.bowling.ballsBowled / 6) + (player.bowling.ballsBowled % 6) / 10,
                maidens: player.bowling.maidens,
                economy: player.bowling.economyRate,
              };
            }
          }
        });
      });
    }
  });

  return { bestBatting, bestBowling };
}

function computeBestPartnership(tournament: Tournament) {
  const allPartnerships: Array<{
    player1Name: string;
    player2Name: string;
    player1Runs: number;
    player2Runs: number;
    teamName: string;
    runs: number;
    matchNumber: number;
  }> = [];
 
  tournament.matches.forEach((match) => {
    if (match.status === "finished" && match.matchData) {
      match.matchData.innings.forEach((innings, index) => {
        let currentPartnership = {
          batsman1: -1,
          batsman2: -1,
          runs: 0,
          balls: 0,
          player1Runs: 0,
          player2Runs: 0,
        };
 
        innings.timeline.forEach((ball) => {
          if (
            currentPartnership.batsman1 !== ball.batsmanId &&
            currentPartnership.batsman2 !== ball.batsmanId
          ) {
            if (currentPartnership.runs > 0) {
              const batsman1 = innings.battingTeam.players.find(
                (p) => p.id === currentPartnership.batsman1
              );
              const batsman2 = innings.battingTeam.players.find(
                (p) => p.id === currentPartnership.batsman2
              );
              if (batsman1 && batsman2) {
                allPartnerships.push({
                  player1Name: batsman1.name,
                  player2Name: batsman2.name,
                  player1Runs: currentPartnership.player1Runs,
                  player2Runs: currentPartnership.player2Runs,
                  teamName: innings.battingTeam.name,
                  runs: currentPartnership.runs,
                  matchNumber: match.matchNumber,
                });
              }
            }
            currentPartnership = {
              batsman1: ball.batsmanId,
              batsman2:
                ball.batsmanId === currentPartnership.batsman1
                  ? currentPartnership.batsman2
                  : currentPartnership.batsman1,
              runs: 0,
              balls: 0,
              player1Runs: 0,
              player2Runs: 0,
            };
          }
 
          currentPartnership.runs += ball.runs;
          if (ball.batsmanId === currentPartnership.batsman1) {
            currentPartnership.player1Runs += ball.runs;
          } else {
            currentPartnership.player2Runs += ball.runs;
          }
        });
 
        if (currentPartnership.runs > 0) {
          const batsman1 = innings.battingTeam.players.find(
            (p) => p.id === currentPartnership.batsman1
          );
          const batsman2 = innings.battingTeam.players.find(
            (p) => p.id === currentPartnership.batsman2
          );
          if (batsman1 && batsman2) {
            allPartnerships.push({
              player1Name: batsman1.name,
              player2Name: batsman2.name,
              player1Runs: currentPartnership.player1Runs,
              player2Runs: currentPartnership.player2Runs,
              teamName: innings.battingTeam.name,
              runs: currentPartnership.runs,
              matchNumber: match.matchNumber,
            });
          }
        }
      });
    }
  });
 
  return allPartnerships.sort((a, b) => b.runs - a.runs).slice(0, 5);
}

function computeTopPerformances(tournament: Tournament) {
  const topBatting: Array<{ playerName: string, runs: number, teamName: string, balls: number, fours: number, sixes: number }> = [];
  const topBowling: Array<{ playerName: string, wickets: number, runs: number, teamName: string, overs: number, maidens: number, economy: number }> = [];

  tournament.matches.forEach(match => {
    if (match.status === 'finished' && match.matchData) {
      match.matchData.innings.forEach((innings, index) => {
        // Collect batting performances
        innings.battingTeam.players.forEach(player => {
          if (player.batting.runs > 0) {
            topBatting.push({
              playerName: player.name,
              runs: player.batting.runs,
              teamName: innings.battingTeam.name,
              balls: player.batting.ballsFaced,
              fours: player.batting.fours,
              sixes: player.batting.sixes,
            });
          }
        });

        // Collect bowling performances
        innings.bowlingTeam.players.forEach(player => {
          if (player.bowling.wickets > 0) {
            topBowling.push({
              playerName: player.name,
              wickets: player.bowling.wickets,
              runs: player.bowling.runsConceded,
              teamName: innings.bowlingTeam.name,
              overs: Math.floor(player.bowling.ballsBowled / 6) + (player.bowling.ballsBowled % 6) / 10,
              maidens: player.bowling.maidens,
              economy: player.bowling.economyRate,
            });
          }
        });
      });
    }
  });

  // Sort and get top 3
  const sortedBatting = topBatting.sort((a, b) => b.runs - a.runs).slice(0, 3);
  const sortedBowling = topBowling.sort((a, b) => {
    if (a.wickets !== b.wickets) return b.wickets - a.wickets;
    return a.runs - b.runs;
  }).slice(0, 3);

  return { topBatting: sortedBatting, topBowling: sortedBowling };
}

function computeTournamentAwards(tournament: Tournament, playerStats: PlayerStats[]): {
  explosiveBatsman: (PlayerStats & { explosiveness: number }) | null;
  bestAvgBatsman: (PlayerStats & { batAvg: number }) | null;
  bestAvgBowler: (PlayerStats & { bowlAvgPerMatch: number }) | null;
} {
  const awards = {
    explosiveBatsman: null as (PlayerStats & { explosiveness: number }) | null,
    bestAvgBatsman: null as (PlayerStats & { batAvg: number }) | null,
    bestAvgBowler: null as (PlayerStats & { bowlAvgPerMatch: number }) | null,
  };

  const byTeamName = (id: number) => tournament.teams.find(t => t.id === id)?.name || '';

  // Explosive: boundaries density = (4s*4 + 6s*6)/ballsFaced with min balls
  const battingCandidates = playerStats.filter(p => p.ballsFaced >= 20);
  const explosive = [...battingCandidates]
    .map(p => ({ ...p, explosiveness: (p.fours * 4 + p.sixes * 6) / Math.max(1, p.ballsFaced) }))
    .sort((a, b) => b.explosiveness - a.explosiveness)[0];
  awards.explosiveBatsman = explosive || null;

  // Best average batsman: runs/matches with min matches
  const bestAvgBat = [...playerStats]
    .filter(p => p.matches >= 2 && p.ballsFaced > 0)
    .map(p => ({ ...p, batAvg: p.runs / p.matches }))
    .sort((a, b) => b.batAvg - a.batAvg)[0];
  awards.bestAvgBatsman = bestAvgBat || null;

  // Best average bowler: wickets/matches with min matches
  const bestAvgBowl = [...playerStats]
    .filter(p => p.matches >= 2 && p.ballsBowled > 0)
    .map(p => ({ ...p, bowlAvgPerMatch: p.wickets / p.matches }))
    .sort((a, b) => b.bowlAvgPerMatch - a.bowlAvgPerMatch)[0];
  awards.bestAvgBowler = bestAvgBowl || null;

  return awards;
}

function computeLeaderboards(stats: PlayerStats[]) {
  const byRuns = [...stats].sort((a, b) => b.runs - a.runs).slice(0, 5);
  const byWkts = [...stats].sort((a, b) => b.wickets - a.wickets).slice(0, 5);
  const bySR = [...stats].filter(p => p.ballsFaced >= 20).sort((a, b) => b.strikeRate - a.strikeRate).slice(0, 5);
  const byEcon = [...stats].filter(p => p.ballsBowled >= 12).sort((a, b) => a.economyRate - b.economyRate).slice(0, 5);
  const byAvgBat = [...stats].filter(p => p.matches >= 2 && p.ballsFaced > 0).map(p => ({...p, avg: p.runs / p.matches})).sort((a, b) => b.avg - a.avg).slice(0, 5);
  const byAvgBowl = [...stats].filter(p => p.matches >= 2 && p.ballsBowled > 0).map(p => ({...p, avg: p.wickets / p.matches})).sort((a, b) => b.avg - a.avg).slice(0, 5);
  const explosive = [...stats].filter(p => p.ballsFaced >= 20).map(p => ({...p, ei: (p.fours*4 + p.sixes*6)/Math.max(1,p.ballsFaced)})).sort((a,b)=> b.ei - a.ei).slice(0,5);
  return { byRuns, byWkts, bySR, byEcon, byAvgBat, byAvgBowl, explosive };
}

function normalize(values: number[], maxWidth = 100) {
  const max = Math.max(...values, 1);
  return values.map(v => Math.round((v / max) * maxWidth));
}

function computeFantasyPointsForMatch(match: Match): Array<{ playerId: number; playerName: string; points: number }> {
  const totals: Record<number, { name: string; points: number }> = {};
  const add = (id: number, name: string, pts: number) => {
    totals[id] = totals[id] || { name, points: 0 };
    totals[id].points += pts;
  };
  const allPlayers = match.teams[0].players.concat(match.teams[1].players);
  // Index by id for quick lookup
  const idToPlayer = new Map<number, typeof allPlayers[number]>(allPlayers.map(p => [p.id, p] as const));
  match.innings.forEach(() => {
    allPlayers.forEach(p => {
      // batting
      const rp = p.batting.runs; const bf = p.batting.ballsFaced;
      if (rp || bf) add(p.id, p.name, rp + Math.floor(rp/2));
      if (p.batting.fours) add(p.id, p.name, p.batting.fours * 1);
      if (p.batting.sixes) add(p.id, p.name, p.batting.sixes * 2);
      // bowling
      const wk = p.bowling.wickets; const rc = p.bowling.runsConceded; const bb = p.bowling.ballsBowled;
      if (wk) add(p.id, p.name, wk * 25);
      if (bb >= 12 && (rc/(bb/6 || 1)) < 6) add(p.id, p.name, 10);
    });
  });
  return Object.entries(totals).map(([id, v]) => ({ playerId: Number(id), playerName: v.name, points: v.points })).sort((a,b)=> b.points - a.points).slice(0,5);
}

function computeFantasyPointsForTournament(matches: TournamentMatch[]): Array<{ playerId: number; playerName: string; points: number }> {
  const totals: Record<number, { name: string; points: number }> = {};
  const add = (id: number, name: string, pts: number) => {
    totals[id] = totals[id] || { name, points: 0 };
    totals[id].points += pts;
  };
  matches.filter(m => m.status === 'finished' && m.matchData).forEach(m => {
    const match = m.matchData as Match;
    const allPlayers = match.teams[0].players.concat(match.teams[1].players);
    allPlayers.forEach(p => {
      const rp = p.batting.runs; const bf = p.batting.ballsFaced;
      if (rp || bf) add(p.id, p.name, rp + Math.floor(rp/2));
      if (p.batting.fours) add(p.id, p.name, p.batting.fours * 1);
      if (p.batting.sixes) add(p.id, p.name, p.batting.sixes * 2);
      const wk = p.bowling.wickets; const rc = p.bowling.runsConceded; const bb = p.bowling.ballsBowled;
      if (wk) add(p.id, p.name, wk * 25);
      if (bb >= 12 && (rc/(bb/6 || 1)) < 6) add(p.id, p.name, 10);
    });
  });
  return Object.entries(totals).map(([id, v]) => ({ playerId: Number(id), playerName: v.name, points: v.points })).sort((a,b)=> b.points - a.points).slice(0,5);
}

export default function TournamentDashboard({ tournament, onTournamentUpdate, onBackToTournaments }: TournamentDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [showTossInterface, setShowTossInterface] = useState(false);
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [rainProbability, setRainProbability] = useState<number>(0);
  const [currentTournamentMatchId, setCurrentTournamentMatchId] = useState<string | null>(null);
  const [showPlayerData, setShowPlayerData] = useState(false);
  const { toast } = useToast();

  // Move autoSaveMatch above all its usages
  const autoSaveMatch = (matchData: Match) => {
    if (!matchData || !currentTournamentMatchId) return;
    
    // Save to localStorage as backup
    const matchBackup = {
      tournamentId: tournament.id,
      matchId: currentTournamentMatchId,
      matchData: matchData,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(`match_backup_${tournament.id}_${currentTournamentMatchId}`, JSON.stringify(matchBackup));
    
    // Update tournament match data
    const updatedMatches = tournament.matches.map(m => 
      m.id === currentTournamentMatchId 
        ? { ...m, matchData: matchData }
        : m
    );
    
    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
    };
    
    // Update local state immediately (don't wait for API)
    onTournamentUpdate(updatedTournament);

    // Persist to backend
    fetch(`/api/tournaments/${tournament.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches: updatedMatches }),
    }).catch(error => console.error('Failed to auto-save match to backend:', error));
  };

  useEffect(() => {
    calculatePlayerStats();
  }, [tournament]);

  // --- PATCH: Ensure playoff matches update as soon as Q1 and Eliminator are finished ---
  useEffect(() => {
    // Only run if there are playoff matches
    const playoffRounds = ["qualifier1", "eliminator", "qualifier2", "final"];
    const matchesByRound = Object.fromEntries(
      playoffRounds.map(r => [r, tournament.matches.find(m => m.round === r)])
    );
    console.info('Checking playoff matches:', matchesByRound);
    const { qualifier1: q1, eliminator: elim, qualifier2: q2, final: finalMatch } = matchesByRound;

    // Only proceed if Q1 and Eliminator are finished, and Q2 or Final have TBD teams
    if (
      q1 && elim && q2 && finalMatch &&
      q1.status === "finished" && elim.status === "finished" &&
      (
        q2.team1Name === "TBD" || q2.team2Name === "TBD" ||
        finalMatch.team1Name === "TBD" || finalMatch.team2Name === "TBD"
      )
    ) {
      // Determine correct teams
      const finishedQ1 = q1;
      const finishedElim = elim;
      const finishedQ2 = q2.status === "finished" ? q2 : null;

      // Find winner/loser team IDs from Q1 and Eliminator
      const q1WinnerId = finishedQ1.winnerTeamId;
      const q1LoserId = finishedQ1.loserTeamId;
      const elimWinnerId = finishedElim.winnerTeamId;

      // Defensive: Only update if all IDs are present
      if (q1WinnerId && q1LoserId && elimWinnerId) {
        const q2Team1Id = elimWinnerId;
        const q2Team2Id = q1LoserId;
        const q2Team1Name = tournament.teams.find(t => t.id === q2Team1Id)?.name || "TBD";
        const q2Team2Name = tournament.teams.find(t => t.id === q2Team2Id)?.name || "TBD";

        // For Final, need Q1 winner and Q2 winner (if Q2 finished, else keep TBD)
        const finalTeam1Id = q1WinnerId;
        const finalTeam1Name = tournament.teams.find(t => t.id === finalTeam1Id)?.name || "TBD";
        let finalTeam2Id = finalMatch.team2Id;
        let finalTeam2Name = finalMatch.team2Name;
        if (q2.status === "finished" && q2.winnerTeamId) {
          finalTeam2Id = q2.winnerTeamId;
          finalTeam2Name = tournament.teams.find(t => t.id === finalTeam2Id)?.name || "TBD";
        } else {
          finalTeam2Id = q2Team1Id && q2Team2Id ? undefined : finalMatch.team2Id;
          finalTeam2Name = "TBD";
        }

        // Only update if values have changed
        if (
          q2.team1Id !== q2Team1Id || q2.team2Id !== q2Team2Id ||
          q2.team1Name !== q2Team1Name || q2.team2Name !== q2Team2Name ||
          finalMatch.team1Id !== finalTeam1Id || finalMatch.team1Name !== finalTeam1Name ||
          finalMatch.team2Id !== finalTeam2Id || finalMatch.team2Name !== finalTeam2Name
        ) {
          const updatedMatches = tournament.matches.map(m => {
            if (m.id === q2.id) {
              return {
                ...m,
                team1Id: q2Team1Id,
                team1Name: q2Team1Name,
                team2Id: q2Team2Id,
                team2Name: q2Team2Name,
              };
            }
            if (m.id === finalMatch.id) {
              return {
                ...m,
                team1Id: finalTeam1Id,
                team1Name: finalTeam1Name,
                team2Id: finalTeam2Id,
                team2Name: finalTeam2Name,
              };
            }
            return m;
          });
          onTournamentUpdate({
            ...tournament,
            matches: updatedMatches,
          });
        }
      }
    }
  }, [tournament, onTournamentUpdate]);

  useEffect(() => {
    // Recover any lost match data from localStorage
    const recoverLostMatches = () => {
      const keys = Object.keys(localStorage);
      const matchBackupKeys = keys.filter(key => key.startsWith(`match_backup_${tournament.id}_`));
      
      if (matchBackupKeys.length > 0) {
        //console.log(`Found ${matchBackupKeys.length} match backups to check`);
        
        matchBackupKeys.forEach(key => {
          try {
            const backup = JSON.parse(localStorage.getItem(key)!);
            const matchId = backup.matchId;
            const match = tournament.matches.find(m => m.id === matchId);
            
            if (match && (!match.matchData || match.status === 'pending')) {
              console.log(`Recovering match ${matchId} from backup`);
              
              // Update match with recovered data
              const updatedMatches = tournament.matches.map(m => 
                m.id === matchId 
                  ? { ...m, status: 'paused' as const, matchData: backup.matchData }
                  : m
              );
              
              const updatedTournament = {
                ...tournament,
                matches: updatedMatches,
              };
              
              onTournamentUpdate(updatedTournament);
              
              // toast({
              //   title: "Match Data Recovered",
              //   description: `Recovered data for match ${match.matchNumber}`,
              // });
            }
          } catch (error) {
            console.error('Error recovering match from backup:', error);
          }
        });
      }
    };
    
    recoverLostMatches();
  }, [tournament.id, tournament.matches, onTournamentUpdate, toast]);

  useEffect(() => {
    // Periodic auto-save during active match play
    if (currentMatch && currentMatch.status === 'inprogress') {
      const interval = setInterval(() => {
        console.log('Auto-saving match data...');
        autoSaveMatch(currentMatch);
      }, 30000); // Save every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [currentMatch]);

  const calculatePlayerStats = () => {
    const stats: PlayerStats[] = [];
    const playerMap = new Map<number, PlayerStats>();

    console.log('=== PLAYER STATS DEBUGGING ===');
    console.log('Tournament:', tournament.name);
    console.log('Tournament teams:', tournament.teams.map(t => ({ id: t.id, name: t.name })));
    console.log('Total matches:', tournament.matches.length);
    console.log('Completed matches:', tournament.matches.filter(m => m.status === 'finished').length);
    
    // Log the first completed match structure to understand data format
    const firstCompletedMatch = tournament.matches.find(m => m.status === 'finished');
    if (firstCompletedMatch) {
      console.log('First completed match structure:', {
        id: firstCompletedMatch.id,
        hasMatchData: !!firstCompletedMatch.matchData,
        matchDataKeys: firstCompletedMatch.matchData ? Object.keys(firstCompletedMatch.matchData) : [],
        inningsCount: firstCompletedMatch.matchData?.innings?.length || 0
      });
      
      if (firstCompletedMatch.matchData?.innings) {
        firstCompletedMatch.matchData.innings.forEach((innings, index) => {
          console.log(`Innings ${index + 1} structure:`, {
            battingTeam: {
              id: innings.battingTeam.id,
              name: innings.battingTeam.name,
              playersCount: innings.battingTeam.players.length,
              firstPlayer: innings.battingTeam.players[0] ? {
                id: innings.battingTeam.players[0].id,
                name: innings.battingTeam.players[0].name,
                batting: innings.battingTeam.players[0].batting,
                bowling: innings.battingTeam.players[0].bowling
              } : null
            },
            bowlingTeam: {
              id: innings.bowlingTeam.id,
              name: innings.bowlingTeam.name,
              playersCount: innings.bowlingTeam.players.length
            }
          });
        });
      }
    }

    // Calculate stats from completed matches
    tournament.matches.forEach(match => {
      if (match.status === 'finished' && match.matchData) {
        console.log(`\nProcessing match ${match.id}:`);
        
        // Process batting and bowling stats from innings
        match.matchData.innings.forEach((innings, index) => {
          console.log(`  Processing innings ${index + 1}:`);
          
          // Get batting team players
          const battingTeam = innings.battingTeam;
          console.log(`    Batting team: ${battingTeam.name} (${battingTeam.players.length} players)`);
          
          // Find the tournament team by name instead of ID
          const tournamentTeam = tournament.teams.find(t => t.name === battingTeam.name);
          if (!tournamentTeam) {
            console.log(`    WARNING: Could not find tournament team with name "${battingTeam.name}"`);
            return;
          }
          
          battingTeam.players.forEach(player => {
            console.log(`      Player ${player.name} (ID: ${player.id}):`, {
              batting: player.batting,
              teamId: tournamentTeam.id, // Use tournament team ID
              teamName: tournamentTeam.name
            });
            
            let playerStat = playerMap.get(player.id);
            if (!playerStat) {
              // Create new player stat if it doesn't exist
              playerStat = {
                playerId: player.id,
                playerName: player.name,
                teamId: tournamentTeam.id, // Use tournament team ID
                teamName: tournamentTeam.name,
                matches: 0,
                runs: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                wickets: 0,
                ballsBowled: 0,
                runsConceded: 0,
                maidens: 0,
                average: 0,
                strikeRate: 0,
                economyRate: 0,
              };
              playerMap.set(player.id, playerStat);
              console.log(`        Created new player stat for ${player.name} in team ${tournamentTeam.name}`);
            }
            
            // Add batting stats
            playerStat.runs += player.batting.runs;
            playerStat.ballsFaced += player.batting.ballsFaced;
            playerStat.fours += player.batting.fours;
            playerStat.sixes += player.batting.sixes;
            
            console.log(`        Updated batting stats: runs=${playerStat.runs}, balls=${playerStat.ballsFaced}`);
          });

          // Get bowling team players
          const bowlingTeam = innings.bowlingTeam;
          console.log(`    Bowling team: ${bowlingTeam.name} (${bowlingTeam.players.length} players)`);
          
          // Find the tournament team by name instead of ID
          const tournamentBowlingTeam = tournament.teams.find(t => t.name === bowlingTeam.name);
          if (!tournamentBowlingTeam) {
            console.log(`    WARNING: Could not find tournament team with name "${bowlingTeam.name}"`);
            return;
          }
          
          bowlingTeam.players.forEach(player => {
            console.log(`      Player ${player.name} (ID: ${player.id}):`, {
              bowling: player.bowling,
              teamId: tournamentBowlingTeam.id, // Use tournament team ID
              teamName: tournamentBowlingTeam.name
            });
            
            let playerStat = playerMap.get(player.id);
            if (!playerStat) {
              // Create new player stat if it doesn't exist
              playerStat = {
                playerId: player.id,
                playerName: player.name,
                teamId: tournamentBowlingTeam.id, // Use tournament team ID
                teamName: tournamentBowlingTeam.name,
                matches: 0,
                runs: 0,
                ballsFaced: 0,
                fours: 0,
                sixes: 0,
                wickets: 0,
                ballsBowled: 0,
                runsConceded: 0,
                maidens: 0,
                average: 0,
                strikeRate: 0,
                economyRate: 0,
              };
              playerMap.set(player.id, playerStat);
              console.log(`        Created new player stat for ${player.name} in team ${tournamentBowlingTeam.name}`);
            }
            
            // Add bowling stats
            playerStat.wickets += player.bowling.wickets;
            playerStat.ballsBowled += player.bowling.ballsBowled;
            playerStat.runsConceded += player.bowling.runsConceded;
            playerStat.maidens += player.bowling.maidens;
            
            console.log(`        Updated bowling stats: wickets=${playerStat.wickets}, balls=${playerStat.ballsBowled}`);
          });
        });

        // Count matches for each player
        if (match.matchData.teams) {
          console.log(`    Counting matches for ${match.matchData.teams.length} teams`);
          match.matchData.teams.forEach(team => {
            // Find tournament team by name
            const tournamentTeam = tournament.teams.find(t => t.name === team.name);
            if (tournamentTeam) {
              team.players.forEach(player => {
                const playerStat = playerMap.get(player.id);
                if (playerStat) {
                  playerStat.matches += 1;
                  console.log(`      Player ${player.name} now has ${playerStat.matches} matches`);
                }
              });
            }
          });
        }
      }
    });

    // Calculate averages and rates
    playerMap.forEach(stat => {
      if (stat.wickets > 0) {
        stat.average = stat.runsConceded / stat.wickets;
      }
      if (stat.ballsFaced > 0) {
        stat.strikeRate = (stat.runs / stat.ballsFaced) * 100;
      }
      if (stat.ballsBowled > 0) {
        stat.economyRate = (stat.runsConceded / stat.ballsBowled) * 6;
      }
    });

    const finalStats = Array.from(playerMap.values());
    console.log('\n=== FINAL RESULTS ===');
    console.log('Total player stats calculated:', finalStats.length);
    console.log('Stats by team:', tournament.teams.map(team => {
      const teamPlayers = finalStats.filter(p => p.teamId === team.id);
      return {
        teamName: team.name,
        teamId: team.id,
        players: teamPlayers.length,
        playerNames: teamPlayers.map(p => p.playerName)
      };
    }));
    
    setPlayerStats(finalStats);
  };

  const startMatch = (match: TournamentMatch) => {
    setCurrentTournamentMatchId(match.id);
    resumeMatch(match);
  };

  const handleTossComplete = () => {
    if (!selectedMatch) return;

    const team1 = tournament.teams.find(t => t.id === selectedMatch.team1Id);
    const team2 = tournament.teams.find(t => t.id === selectedMatch.team2Id);
    
    if (!team1 || !team2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find team information.",
      });
      return;
    }

    // Create players for the match from tournament teams
    const createMatchPlayers = (team: TournamentTeam) => {
      return team.players.map(playerId => {
        const defaultPlayer = DEFAULT_PLAYERS.find(p => p.id === playerId);
        return {
          id: playerId,
          name: defaultPlayer?.name || 'Unknown Player',
          rating: 75, // Default rating
          isSubstitute: false,
          isImpactPlayer: false,
          batting: {
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            status: 'not out' as 'not out' | 'out' | 'did not bat',
            strikeRate: 0,
          },
          bowling: {
            ballsBowled: 0,
            runsConceded: 0,
            maidens: 0,
            wickets: 0,
            economyRate: 0,
          },
        };
      });
    };

    // Create teams with proper structure (ID 0 and 1 as expected by the system)
    const matchTeam1 = {
      id: 0,
      name: team1.name,
      players: createMatchPlayers(team1),
      impactPlayerUsed: false,
    };

    const matchTeam2 = {
      id: 1,
      name: team2.name,
      players: createMatchPlayers(team2),
      impactPlayerUsed: false,
    };

    // Ensure we have at least 2 players for batting and 1 for bowling
    if (matchTeam1.players.length < 2 || matchTeam2.players.length < 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Teams need at least 2 players for batting and 1 for bowling.",
      });
      return;
    }

    // Create match settings with rain probability
    const matchSettings = {
      teamNames: [team1.name, team2.name] as [string, string],
      oversPerInnings: tournament.settings.oversPerInnings,
      toss: { 
        winner: tossWinner, 
        decision: tossDecision 
      },
      matchType: tournament.settings.matchType,
      rainProbability: rainProbability, // Default to no rain, can be enhanced later
    };

    // Use the new createMatch function
    const matchData = createMatch([matchTeam1, matchTeam2], matchSettings);

    // Update match status to inprogress
    const updatedMatches = tournament.matches.map(m => 
      m.id === selectedMatch.id 
        ? { ...m, status: 'inprogress' as const, matchData }
        : m
    );

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      status: 'active' as const,
    };

    onTournamentUpdate(updatedTournament);
    setCurrentMatch(matchData);
    setShowTossInterface(false);
    setTossWinner('');
    setTossDecision('bat');
    setRainProbability(0);
  };

  const simulateToss = () => {
    if (!selectedMatch) return;
    
    const team1 = tournament.teams.find(t => t.id === selectedMatch.team1Id);
    const team2 = tournament.teams.find(t => t.id === selectedMatch.team2Id);
    
    if (!team1 || !team2) return;
    
    // Randomly select winner
    const winner = Math.random() < 0.5 ? team1.name : team2.name;
    setTossWinner(winner);
    
    toast({
      title: "Coin Toss Result",
      description: `${winner} won the toss!`,
    });
  };

  const handleNewMatch = (match: TournamentMatch) => {
    const team1 = tournament.teams.find(t => t.id === match.team1Id);
    const team2 = tournament.teams.find(t => t.id === match.team2Id);
    
    if (!team1 || !team2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find team information.",
      });
      return;
    }

    // Create players for the match from tournament teams
    const createMatchPlayers = (team: TournamentTeam) => {
      return team.players.map(playerId => {
        const defaultPlayer = DEFAULT_PLAYERS.find(p => p.id === playerId);
        return {
          id: playerId,
          name: defaultPlayer?.name || 'Unknown Player',
          rating: 75, // Default rating
          isSubstitute: false,
          isImpactPlayer: false,
          batting: {
            runs: 0,
            ballsFaced: 0,
            fours: 0,
            sixes: 0,
            status: 'not out' as 'not out' | 'out' | 'did not bat',
            strikeRate: 0,
          },
          bowling: {
            ballsBowled: 0,
            runsConceded: 0,
            maidens: 0,
            wickets: 0,
            economyRate: 0,
          },
        };
      });
    };

    // Create teams with proper structure (ID 0 and 1 as expected by the system)
    const matchTeam1 = {
      id: 0,
      name: team1.name,
      players: createMatchPlayers(team1),
      impactPlayerUsed: false,
    };

    const matchTeam2 = {
      id: 1,
      name: team2.name,
      players: createMatchPlayers(team2),
      impactPlayerUsed: false,
    };

    // Ensure we have at least 2 players for batting and 1 for bowling
    if (matchTeam1.players.length < 2 || matchTeam2.players.length < 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Teams need at least 2 players for batting and 1 for bowling.",
      });
      return;
    }

    // Create match settings with rain probability
    const matchSettings = {
      teamNames: [team1.name, team2.name] as [string, string],
      oversPerInnings: tournament.settings.oversPerInnings,
      toss: { winner: team1.name, decision: 'bat' as const },
      matchType: tournament.settings.matchType,
      rainProbability: rainProbability, // Default to no rain, can be enhanced later
    };

    // Use the new createMatch function
    const matchData = createMatch([matchTeam1, matchTeam2], matchSettings);

    // Update match status to inprogress
    const updatedMatches = tournament.matches.map(m => 
      m.id === match.id 
        ? { ...m, status: 'inprogress' as const, matchData }
        : m
    );

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      status: 'active' as const,
    };

    onTournamentUpdate(updatedTournament);
    setCurrentMatch(matchData);
  };

  const pauseMatch = () => {
    if (!currentMatch) return;
    
    // Save current match data to localStorage as backup
    const matchBackup = {
      tournamentId: tournament.id,
      matchId: currentMatch.id,
      matchData: currentMatch,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(`match_backup_${tournament.id}_${currentMatch.id}`, JSON.stringify(matchBackup));
    
    // Update tournament match with current data
    const updatedMatches = tournament.matches.map(m => 
      m.id === currentMatch.id 
        ? { ...m, status: 'paused' as const, matchData: currentMatch }
        : m
    );
    
    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
    };
    
    onTournamentUpdate(updatedTournament);
    
    // Go back to tournament view
    setCurrentMatch(null);
    
    toast({
      title: "Match Paused",
      description: "Match data has been saved. You can resume it later.",
    });
  };

  const resumeMatch = (match: TournamentMatch) => {
    if (match.status === 'paused' && match.matchData) {
      // Resume paused match
      setCurrentMatch(match.matchData);
    } else if (match.status === 'inprogress' && match.matchData) {
      // Resume in-progress match
      setCurrentMatch(match.matchData);
    } else {
      // Check localStorage for backup
      const backupKey = `match_backup_${tournament.id}_${match.id}`;
      const backupData = localStorage.getItem(backupKey);
      
      if (backupData) {
        try {
          const backup = JSON.parse(backupData);
          if (backup.matchData) {
            console.log('Restoring match from localStorage backup');
            setCurrentMatch(backup.matchData);
            
            // Update tournament with restored data
            const updatedMatches = tournament.matches.map(m => 
              m.id === match.id 
                ? { ...m, status: 'inprogress' as const, matchData: backup.matchData }
                : m
            );
            
            const updatedTournament = {
              ...tournament,
              matches: updatedMatches,
            };
            
            onTournamentUpdate(updatedTournament);
            
            toast({
              title: "Match Restored",
              description: "Match data has been restored from backup.",
            });
            return;
          }
        } catch (error) {
          console.error('Error restoring match from backup:', error);
        }
      }
      
      // Show toss interface for new match
      setSelectedMatch(match);
      setShowTossInterface(true);
    }
  };

  const endMatch = (matchResult: Match) => {
    if (!currentTournamentMatchId) {
      console.error('No current tournament match ID context for ending match');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not end match due to missing context.",
      });
      return;
    }
    console.log('Ending match:', currentTournamentMatchId, 'with data:', matchResult);
    
    // Calculate match result
    let matchResultText = '';
    let winnerTeamName: string | null = null;
    let loserTeamName: string | null = null;
    if (matchResult.innings.length >= 2) {
      const team1Score = matchResult.innings[0].score;
      const team2Score = matchResult.innings[1].score;
      const team1Name = matchResult.innings[0].battingTeam.name;
      const team2Name = matchResult.innings[1].battingTeam.name;
      
      if (team2Score > team1Score) {
        const wicketsLeft = 10 - matchResult.innings[1].wickets;
        matchResultText = `${team2Name} won by ${wicketsLeft} wickets`;
        winnerTeamName = team2Name; loserTeamName = team1Name;
      } else if (team1Score > team2Score) {
        matchResultText = `${team1Name} won by ${team1Score - team2Score} runs`;
        winnerTeamName = team1Name; loserTeamName = team2Name;
      } else {
        matchResultText = 'Match tied';
      }
    } else if (matchResult.innings.length === 1) {
      const team1Score = matchResult.innings[0].score;
      const team1Name = matchResult.innings[0].battingTeam.name;
      matchResultText = `${team1Name} scored ${team1Score} runs`;
    }

    // Find the tournament match to get the round information
    const tournamentMatch = tournament.matches.find(m => m.id === currentTournamentMatchId);
    if (!tournamentMatch) {
      console.error('Tournament match not found for match ID:', currentTournamentMatchId);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find tournament match data.",
      });
      return;
    }

    console.log('Tournament match found:', tournamentMatch.round, 'status:', tournamentMatch.status);

    // Persist player histories
    updatePlayerHistoriesFromMatch(matchResult, tournament.id);

    // Update tournament match status with result
    const updatedMatches = tournament.matches.map(m => 
      m.id === tournamentMatch.id 
        ? { 
            ...m, 
            status: 'finished' as const, 
            matchData: matchResult,
            result: matchResultText,
            winnerTeamId: winnerTeamName ? tournament.teams.find(t => t.name === winnerTeamName)?.id : undefined,
            loserTeamId: loserTeamName ? tournament.teams.find(t => t.name === loserTeamName)?.id : undefined,
            completedDate: new Date(),
          }
        : m
    );

    const thisMatch = updatedMatches.find(m => m.id === tournamentMatch.id)!;
    console.log('Updated match:', thisMatch.round, 'winner:', thisMatch.winnerTeamId);

    // Calculate team performance from match data
    const updatedTeams = tournament.teams.map(team => {
      const teamMatches = updatedMatches.filter(m => 
        m.status === 'finished' && 
        (m.team1Id === team.id || m.team2Id === team.id)
      );

      let points = 0;
      let matchesWon = 0;
      let matchesLost = 0;
      let matchesTied = 0;
      let runsScored = 0;
      let runsConceded = 0;
      let oversFaced = 0;
      let oversBowled = 0;

      teamMatches.forEach(match => {
        if (match.matchData) {
          // Find the team's innings in the match
          const teamInnings = match.matchData.innings.find(i => 
            i.battingTeam.name === team.name
          );
          const opponentInnings = match.matchData.innings.find(i => 
            i.battingTeam.name !== team.name
          );

          if (teamInnings) {
            runsScored += teamInnings.score;
            oversFaced += teamInnings.overs;
          }

          if (opponentInnings) {
            runsConceded += opponentInnings.score;
            oversBowled += opponentInnings.overs;
          }

          // Calculate match result and points
          if (teamInnings && opponentInnings) {
            if (teamInnings.score > opponentInnings.score) {
              matchesWon += 1;
              points += 2;
            } else if (teamInnings.score < opponentInnings.score) {
              matchesLost += 1;
            } else {
              matchesTied += 1;
              points += 1;
            }
          }
        }
      });

      // Calculate Net Run Rate
      let netRunRate = 0;
      if (oversFaced > 0 && oversBowled > 0) {
        const runRateFor = runsScored / oversFaced;
        const runRateAgainst = runsConceded / oversBowled;
        netRunRate = runRateFor - runRateAgainst;
      }

      return {
        ...team,
        points,
        matchesPlayed: teamMatches.length,
        matchesWon,
        matchesLost,
        matchesTied,
        runsScored,
        runsConceded,
        oversFaced,
        oversBowled,
        netRunRate,
      };
    });

    // Update playoff participants
    const groupMatches = updatedMatches.filter(m => m.round === 'group');
    const completedGroupMatches = groupMatches.filter(m => m.status === 'finished');

    const finalMatch = updatedMatches.find(m => m.round === 'final');
    const q1 = updatedMatches.find(m => m.round === 'qualifier1');
    const elim = updatedMatches.find(m => m.round === 'eliminator');
    const q2 = updatedMatches.find(m => m.round === 'qualifier2');

    if (completedGroupMatches.length === groupMatches.length) {
      // Group stage complete, determine bracket seeds
      const sortedTeams = [...updatedTeams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.netRunRate - a.netRunRate;
      });

      if (q1 && sortedTeams.length >= 2) {
        q1.team1Id = sortedTeams[0].id; q1.team1Name = sortedTeams[0].name;
        q1.team2Id = sortedTeams[1].id; q1.team2Name = sortedTeams[1].name;
      }
      if (elim && sortedTeams.length >= 4) {
        elim.team1Id = sortedTeams[2].id; elim.team1Name = sortedTeams[2].name;
        elim.team2Id = sortedTeams[3].id; elim.team2Name = sortedTeams[3].name;
      }
      if (!q1 && !elim && finalMatch && sortedTeams.length >= 2) {
        finalMatch.team1Id = sortedTeams[0].id; finalMatch.team1Name = sortedTeams[0].name;
        finalMatch.team2Id = sortedTeams[1].id; finalMatch.team2Name = sortedTeams[1].name;
      }
    }

    // Progress winners/losers through playoffs
    const finishedEliminator = updatedMatches.find(m => m.round === 'eliminator' && m.status === 'finished');
    const finishedQ1 = updatedMatches.find(m => m.round === 'qualifier1' && m.status === 'finished');
    const finishedQ2 = updatedMatches.find(m => m.round === 'qualifier2' && m.status === 'finished');

    // Update Qualifier 2 participants
    if (q2) {
      if (finishedEliminator?.winnerTeamId) {
        q2.team1Id = finishedEliminator.winnerTeamId;
        q2.team1Name = tournament.teams.find(t => t.id === finishedEliminator.winnerTeamId)?.name || 'TBD';
      }
      if (finishedQ1?.loserTeamId) {
        q2.team2Id = finishedQ1.loserTeamId;
        q2.team2Name = tournament.teams.find(t => t.id === finishedQ1.loserTeamId)?.name || 'TBD';
      }
    }

    // Update Final participants
    if (finalMatch) {
      if (finishedQ1?.winnerTeamId) {
        finalMatch.team1Id = finishedQ1.winnerTeamId;
        finalMatch.team1Name = tournament.teams.find(t => t.id === finishedQ1.winnerTeamId)?.name || 'TBD';
      }
      if (finishedQ2?.winnerTeamId) {
        finalMatch.team2Id = finishedQ2.winnerTeamId;
        finalMatch.team2Name = tournament.teams.find(t => t.id === finishedQ2.winnerTeamId)?.name || 'TBD';
      }
    }

    // --- PATCH: propagate updated playoff teams into updatedMatches ---
    const updatedMatchesWithPlayoffTeams = updatedMatches.map(m => {
      if (q2 && m.id === q2.id) {
        return {
          ...m,
          team1Id: q2.team1Id,
          team1Name: q2.team1Name,
          team2Id: q2.team2Id,
          team2Name: q2.team2Name,
        };
      }
      if (finalMatch && m.id === finalMatch.id) {
        return {
          ...m,
          team1Id: finalMatch.team1Id,
          team1Name: finalMatch.team1Name,
          team2Id: finalMatch.team2Id,
          team2Name: finalMatch.team2Name,
        };
      }
      return m;
    });

    const updatedTournament = {
      ...tournament,
      matches: updatedMatchesWithPlayoffTeams,
      teams: updatedTeams,
      status: (completedGroupMatches.length === groupMatches.length ? 'active' : 'draft') as 'draft' | 'active' | 'completed',
    };

    // Persist Player of Series when tournament completes (final finished)
    const finalFinished = updatedMatches.find(m => m.round === 'final' && m.status === 'finished');
    if (finalFinished) {
      const mvp = [...playerStats].map(p => ({...p, impact: p.runs + p.wickets*20 + p.fours + p.sixes*2 - (p.runsConceded/5)})).sort((a,b)=> b.impact - a.impact)[0];
      if (mvp) {
        updatedTournament.awards = {
          ...(updatedTournament.awards || {}),
          playerOfSeriesId: mvp.playerId,
          playerOfSeriesName: mvp.playerName,
        };
      }
      updatedTournament.status = 'completed';
    }

    console.log('Updating tournament with completed match');
    onTournamentUpdate(updatedTournament);
    setCurrentMatch(null);
    toast({
      title: "Match Completed",
      description: `Match finished: ${matchResultText}`,
    });
  };

  const safeEndMatch = (matchResult: Match) => {
    try {
      console.log('Attempting to end match safely...');
      endMatch(matchResult);
    } catch (error) {
      console.error('Error in endMatch, attempting fallback:', error);
      
      // Fallback: just save the match data and mark as finished
      const updatedMatches = tournament.matches.map(m => 
        m.id === matchResult.id 
          ? { 
              ...m, 
              status: 'finished' as const, 
              matchData: matchResult,
              result: 'Match completed (fallback)',
              completedDate: new Date(),
            }
          : m
      );
      
      const updatedTournament = {
        ...tournament,
        matches: updatedMatches,
      };
      
      onTournamentUpdate(updatedTournament);
      setCurrentMatch(null);
      
      toast({
        title: "Match Completed (Fallback)",
        description: "Match finished using fallback method. Some features may be limited.",
      });
    }
  };

  const getTopPlayers = (category: 'batting' | 'bowling') => {
    if (category === 'batting') {
      return playerStats
        .filter(p => p.runs > 0)
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 5);
    } else {
      return playerStats
        .filter(p => p.wickets > 0)
        .sort((a, b) => b.wickets - a.wickets)
        .slice(0, 5);
    }
  };

  const awards = computeTournamentAwards(tournament, playerStats);
  const { bestBatting, bestBowling } = computeIndividualPerformances(tournament);
  const topPartnerships = computeBestPartnership(tournament);
  const { topBatting, topBowling } = computeTopPerformances(tournament);
  const leaderboards = computeLeaderboards(playerStats);
  const finishedMatches = [...tournament.matches].filter(m => m.status === 'finished' && m.matchData);
  const lastFinished = finishedMatches.length ? finishedMatches.sort((a,b)=> (b.completedDate? new Date(b.completedDate).getTime():0) - (a.completedDate? new Date(a.completedDate).getTime():0))[0] : null;
  const lastMatchFantasy = lastFinished ? computeFantasyPointsForMatch(lastFinished.matchData as Match) : [];
  const tournamentFantasy = computeFantasyPointsForTournament(tournament.matches);

  // (moved above)

  const recoverLostMatchData = () => {
    const keys = Object.keys(localStorage);
    const matchBackupKeys = keys.filter(key => key.startsWith(`match_backup_${tournament.id}_`));
    
    if (matchBackupKeys.length === 0) {
      toast({
        title: "No Backups Found",
        description: "No match backups found in localStorage.",
      });
      return;
    }
    
    let recoveredCount = 0;
    matchBackupKeys.forEach(key => {
      try {
        const backup = JSON.parse(localStorage.getItem(key)!);
        const matchId = backup.matchId;
        const match = tournament.matches.find(m => m.id === matchId);
        
        if (match && (!match.matchData || match.status === 'pending')) {
          console.log(`Recovering match ${matchId} from backup`);
          
          // Update match with recovered data
          const updatedMatches = tournament.matches.map(m => 
            m.id === matchId 
              ? { ...m, status: 'paused' as const, matchData: backup.matchData }
              : m
          );
          
          const updatedTournament = {
            ...tournament,
            matches: updatedMatches,
          };
          
          onTournamentUpdate(updatedTournament);
          recoveredCount++;
        }
      } catch (error) {
        console.error('Error recovering match from backup:', error);
      }
    });
    
    if (recoveredCount > 0) {
      toast({
        title: "Data Recovery Complete",
        description: `Successfully recovered ${recoveredCount} match(es) from backup.`,
      });
    } else {
      toast({
        title: "No Recovery Needed",
        description: "All matches are already up to date.",
      });
    }
  };

  const handleBackToTournament = () => {
    if (currentMatch && currentMatch.status === 'inprogress') {
      // Auto-save before leaving
      autoSaveMatch(currentMatch);
      toast({
        title: "Match Auto-Saved",
        description: "Match data has been automatically saved before leaving.",
      });
    }
    setCurrentMatch(null);
  };

  if (currentMatch) {
    // Ensure currentMatch is a valid Match object before rendering ScoringInterface
    if (!currentMatch.innings || currentMatch.innings.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleBackToTournament}>
              ← Back to Tournament
            </Button>
            <h2 className="text-xl font-semibold">Loading Match...</h2>
          </div>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Match data is being prepared. Please wait.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBackToTournament}>
            ← Back to Tournament
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Tournament Match</h2>
            <Button variant="outline" onClick={pauseMatch} size="sm">
              Pause Match
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                if (currentMatch) {
                  autoSaveMatch(currentMatch);
                  toast({
                    title: "Match Saved",
                    description: "Match data has been saved to backup.",
                  });
                }
              }} 
              size="sm"
            >
              Save Match
            </Button>
          </div>
        </div>
        <ScoringInterface 
          match={currentMatch} 
          setMatch={(match) => {
            setCurrentMatch(match);
            // Auto-save after every change
            autoSaveMatch(match);
          }} 
          endMatch={() => safeEndMatch(currentMatch)}
        />
      </div>
    );
  }

  if (showMatchForm && selectedMatch) {
    const team1 = tournament.teams.find(t => t.id === selectedMatch.team1Id);
    const team2 = tournament.teams.find(t => t.id === selectedMatch.team2Id);
    
    if (!team1 || !team2) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setShowMatchForm(false)}>
            ← Back to Tournament
          </Button>
          <h2 className="text-xl font-semibold">Start Tournament Match</h2>
        </div>
        
        <Card className="max-w-2xl mx-auto shadow-lg bg-card/50 border-primary/20">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Match Setup</h3>
              <p className="text-muted-foreground">
                {team1.name} vs {team2.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {tournament.settings.matchType} • {tournament.settings.oversPerInnings} overs per innings
              </p>
            </div>
            
            <NewMatchForm 
              onNewMatch={(settings) => handleNewMatch({ ...selectedMatch, ...settings } as TournamentMatch)}
              prefillSettings={{
                teamNames: [team1.name, team2.name] as [string, string],
                oversPerInnings: tournament.settings.oversPerInnings,
                toss: { winner: team1.name, decision: 'bat' as const },
                matchType: tournament.settings.matchType,
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showTossInterface && selectedMatch) {
    const team1 = tournament.teams.find(t => t.id === selectedMatch.team1Id);
    const team2 = tournament.teams.find(t => t.id === selectedMatch.team2Id);
    
    if (!team1 || !team2) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => {
            setShowTossInterface(false);
            setTossWinner('');
            setTossDecision('bat');
            setRainProbability(0);
          }}>
            ← Back to Tournament
          </Button>
          <h2 className="text-xl font-semibold">Toss & Decision</h2>
        </div>
        
        <Card className="max-w-2xl mx-auto shadow-lg bg-card/50 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-4">Match Setup</h3>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  {team1.logo ? (
                    <img src={team1.logo} alt={`${team1.name} logo`} className="w-16 h-16 mx-auto mb-2" />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                      {team1.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="font-semibold">{team1.name}</p>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">vs</div>
                <div className="text-center">
                  {team2.logo ? (
                    <img src={team2.logo} alt={`${team2.name} logo`} className="w-16 h-16 mx-auto mb-2" />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                      {team2.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="font-semibold">{team2.name}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={simulateToss}
                  className="mb-4"
                  disabled={!!tossWinner}
                >
                  🪙 Simulate Coin Toss
                </Button>
                
                {tossWinner && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <p className="text-lg font-semibold text-green-600 mb-2">
                      {tossWinner} won the toss!
                    </p>
                    <p className="text-muted-foreground mb-3">
                      What would you like to do?
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant={tossDecision === 'bat' ? 'default' : 'outline'}
                        onClick={() => setTossDecision('bat')}
                        className="min-w-[100px]"
                      >
                        🏏 Bat First
                      </Button>
                      <Button
                        variant={tossDecision === 'bowl' ? 'default' : 'outline'}
                        onClick={() => setTossDecision('bowl')}
                        className="min-w-[100px]"
                      >
                        🏐 Bowl First
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rain Probability Meter */}
                <div className="space-y-4 mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-semibold flex items-center gap-2 text-blue-800">
                    <CloudRain className="w-5 h-5" />
                    Weather Conditions
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={rainProbability}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || isNaN(parseInt(value, 10))) {
                            setRainProbability(0);
                          } else {
                            setRainProbability(parseInt(value, 10));
                          }
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Chance of Rain</span>
                        <span className="font-medium">{rainProbability}%</span>
                      </div>
                      <Progress value={rainProbability} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Sun className="w-3 h-3" />
                          <span>Clear</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cloud className="w-3 h-3" />
                          <span>Cloudy</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CloudRain className="w-3 h-3" />
                          <span>Rain</span>
                        </div>
                      </div>
                    </div>
                    
                    {rainProbability > 0 && (
                      <div className="p-3 bg-blue-100 rounded-md">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> If rain occurs during the match, overs may be reduced and targets adjusted using Duckworth-Lewis calculations.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleTossComplete}
                  disabled={!tossWinner}
                  className="w-full"
                >
                  Start Match
                </Button>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                <p>• Click "Simulate Coin Toss" to randomly determine the toss winner</p>
                <p>• Choose whether the winning team bats or bowls first</p>
                <p>• Click "Start Match" to begin the game</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={recoverLostMatchData}
          >
            Recover Lost Data
          </Button>
          <Button variant="outline" onClick={onBackToTournaments}>
            ← Back to Tournaments
          </Button>
          <Button onClick={() => setShowPlayerData(true)}>View Player Data</Button>
        </div>
      </div>

      {/* Auction Mode Check */}
      {tournament.status === 'auction' && (
        <Card className="border-2 border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Gavel className="w-6 h-6" />
              Auction Mode Active
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              This tournament is currently in auction mode. Teams need to bid on players before matches can begin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                onClick={() => setActiveTab('auction')} 
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Gavel className="w-4 h-4 mr-2" />
                Go to Auction
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // Convert auction teams to regular tournament teams
                  const updatedTournament = {
                    ...tournament,
                    status: 'draft' as const,
                    teams: tournament.teams.map(team => ({
                      ...team,
                      players: team.players.length === 0 ? [] : team.players, // Keep empty for now
                    })),
                  };
                  onTournamentUpdate(updatedTournament);
                }}
              >
                Skip Auction (Use Default Players)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Teams</p>
                <p className="text-2xl font-bold">{tournament.teams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Matches</p>
                <p className="text-2xl font-bold">{tournament.matches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {tournament.matches.filter(m => m.status === 'finished').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={
                  tournament.status === 'active' ? 'default' : 
                  tournament.status === 'auction' ? 'destructive' : 
                  'secondary'
                }>
                  {tournament.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="points-table">Points Table</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {tournament.status === 'auction' && (
            <TabsTrigger value="auction">Auction</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Format</h3>
                  <p className="text-sm text-muted-foreground">
                    {tournament.settings.matchType} • {tournament.settings.oversPerInnings} overs per innings
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Group Stage: {tournament.settings.groupStageRounds} rounds • Top {tournament.settings.topTeamsAdvance} advance
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Teams</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {tournament.teams.map(team => (
                      <div key={team.id} className="flex items-center gap-2">
                        {team.logo ? (
                          <img src={team.logo} alt={`${team.name} logo`} className="w-5 h-5 rounded" />
                        ) : (
                          <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm">{team.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Explosive Batsman</CardTitle>
              </CardHeader>
              <CardContent>
                {awards.explosiveBatsman ? (
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold">{awards.explosiveBatsman.playerName}</p>
                      <p className="text-muted-foreground">{awards.explosiveBatsman.teamName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{(awards.explosiveBatsman.explosiveness * 100).toFixed(1)} EI</p>
                      <p className="text-muted-foreground">{awards.explosiveBatsman.fours}x4, {awards.explosiveBatsman.sixes}x6</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Best Avg Batsman</CardTitle>
              </CardHeader>
              <CardContent>
                {awards.bestAvgBatsman ? (
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold">{awards.bestAvgBatsman.playerName}</p>
                      <p className="text-muted-foreground">{awards.bestAvgBatsman.teamName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{(awards.bestAvgBatsman.runs / awards.bestAvgBatsman.matches).toFixed(1)} Avg</p>
                      <p className="text-muted-foreground">{awards.bestAvgBatsman.runs} runs</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Best Avg Bowler</CardTitle>
              </CardHeader>
              <CardContent>
                {awards.bestAvgBowler ? (
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold">{awards.bestAvgBowler.playerName}</p>
                      <p className="text-muted-foreground">{awards.bestAvgBowler.teamName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{(awards.bestAvgBowler.wickets / awards.bestAvgBowler.matches).toFixed(1)} Wkts/Match</p>
                      <p className="text-muted-foreground">{awards.bestAvgBowler.wickets} wickets</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Note: For AI insights with Gemini, we can later call an API to compute advanced metrics/rankings */}

          {/* Orange / Purple Cap restored */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-500" />
                  Orange Cap (Top Batsmen)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboards.byRuns.map((player, index) => (
                    <div key={player.playerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{index + 1}.</span>
                        <span className="text-sm">{player.playerName}</span>
                        <Badge variant="outline" className="text-xs">{player.teamName}</Badge>
                      </div>
                      <span className="text-sm font-semibold">{player.runs} runs</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Purple Cap (Top Bowlers)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboards.byWkts.map((player, index) => (
                    <div key={player.playerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{index + 1}.</span>
                        <span className="text-sm">{player.playerName}</span>
                        <Badge variant="outline" className="text-xs">{player.teamName}</Badge>
                      </div>
                      <span className="text-sm font-semibold">{player.wickets} wkts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {lastFinished && (
            <Card>
              <CardHeader><CardTitle>Top Fantasy Players (Last Match)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const widths = normalize(lastMatchFantasy.map(p => p.points));
                  return lastMatchFantasy.map((p, idx) => (
                    <div key={p.playerId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><span className="font-medium">{idx+1}.</span> {p.playerName}</div>
                        <div className="font-semibold">{p.points} pts</div>
                      </div>
                      <Progress value={widths[idx]} className="h-1.5" />
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}

          {tournamentFantasy.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Fantasy Leaderboard (Tournament)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const widths = normalize(tournamentFantasy.map(p => p.points));
                  return tournamentFantasy.map((p, idx) => (
                    <div key={p.playerId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><span className="font-medium">{idx+1}.</span> {p.playerName}</div>
                        <div className="font-semibold">{p.points} pts</div>
                      </div>
                      <Progress value={widths[idx]} className="h-1.5" />
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}

          {/* Post-match fantasy top 5 (if recent finished match exists) */}
          {(() => {
            const finished = [...tournament.matches].filter(m => m.status === 'finished' && m.matchData).sort((a,b)=> (b.completedDate? new Date(b.completedDate).getTime():0) - (a.completedDate? new Date(a.completedDate).getTime():0));
            if (!finished.length) return null;
            const topFantasy = computeFantasyPointsForMatch(finished[0].matchData as Match);
            return (
              <Card>
                <CardHeader><CardTitle>Top Fantasy Players (Last Match)</CardTitle></CardHeader>
                <CardContent>
                  {topFantasy.map((p, idx) => (
                    <div key={p.playerId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2"><span className="font-medium">{idx+1}.</span> {p.playerName}</div>
                      <div className="font-semibold">{p.points} pts</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="awards" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  Top 3 Batting Performances
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topBatting.length > 0 ? (
                  <div className="space-y-3">
                    {topBatting.map((performance, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">{index + 1}</span>
                          <div>
                            <p className="font-semibold text-sm">{performance.playerName}</p>
                            <p className="text-xs text-muted-foreground">{performance.teamName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-orange-600">{performance.runs} runs</p>
                          <p className="text-xs text-muted-foreground">{performance.balls} balls</p>
                          <p className="text-xs text-muted-foreground">
                            {performance.fours}x4, {performance.sixes}x6
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No batting data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  Top 3 Bowling Performances
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topBowling.length > 0 ? (
                  <div className="space-y-3">
                    {topBowling.map((performance, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">{index + 1}</span>
                          <div>
                            <p className="font-semibold text-sm">{performance.playerName}</p>
                            <p className="text-xs text-muted-foreground">{performance.teamName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-purple-600">{performance.wickets}/{performance.runs}</p>
                          <p className="text-xs text-muted-foreground">
                            {performance.overs.toFixed(1)} overs, {performance.maidens} maidens
                          </p>
                          <p className="text-xs text-muted-foreground">Econ: {performance.economy.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No bowling data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Top Partnerships Award */}
        {topPartnerships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  Top 5 Partnerships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {topPartnerships.map((partnership, index) => {
                    const player1Name = partnership.player1Name;
                    const player2Name = partnership.player2Name;
                    const player1Runs = partnership.player1Runs;
                    const player2Runs = partnership.player2Runs;
                    const runs = partnership.runs;
                    const teamName = partnership.teamName;
                    const matchNumber = partnership.matchNumber;
                    const player1Percentage = (player1Runs / runs) * 100;
                    const player2Percentage = (player2Runs / runs) * 100;
 
                    return (
                      <div
                        key={index}
                        style={{
                          position: "relative",
                          background:
                            "linear-gradient(135deg, #f9fafb, #ffffff)",
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          transition: "all 0.5s ease",
                          overflow: "hidden",
                          padding: "24px",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "scale(1.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "scale(1)")
                        }
                      >
                        {/* Header */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background:
                                  "linear-gradient(135deg, #16a34a, #22c55e)",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                              }}
                            >
                              <Trophy
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  color: "#fff",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                background: "rgba(255, 215, 0, 0.1)",
                                border: "1px solid rgba(255, 215, 0, 0.2)",
                                padding: "4px 12px",
                                borderRadius: "9999px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "bold",
                                  color: "#d97706",
                                }}
                              >
                                #{index + 1} Partnership
                              </span>
                            </div>
                          </div>
 
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginBottom: "2px",
                              }}
                            >
                              Match
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#111827",
                              }}
                            >
                              #{matchNumber}
                            </div>
                          </div>
                        </div>
 
                        {/* Runs + Team */}
                        <div
                          style={{ textAlign: "center", marginBottom: "20px" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            <Target
                              style={{
                                width: "20px",
                                height: "20px",
                                color: "#a855f7",
                              }}
                            />
                            <h3
                              style={{
                                fontSize: "28px",
                                fontWeight: "bold",
                              }}
                            >
                              {runs}
                            </h3>
                            <span
                              style={{ fontSize: "16px", color: "#6b7280" }}
                            >
                              runs
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: "24px",
                            }}
                            className="font-bold"
                          >
                            {teamName}
                          </p>
                        </div>
 
                        {/* Progress Bar */}
                        <div style={{ marginBottom: "16px" }}>
                          <div
                            style={{
                              width: "100%",
                              height: "12px",
                              background: "#f3f4f6",
                              borderRadius: "9999px",
                              border: "1px solid #e5e7eb",
                              overflow: "hidden",
                              display: "flex",
                            }}
                          >
                            <div
                              style={{
                                width: `${player1Percentage}%`,
                                background:
                                  "linear-gradient(90deg, #f97316, #fb923c)",
                                transition: "width 1s ease",
                              }}
                            />
                            <div
                              style={{
                                width: `${player2Percentage}%`,
                                background:
                                  "linear-gradient(90deg, #6366f1, #818cf8)",
                                transition: "width 1s ease",
                              }}
                            />
                          </div>
                        </div>
 
                        {/* Player Stats */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          {/* Player 1 */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                background: "#f97316",
                              }}
                            />
                            <div>
                              <p
                                style={{
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  color: "#111827",
                                }}
                              >
                                {player1Name}
                              </p>
                              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                                {player1Runs} runs (
                                {player1Percentage.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
 
                          {/* VS Divider */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "9999px",
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <Users
                              style={{
                                width: "14px",
                                height: "14px",
                                color: "#d97706",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "500",
                                color: "#d97706",
                              }}
                            >
                              VS
                            </span>
                          </div>
 
                          {/* Player 2 */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              flex: 1,
                              justifyContent: "flex-end",
                              textAlign: "right",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  color: "#111827",
                                }}
                              >
                                {player2Name}
                              </p>
                              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                                {player2Runs} runs (
                                {player2Percentage.toFixed(1)}%)
                              </p>
                            </div>
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                background: "#6366f1",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
 
                <div className="space-y-4">
                  {topPartnerships.map((partnership, index) => {
                    const player1Runs = partnership.player1Runs;
                    const player2Runs = partnership.player2Runs;
                    const totalRuns = partnership.runs;
                    //console.log(partnership, "topPartnerships");
                    const player1Percentage = (player1Runs / totalRuns) * 100;
                    const player2Percentage = (player2Runs / totalRuns) * 100;
 
                    return (
                      <div
                        key={index}
                        className="p-3 bg-green-50 rounded-md border border-green-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Match #{partnership.matchNumber}
                          </span>
                        </div>
 
                        <div className="text-center mb-2">
                          <p className="font-bold text-xl text-green-600">
                            {partnership.runs} runs
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {partnership.teamName}
                          </p>
                        </div>
 
                        <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 overflow-hidden flex">
                          <div
                            className="bg-orange-500 h-4"
                            style={{ width: `${player1Percentage}%` }}
                          ></div>
                          <div
                            className="bg-purple-500 h-4"
                            style={{ width: `${player2Percentage}%` }}
                          ></div>
                        </div>
 
                        <div className="flex justify-between mt-1 text-xs">
                          <div className="text-left">
                            <p className="font-semibold">
                              {partnership.player1Name}
                            </p>
                            <p>
                              {player1Runs} runs ({player1Percentage.toFixed(1)}
                              %)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {partnership.player2Name}
                            </p>
                            <p>
                              {player2Runs} runs ({player2Percentage.toFixed(1)}
                              %)
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Awards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" />
                Advanced Awards
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-blue-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Best Strike Rate
                </h4>
                {leaderboards.bySR.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboards.bySR.map((p, i) => (
                      <div key={p.playerId} className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{i+1}</span>
                          <span className="text-sm font-medium">{p.playerName}</span>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">{p.strikeRate.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-green-600 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Best Economy
                </h4>
                {leaderboards.byEcon.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboards.byEcon.map((p, i) => (
                      <div key={p.playerId} className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">{i+1}</span>
                          <span className="text-sm font-medium">{p.playerName}</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">{p.economyRate.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-orange-600 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Best Avg Batsman
                </h4>
                {leaderboards.byAvgBat.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboards.byAvgBat.map((p, i) => (
                      <div key={p.playerId} className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">{i+1}</span>
                          <span className="text-sm font-medium">{p.playerName}</span>
                        </div>
                        <span className="text-sm font-semibold text-orange-600">{(p.runs/p.matches).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-purple-600 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Best Avg Bowler
                </h4>
                {leaderboards.byAvgBowl.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboards.byAvgBowl.map((p, i) => (
                      <div key={p.playerId} className="flex items-center justify-between p-2 bg-purple-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">{i+1}</span>
                          <span className="text-sm font-medium">{p.playerName}</span>
                        </div>
                        <span className="text-sm font-semibold text-purple-600">{(p.wickets/p.matches).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-red-600 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Most Explosive
                </h4>
                {leaderboards.explosive.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboards.explosive.map((p, i) => (
                      <div key={p.playerId} className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">{i+1}</span>
                          <span className="text-sm font-medium">{p.playerName}</span>
                        </div>
                        <span className="text-sm font-semibold text-red-600">{((p.fours*4 + p.sixes*6)/Math.max(1,p.ballsFaced)*100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-indigo-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Most Consistent
                </h4>
                {leaderboards.byRuns.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboards.byRuns.slice(0, 3).map((p, i) => (
                      <div key={p.playerId} className="flex items-center justify-between p-2 bg-indigo-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">{i+1}</span>
                          <span className="text-sm font-medium">{p.playerName}</span>
                        </div>
                        <span className="text-sm font-semibold text-indigo-600">{p.runs}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points-table">
          <Card>
            <CardHeader>
              <CardTitle>Points Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>P</TableHead>
                    <TableHead>W</TableHead>
                    <TableHead>L</TableHead>
                    <TableHead>T</TableHead>
                    <TableHead>Pts</TableHead>
                    <TableHead>NRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournament.teams
                    .sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate)
                    .map((team, index) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {team.logo ? (
                              <img src={team.logo} alt={`${team.name} logo`} className="w-8 h-8 rounded" />
                            ) : (
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-bold">
                                {team.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{team.name}</div>
                              {team.homeGround && (
                                <div className="text-xs text-muted-foreground">{team.homeGround}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{team.matchesPlayed}</TableCell>
                        <TableCell>{team.matchesWon}</TableCell>
                        <TableCell>{team.matchesLost}</TableCell>
                        <TableCell>{team.matchesTied}</TableCell>
                        <TableCell className="font-semibold">{team.points}</TableCell>
                        <TableCell>{team.netRunRate.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Matches</CardTitle>
              <CardDescription>
                {tournament.settings.tournamentType === 'knockout' 
                  ? 'Single elimination knockout tournament'
                  : `Round robin tournament - each team plays ${tournament.settings.groupStageRounds} times`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Group matches by round */}
              {(() => {
                const groupMatches = tournament.matches.filter(m => m.round === 'group');
                const playoffMatches = tournament.matches.filter(m => m.round !== 'group');
                
                // Group group stage matches by teams to avoid consecutive display
                const teamMatchups = new Map<string, TournamentMatch[]>();
                groupMatches.forEach(match => {
                  const key = [match.team1Id, match.team2Id].sort().join('-');
                  if (!teamMatchups.has(key)) {
                    teamMatchups.set(key, []);
                  }
                  teamMatchups.get(key)!.push(match);
                });

                return (
                  <div className="space-y-6">
                    {/* Group Stage Matches */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-primary">Group Stage</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from(teamMatchups.values()).map((matchup, index) => {
                          const firstMatch = matchup[0];
                          const team1 = tournament.teams.find(t => t.id === firstMatch.team1Id);
                          const team2 = tournament.teams.find(t => t.id === firstMatch.team2Id);
                          
                          return (
                            <Card key={index} className="p-4">
                              <div className="text-center mb-4">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                  {/* Team 1 */}
                                  <div className="flex flex-col items-center">
                                    {team1?.logo ? (
                                      <img src={team1.logo} alt={`${team1.name} logo`} className="w-12 h-12 mb-1" />
                                    ) : (
                                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-lg font-bold mb-1">
                                        {team1?.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-sm font-medium">{team1?.name}</span>
                                  </div>
                                  
                                  {/* VS */}
                                  <div className="text-lg font-bold text-muted-foreground">vs</div>
                                  
                                  {/* Team 2 */}
                                  <div className="flex flex-col items-center">
                                    {team2?.logo ? (
                                      <img src={team2.logo} alt={`${team2.name} logo`} className="w-12 h-12 mb-1" />
                                    ) : (
                                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-lg font-bold mb-1">
                                        {team2?.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-sm font-medium">{team2?.name}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {matchup.length} match{matchup.length > 1 ? 'es' : ''}
                                </p>
                              </div>
                              <div className="space-y-2">
                                {matchup.map((match) => (
                                  <div key={match.id} className="border rounded p-3 bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium">Match {match.matchNumber}</span>
                                      <Badge 
                                        variant={match.status === 'finished' ? 'default' : 
                                                match.status === 'paused' ? 'secondary' : 
                                                match.status === 'inprogress' ? 'outline' : 'outline'}
                                        className="text-xs"
                                      >
                                        {match.status === 'finished' ? 'Finished' : 
                                         match.status === 'paused' ? 'Paused' : 
                                         match.status === 'inprogress' ? 'In Progress' : 'Pending'}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                      Venue: {match.venue}
                                    </div>
                                    {match.status === 'finished' && match.result && (
                                      <div className="text-xs font-medium text-green-600 mb-2">
                                        {match.result}
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      {match.status === 'pending' && (
                                        <Button 
                                          size="sm" 
                                          className="flex-1"
                                          onClick={() => startMatch(match)}
                                        >
                                          Start Match
                                        </Button>
                                      )}
                                      {match.status === 'paused' && (
                                        <Button 
                                          size="sm" 
                                          variant="default"
                                          className="flex-1"
                                          onClick={() => startMatch(match)}
                                        >
                                          Resume Match
                                        </Button>
                                      )}
                                      {match.status === 'inprogress' && (
                                        <Button 
                                          size="sm" 
                                          variant="secondary"
                                          className="flex-1"
                                          onClick={() => startMatch(match)}
                                        >
                                          Continue Match
                                        </Button>
                                      )}
                                      {match.status === 'finished' && match.matchData && (
                                        <MatchScorecardDialog
                                          match={match.matchData}
                                          trigger={
                                            <Button size="sm" variant="outline" className="flex-1">
                                              View Scorecard
                                            </Button>
                                          }
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* Playoff Matches */}
                    {playoffMatches.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-primary">Playoffs & Finals</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {playoffMatches.map((match) => {
                            const team1 = tournament.teams.find(t => t.id === match.team1Id);
                            const team2 = tournament.teams.find(t => t.id === match.team2Id);
                            
                            return (
                              <Card key={match.id} className="p-4">
                                <div className="text-center mb-4">
                                  <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                                    {match.round === 'qualifier1' ? 'Qualifier 1' :
                                     match.round === 'eliminator' ? 'Eliminator' :
                                     match.round === 'qualifier2' ? 'Qualifier 2' :
                                     match.round === 'final' ? 'Final' : match.round}
                                  </h4>
                                  {!match.team1Id || !match.team2Id ? (
                                    <div className="text-sm text-muted-foreground">
                                      Teams TBD
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-3">
                                      {/* Team 1 */}
                                      <div className="flex flex-col items-center">
                                        {team1?.logo ? (
                                          <img src={team1.logo} alt={`${match.team1Name} logo`} className="w-12 h-12 mb-1" />
                                        ) : (
                                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-lg font-bold mb-1">
                                            {match.team1Name?.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <span className="text-sm font-medium">{match.team1Name}</span>
                                      </div>
                                      
                                      {/* VS */}
                                      <div className="text-lg font-bold text-muted-foreground">vs</div>
                                      
                                      {/* Team 2 */}
                                      <div className="flex flex-col items-center">
                                        {team2?.logo ? (
                                          <img src={team2.logo} alt={`${match.team2Name} logo`} className="w-12 h-12 mb-1" />
                                        ) : (
                                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-lg font-bold mb-1">
                                            {match.team2Name?.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <span className="text-sm font-medium">{match.team2Name}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="border rounded p-3 bg-muted/30">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium">Match {match.matchNumber}</span>
                                    <Badge 
                                      variant={match.status === 'finished' ? 'default' : 
                                              match.status === 'paused' ? 'secondary' : 
                                              match.status === 'inprogress' ? 'outline' : 'outline'}
                                      className="text-xs"
                                    >
                                      {match.status === 'finished' ? 'Finished' : 
                                       match.status === 'paused' ? 'Paused' : 
                                       match.status === 'inprogress' ? 'In Progress' : 'Pending'}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mb-2">
                                    Venue: {match.venue}
                                  </div>
                                  {match.status === 'finished' && match.result && (
                                    <div className="text-xs font-medium text-green-600 mb-2">
                                      {match.result}
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    {match.status === 'pending' && match.team1Name !== 'TBD' && (
                                      <Button 
                                        size="sm" 
                                        className="flex-1"
                                        onClick={() => startMatch(match)}
                                      >
                                        Start Match
                                      </Button>
                                    )}
                                    {match.status === 'paused' && (
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        className="flex-1"
                                        onClick={() => startMatch(match)}
                                      >
                                        Resume Match
                                      </Button>
                                    )}
                                    {match.status === 'inprogress' && (
                                      <Button 
                                        size="sm" 
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => startMatch(match)}
                                      >
                                        Continue Match
                                      </Button>
                                    )}
                                    {match.status === 'finished' && match.matchData && (
                                      <MatchScorecardDialog
                                        match={match.matchData}
                                        trigger={
                                          <Button size="sm" variant="outline" className="flex-1">
                                            View Scorecard
                                          </Button>
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <div className="space-y-6">
            {/* Header with overall stats */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-3">
                  <BarChart className="h-8 w-8 text-blue-600" />
                  Tournament Statistics Hub
                </CardTitle>
                <CardDescription className="text-lg text-gray-600">
                  Comprehensive player performance analysis across all teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-blue-600">{playerStats.length}</div>
                    <div className="text-sm text-gray-600">Active Players</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600">
                      {playerStats.filter(p => p.runs > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Batsmen</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-purple-600">
                      {playerStats.filter(p => p.wickets > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Bowlers</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-orange-600">
                      {tournament.teams.length}
                    </div>
                    <div className="text-sm text-gray-600">Teams</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Statistics Cards */}
            {playerStats.length === 0 ? (
              <Card className="text-center py-12">
                <div className="space-y-4">
                  <BarChart className="h-16 w-16 text-muted-foreground mx-auto" />
                  <h3 className="text-xl font-semibold text-muted-foreground">No Statistics Available</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Player statistics will appear here once matches are completed and data is processed.
                  </p>
                  <Button 
                    onClick={calculatePlayerStats} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Calculate Statistics
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tournament.teams.map(team => {
                  const teamPlayers = playerStats.filter(p => p.teamId === team.id && p.matches > 0);
                  const battingPlayers = teamPlayers.filter(p => p.runs > 0).sort((a, b) => b.runs - a.runs);
                  const bowlingPlayers = teamPlayers.filter(p => p.wickets > 0).sort((a, b) => b.wickets - a.wickets);
                  
                  if (teamPlayers.length === 0) return null;

                  return (
                    <Card key={team.id} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {team.logo ? (
                              <img src={team.logo} alt={`${team.name} logo`} className="w-12 h-12 rounded-lg shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {team.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-primary transition-colors">
                                {team.name}
                              </CardTitle>
                              <CardDescription className="text-gray-600">
                                {teamPlayers.length} active players
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-sm px-3 py-1">
                            {teamPlayers.length} players
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-6 space-y-6">
                        {/* Batting Statistics */}
                        {battingPlayers.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Target className="h-5 w-5 text-green-600" />
                              <h4 className="font-semibold text-lg text-gray-800">Batting Performance</h4>
                            </div>
                            
                            {/* Top Batsman Highlight */}
                            {battingPlayers[0] && (
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold text-green-800">🏆 Top Scorer</div>
                                    <div className="text-2xl font-bold text-green-700">{battingPlayers[0].playerName}</div>
                                    <div className="text-sm text-green-600">{battingPlayers[0].runs} runs in {battingPlayers[0].matches} matches</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-3xl font-bold text-green-600">{battingPlayers[0].runs}</div>
                                    <div className="text-sm text-green-600">runs</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Batting Stats Table */}
                            <div className="bg-white rounded-lg border overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                                  <div>Player</div>
                                  <div className="text-center">Matches</div>
                                  <div className="text-center">Runs</div>
                                  <div className="text-center">Average</div>
                                  <div className="text-center">Strike Rate</div>
                                </div>
                              </div>
                              <div className="divide-y">
                                {battingPlayers.slice(0, 5).map((player, index) => (
                                  <div key={player.playerId} className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                      {index === 0 && <span className="text-yellow-500">🥇</span>}
                                      {index === 1 && <span className="text-gray-400">🥈</span>}
                                      {index === 2 && <span className="text-amber-600">🥉</span>}
                                      {player.playerName}
                                    </div>
                                    <div className="text-center text-gray-600">{player.matches}</div>
                                    <div className="text-center font-semibold text-gray-900">{player.runs}</div>
                                    <div className="text-center text-gray-600">{(player.runs / (player.matches || 1)).toFixed(1)}</div>
                                    <div className="text-center text-gray-600">{player.strikeRate.toFixed(1)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Bowling Statistics */}
                        {bowlingPlayers.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Zap className="h-5 w-5 text-purple-600" />
                              <h4 className="font-semibold text-lg text-gray-800">Bowling Performance</h4>
                            </div>
                            
                            {/* Top Bowler Highlight */}
                            {bowlingPlayers[0] && (
                              <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold text-purple-800">🎯 Top Wicket Taker</div>
                                    <div className="text-2xl font-bold text-purple-700">{bowlingPlayers[0].playerName}</div>
                                    <div className="text-sm text-purple-600">{bowlingPlayers[0].wickets} wickets in {bowlingPlayers[0].matches} matches</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-3xl font-bold text-purple-600">{bowlingPlayers[0].wickets}</div>
                                    <div className="text-sm text-purple-600">wickets</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Bowling Stats Table */}
                            <div className="bg-white rounded-lg border overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
                                  <div>Player</div>
                                  <div className="text-center">Matches</div>
                                  <div className="text-center">Wickets</div>
                                  <div className="text-center">Average</div>
                                  <div className="text-center">Economy</div>
                                </div>
                              </div>
                              <div className="divide-y">
                                {bowlingPlayers.slice(0, 5).map((player, index) => (
                                  <div key={player.playerId} className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                      {index === 0 && <span className="text-yellow-500">🥇</span>}
                                      {index === 1 && <span className="text-gray-400">🥈</span>}
                                      {index === 2 && <span className="text-amber-600">🥉</span>}
                                      {player.playerName}
                                    </div>
                                    <div className="text-center text-gray-600">{player.matches}</div>
                                    <div className="text-center font-semibold text-gray-900">{player.wickets}</div>
                                    <div className="text-center text-gray-600">{player.average.toFixed(1)}</div>
                                    <div className="text-center text-gray-600">{player.economyRate.toFixed(1)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Team Performance Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">
                                {battingPlayers.reduce((sum, p) => sum + p.runs, 0)}
                              </div>
                              <div className="text-sm text-blue-600">Total Team Runs</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-purple-600">
                                {bowlingPlayers.reduce((sum, p) => sum + p.wickets, 0)}
                              </div>
                              <div className="text-sm text-purple-600">Total Team Wickets</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Completed Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournament.matches.filter(m => m.status === 'finished').map(match => (
                  <Card key={match.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={match.round === 'final' ? 'default' : 'secondary'}>
                          {match.round === 'final' ? 'Final' : match.round === 'qualifier1' ? 'Qualifier 1' : match.round === 'qualifier2' ? 'Qualifier 2' : match.round === 'eliminator' ? 'Eliminator' : `Match ${match.matchNumber}`}
                        </Badge>
                        {match.venue && (
                          <span className="text-xs text-muted-foreground">{match.venue}</span>
                        )}
                      </div>
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          {(() => {
                            const team1 = tournament.teams.find(t => t.name === match.team1Name);
                            return (
                              <div className="flex items-center gap-1">
                                {team1?.logo ? (
                                  <img src={team1.logo} alt={`${team1.name} logo`} className="w-4 h-4 rounded" />
                                ) : (
                                  <div className="w-4 h-4 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                                    {team1?.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <p className="font-semibold">{match.team1Name}</p>
                              </div>
                            );
                          })()}
                        </div>
                        <p className="text-muted-foreground">vs</p>
                        <div className="flex items-center justify-center gap-2">
                          {(() => {
                            const team2 = tournament.teams.find(t => t.name === match.team2Name);
                            return (
                              <div className="flex items-center gap-1">
                                {team2?.logo ? (
                                  <img src={team2.logo} alt={`${team2.name} logo`} className="w-4 h-4 rounded" />
                                ) : (
                                  <div className="w-4 h-4 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                                    {team2?.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <p className="font-semibold">{match.team2Name}</p>
                              </div>
                            );
                          })()}
                        </div>
                        {match.completedDate && (
                          <p className="text-xs text-muted-foreground">{new Date(match.completedDate).toLocaleString()}</p>
                        )}
                        {match.result && (
                          <p className="text-sm">{match.result}</p>
                        )}
                      </div>
                      {match.matchData && (
                        <MatchScorecardDialog 
                          match={match.matchData as any}
                          trigger={<Button variant="outline" className="w-full" size="sm">View Scorecard</Button>}
                        />
                      )}
                    </div>
                  </Card>
                ))}
                {tournament.matches.filter(m => m.status === 'finished').length === 0 && (
                  <div className="text-sm text-muted-foreground">No completed matches yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Auction Tab */}
        {tournament.status === 'auction' && (
          <TabsContent value="auction">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="w-6 h-6 text-orange-500" />
                  Player Auction
                </CardTitle>
                <CardDescription>
                  Bid on players to build your tournament teams. Each team starts with ₹100 purse and needs 13 players.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TournamentAuction
                  teams={tournament.teams.map(team => ({
                    id: team.id,
                    name: team.name,
                    logo: team.logo,
                    purse: 150, // Starting purse for each team
                    initialPurse: 150,
                    players: team.players,
                    maxPlayers: 15,
                    minPlayers: 13,
                    // carry over pre-retentions from tournament for exclusion in auction
                    captainId: team.captainId,
                    retainedPlayerIds: team.retainedPlayerIds,
                  }))}
                  onAuctionComplete={(updatedTeams) => {
                    // Update tournament with auction results
                    const updatedTournament = {
                      ...tournament,
                      status: 'draft' as const,
                      teams: tournament.teams.map(team => {
                        const auctionTeam = updatedTeams.find(at => at.id === team.id);
                        return {
                          ...team,
                          players: auctionTeam ? auctionTeam.players : team.players,
                        };
                      }),
                    };
                    onTournamentUpdate(updatedTournament);
                    toast({
                      title: "Auction Complete!",
                      description: "Teams have been built through the auction system.",
                    });
                  }}
                  onBack={() => setActiveTab('overview')}
                  tournamentPlayerStats={playerStats}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      {showPlayerData && (
        <PlayerDataDisplay players={playerStats} onClose={() => setShowPlayerData(false)} />
      )}
    </div>
  );
}
