"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Calendar, Target, TrendingUp, Award, Play, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_PLAYERS } from '@/data/default-players';
import type { Tournament, TournamentTeam, TournamentMatch, PlayerStats, Match, MatchSettings } from '@/types';
import NewMatchForm from './new-match-form';
import ScoringInterface from './scoring-interface';
import MatchScorecardDialog from './match-scorecard-dialog';
import { updatePlayerHistoriesFromMatch } from '@/lib/player-stats-store';
import { Progress } from '@/components/ui/progress';

interface TournamentDashboardProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
  onBackToTournaments: () => void;
}

function computeTournamentAwards(tournament: Tournament, playerStats: PlayerStats[]) {
  const awards: any = {
    explosiveBatsman: null,
    bestAvgBatsman: null,
    bestAvgBowler: null,
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
  const { toast } = useToast();

  useEffect(() => {
    calculatePlayerStats();
  }, [tournament]);

  const calculatePlayerStats = () => {
    const stats: PlayerStats[] = [];
    const playerMap = new Map<number, PlayerStats>();

    // Initialize stats for all players in the tournament
    tournament.teams.forEach(team => {
      team.players.forEach(playerId => {
        const player = DEFAULT_PLAYERS.find(p => p.id === playerId);
        if (player) {
          const playerStat: PlayerStats = {
            playerId: player.id,
            playerName: player.name,
            teamId: team.id,
            teamName: team.name,
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
        }
      });
    });

    // Calculate stats from completed matches
    tournament.matches.forEach(match => {
      if (match.status === 'finished' && match.matchData) {
        // Process batting stats
        match.matchData.innings.forEach(innings => {
          innings.timeline.forEach(ball => {
            if (ball.event === 'run') {
              const playerStat = playerMap.get(ball.batsmanId);
              if (playerStat) {
                playerStat.runs += ball.runs;
                playerStat.ballsFaced += 1;
                if (ball.runs === 4) playerStat.fours += 1;
                if (ball.runs === 6) playerStat.sixes += 1;
              }
            }
          });
        });

        // Process bowling stats
        match.matchData.innings.forEach(innings => {
          innings.timeline.forEach(ball => {
            if (ball.isWicket) {
              const playerStat = playerMap.get(ball.bowlerId);
              if (playerStat) {
                playerStat.wickets += 1;
              }
            }
            if (ball.event !== 'wd' && ball.event !== 'nb') {
              const playerStat = playerMap.get(ball.bowlerId);
              if (playerStat) {
                playerStat.ballsBowled += 1;
                playerStat.runsConceded += ball.runs + ball.extras;
              }
            }
          });
        });

        // Count matches for each player
        match.matchData.teams.forEach(team => {
          team.players.forEach(player => {
            const playerStat = playerMap.get(player.id);
            if (playerStat) {
              playerStat.matches += 1;
            }
          });
        });
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

    setPlayerStats(Array.from(playerMap.values()));
  };

  const startMatch = (match: TournamentMatch) => {
    // Check if match is already in progress
    if (match.status === 'inprogress') {
      // Resume existing match
      if (match.matchData) {
        setCurrentMatch(match.matchData);
        return;
      }
    }
    
    setSelectedMatch(match);
    setShowMatchForm(true);
  };

  const resumeMatch = (match: TournamentMatch) => {
    if (match.matchData) {
      setCurrentMatch(match.matchData);
    }
  };

  const pauseMatch = () => {
    if (currentMatch) {
      // Update the tournament match status to inprogress (so it can be resumed)
      const updatedMatches = tournament.matches.map(m => 
        m.id === currentMatch.id 
          ? { ...m, status: 'inprogress' as const, matchData: currentMatch }
          : m
      );

      const updatedTournament = {
        ...tournament,
        matches: updatedMatches,
      };

      onTournamentUpdate(updatedTournament);
      setCurrentMatch(null);
      toast({
        title: "Match Paused",
        description: "You can resume this match later from the tournament dashboard.",
      });
    }
  };

  const handleNewMatch = (settings: MatchSettings) => {
    if (!selectedMatch) return;

    // Create players for the match from tournament teams
    const team1 = tournament.teams.find(t => t.id === selectedMatch.team1Id);
    const team2 = tournament.teams.find(t => t.id === selectedMatch.team2Id);
    
    if (!team1 || !team2) return;

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
            status: 'not out' as const,
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

    // Determine which team bats first based on toss
    const firstBattingTeam = settings.toss.winner === team1.name ? matchTeam1 : matchTeam2;
    const firstBowlingTeam = settings.toss.winner === team1.name ? matchTeam2 : matchTeam1;

    // Set initial batting status for first 11 players (or all if less than 11)
    const maxBattingPlayers = Math.min(11, firstBattingTeam.players.length);
    firstBattingTeam.players.forEach((p, i) => {
      p.batting.status = i >= maxBattingPlayers ? 'did not bat' : 'not out';
    });

    // Set substitute status for players beyond 11
    firstBattingTeam.players.forEach((p, i) => {
      p.isSubstitute = i >= 11;
    });
    firstBowlingTeam.players.forEach((p, i) => {
      p.isSubstitute = i >= 11;
    });

    const matchData: Match = {
      id: selectedMatch.id,
      teams: [matchTeam1, matchTeam2],
      oversPerInnings: tournament.settings.oversPerInnings,
      toss: settings.toss,
      innings: [
        {
          battingTeam: firstBattingTeam,
          bowlingTeam: firstBowlingTeam,
          score: 0,
          wickets: 0,
          overs: 0,
          ballsThisOver: 0,
          timeline: [],
          fallOfWickets: [],
          currentPartnership: {
            batsman1: firstBattingTeam.players[0]?.id || 0,
            batsman2: firstBattingTeam.players[1]?.id || 0,
            runs: 0,
            balls: 0,
          },
          batsmanOnStrike: firstBattingTeam.players[0]?.id || 0,
          batsmanNonStrike: firstBattingTeam.players[1]?.id || 0,
          currentBowler: firstBowlingTeam.players[0]?.id || 0,
          fieldPlacements: [],
          isFreeHit: false,
        }
      ],
      currentInnings: 1,
      status: 'inprogress',
      matchType: tournament.settings.matchType,
    };

    setCurrentMatch(matchData);
    setShowMatchForm(false);
    setSelectedMatch(null);

    // Update the tournament match status to inprogress
    const updatedMatches = tournament.matches.map(m => 
      m.id === selectedMatch.id 
        ? { ...m, status: 'inprogress' as const }
        : m
    );

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
    };

    onTournamentUpdate(updatedTournament);
  };

  const endMatch = (matchResult: Match) => {
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

    // Persist player histories
    updatePlayerHistoriesFromMatch(matchResult, tournament.id);

    // Update tournament match status with result
    const updatedMatches = tournament.matches.map(m => 
      m.id === matchResult.id 
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

    const thisMatch = updatedMatches.find(m => m.id === matchResult.id)!;

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
    if (thisMatch.round === 'qualifier1' && q1 && finalMatch && q2 && thisMatch.winnerTeamId && thisMatch.loserTeamId) {
      // Q1 winner to Final, loser to Qualifier 2
      finalMatch.team1Id = thisMatch.winnerTeamId; finalMatch.team1Name = tournament.teams.find(t => t.id === thisMatch.winnerTeamId)?.name || 'TBD';
      q2.team2Id = thisMatch.loserTeamId; q2.team2Name = tournament.teams.find(t => t.id === thisMatch.loserTeamId)?.name || 'TBD';
    }

    if (thisMatch.round === 'eliminator' && elim && q2 && thisMatch.winnerTeamId) {
      // Eliminator winner to Qualifier 2
      q2.team1Id = thisMatch.winnerTeamId; q2.team1Name = tournament.teams.find(t => t.id === thisMatch.winnerTeamId)?.name || 'TBD';
    }

    if (thisMatch.round === 'qualifier2' && q2 && finalMatch && thisMatch.winnerTeamId) {
      // Qualifier 2 winner to Final (second slot)
      finalMatch.team2Id = thisMatch.winnerTeamId; finalMatch.team2Name = tournament.teams.find(t => t.id === thisMatch.winnerTeamId)?.name || 'TBD';
    }

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      teams: updatedTeams,
      status: completedGroupMatches.length === groupMatches.length ? 'active' : 'draft',
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

    onTournamentUpdate(updatedTournament);
    setCurrentMatch(null);
    toast({
      title: "Match Completed",
      description: `Match finished: ${matchResultText}`,
    });
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
  const leaderboards = computeLeaderboards(playerStats);
  const finishedMatches = [...tournament.matches].filter(m => m.status === 'finished' && m.matchData);
  const lastFinished = finishedMatches.length ? finishedMatches.sort((a,b)=> (b.completedDate? new Date(b.completedDate).getTime():0) - (a.completedDate? new Date(a.completedDate).getTime():0))[0] : null;
  const lastMatchFantasy = lastFinished ? computeFantasyPointsForMatch(lastFinished.matchData as Match) : [];
  const tournamentFantasy = computeFantasyPointsForTournament(tournament.matches);

  if (currentMatch) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentMatch(null)}>
            ← Back to Tournament
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Tournament Match</h2>
            <Button variant="outline" onClick={pauseMatch} size="sm">
              Pause Match
            </Button>
          </div>
        </div>
        <ScoringInterface 
          match={currentMatch} 
          setMatch={(match) => setCurrentMatch(match)} 
          endMatch={() => endMatch(currentMatch)}
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
              onNewMatch={handleNewMatch}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBackToTournaments}>
          ← Back to Tournaments
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>
      </div>

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
                <Badge variant={tournament.status === 'active' ? 'default' : 'secondary'}>
                  {tournament.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="points-table">Points Table</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
                        {team.logo && (
                          <img src={team.logo} alt={`${team.name} logo`} className="w-4 h-4" />
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
          <Card>
            <CardHeader><CardTitle>Advanced Awards</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const widths = normalize(leaderboards.bySR.map(p => p.strikeRate));
                return (
                  <div>
                    <h4 className="font-semibold mb-2">Best Strike Rate</h4>
                    {leaderboards.bySR.map((p, i) => (
                      <div key={p.playerId} className="space-y-1 mb-1">
                        <div className="flex items-center justify-between text-sm"><span>{i+1}. {p.playerName}</span><span>{p.strikeRate.toFixed(1)}</span></div>
                        <Progress value={widths[i]} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                const widths = normalize(leaderboards.byEcon.map(p => 1/Math.max(0.01,p.economyRate))); // lower better
                return (
                  <div>
                    <h4 className="font-semibold mb-2">Best Economy</h4>
                    {leaderboards.byEcon.map((p, i) => (
                      <div key={p.playerId} className="space-y-1 mb-1">
                        <div className="flex items-center justify-between text-sm"><span>{i+1}. {p.playerName}</span><span>{p.economyRate.toFixed(2)}</span></div>
                        <Progress value={widths[i]} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                const widths = normalize(leaderboards.byAvgBat.map(p => p.runs/p.matches));
                return (
                  <div>
                    <h4 className="font-semibold mb-2">Best Avg Batsman</h4>
                    {leaderboards.byAvgBat.map((p, i) => (
                      <div key={p.playerId} className="space-y-1 mb-1">
                        <div className="flex items-center justify-between text-sm"><span>{i+1}. {p.playerName}</span><span>{(p.runs/p.matches).toFixed(1)}</span></div>
                        <Progress value={widths[i]} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                const widths = normalize(leaderboards.byAvgBowl.map(p => p.wickets/p.matches));
                return (
                  <div>
                    <h4 className="font-semibold mb-2">Best Avg Bowler</h4>
                    {leaderboards.byAvgBowl.map((p, i) => (
                      <div key={p.playerId} className="space-y-1 mb-1">
                        <div className="flex items-center justify-between text-sm"><span>{i+1}. {p.playerName}</span><span>{(p.wickets/p.matches).toFixed(2)}</span></div>
                        <Progress value={widths[i]} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                const widths = normalize(leaderboards.explosive.map(p => (p.fours*4 + p.sixes*6)/Math.max(1,p.ballsFaced)));
                return (
                  <div>
                    <h4 className="font-semibold mb-2">Most Explosive</h4>
                    {leaderboards.explosive.map((p, i) => (
                      <div key={p.playerId} className="space-y-1 mb-1">
                        <div className="flex items-center justify-between text-sm"><span>{i+1}. {p.playerName}</span><span>{(((p.fours*4 + p.sixes*6)/Math.max(1,p.ballsFaced))*100).toFixed(1)} EI</span></div>
                        <Progress value={widths[i]} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {(() => {
                const mvpList = [...playerStats].map(p => ({...p, impact: p.runs + p.wickets*20 + p.fours + p.sixes*2 - (p.runsConceded/5)})).sort((a,b)=> b.impact - a.impact).slice(0,5);
                const widths = normalize(mvpList.map(p => p.impact));
                return (
                  <div>
                    <h4 className="font-semibold mb-2">MVP (Impact)</h4>
                    {mvpList.map((p, i) => (
                      <div key={p.playerId} className="space-y-1 mb-1">
                        <div className="flex items-center justify-between text-sm"><span>{i+1}. {p.playerName}</span><span>{p.impact.toFixed(0)}</span></div>
                        <Progress value={widths[i]} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                );
              })()}

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
                        <TableCell className="flex items-center gap-2">
                          {team.logo && (
                            <img src={team.logo} alt={`${team.name} logo`} className="w-6 h-6 rounded" />
                          )}
                          {team.name}
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

        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournament.matches.map(match => (
                  <Card key={match.id} className="p-4">
                    <div className="space-y-3">
                      <div className="text-center">
                        <Badge variant={match.round === 'final' ? 'default' : 'secondary'}>
                          {match.round === 'final' ? 'Final' : `Match ${match.matchNumber}`}
                        </Badge>
                      </div>
                      
                      <div className="text-center space-y-1">
                        <p className="font-semibold">{match.team1Name}</p>
                        <p className="text-muted-foreground">vs</p>
                        <p className="font-semibold">{match.team2Name}</p>
                        {match.venue && (
                          <p className="text-xs text-muted-foreground">Venue: {match.venue}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        {match.status === 'pending' && (
                          <>
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Pending</span>
                          </>
                        )}
                        {match.status === 'inprogress' && (
                          <>
                            <Play className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">Live</span>
                          </>
                        )}
                        {match.status === 'finished' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-blue-600">Completed</span>
                          </>
                        )}
                      </div>

                      {match.status === 'pending' && (
                        <Button 
                          onClick={() => startMatch(match)}
                          className="w-full"
                          size="sm"
                        >
                          Start Match
                        </Button>
                      )}

                      {match.status === 'inprogress' && (
                        <Button 
                          onClick={() => resumeMatch(match)}
                          className="w-full"
                          size="sm"
                        >
                          Resume Match
                        </Button>
                      )}

                      {match.status === 'finished' && match.result && (
                        <p className="text-sm text-center text-muted-foreground">
                          {match.result}
                        </p>
                      )}

                      {match.status === 'finished' && (
                        <MatchScorecardDialog 
                          match={match.matchData as any}
                          trigger={<Button variant="outline" className="w-full" size="sm">View Scorecard</Button>}
                        />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Player Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Wickets</TableHead>
                    <TableHead>Avg</TableHead>
                    <TableHead>SR</TableHead>
                    <TableHead>Econ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerStats
                    .filter(p => p.matches > 0)
                    .sort((a, b) => b.runs - a.runs)
                    .map(player => (
                      <TableRow key={player.playerId}>
                        <TableCell className="font-medium">{player.playerName}</TableCell>
                        <TableCell>{player.teamName}</TableCell>
                        <TableCell>{player.matches}</TableCell>
                        <TableCell>{player.runs}</TableCell>
                        <TableCell>{player.wickets}</TableCell>
                        <TableCell>{player.average.toFixed(1)}</TableCell>
                        <TableCell>{player.strikeRate.toFixed(1)}</TableCell>
                        <TableCell>{player.economyRate.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                        <p className="font-semibold">{match.team1Name}</p>
                        <p className="text-muted-foreground">vs</p>
                        <p className="font-semibold">{match.team2Name}</p>
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
      </Tabs>
    </div>
  );
}
