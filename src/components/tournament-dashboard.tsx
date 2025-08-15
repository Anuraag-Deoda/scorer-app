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

interface TournamentDashboardProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
  onBackToTournaments: () => void;
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
    if (matchResult.innings.length >= 2) {
      const team1Score = matchResult.innings[0].score;
      const team2Score = matchResult.innings[1].score;
      const team1Name = matchResult.innings[0].battingTeam.name;
      const team2Name = matchResult.innings[1].battingTeam.name;
      
      if (team2Score > team1Score) {
        const wicketsLeft = 10 - matchResult.innings[1].wickets;
        matchResultText = `${team2Name} won by ${wicketsLeft} wickets`;
      } else if (team1Score > team2Score) {
        matchResultText = `${team1Name} won by ${team1Score - team2Score} runs`;
      } else {
        matchResultText = 'Match tied';
      }
    } else if (matchResult.innings.length === 1) {
      const team1Score = matchResult.innings[0].score;
      const team1Name = matchResult.innings[0].battingTeam.name;
      matchResultText = `${team1Name} scored ${team1Score} runs`;
    }

    // Update tournament match status with result
    const updatedMatches = tournament.matches.map(m => 
      m.id === matchResult.id 
        ? { 
            ...m, 
            status: 'finished' as const, 
            matchData: matchResult,
            result: matchResultText
          }
        : m
    );

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

    // Update final match participants if group stage is complete
    const groupMatches = updatedMatches.filter(m => m.round === 'group');
    const completedGroupMatches = groupMatches.filter(m => m.status === 'finished');
    
    if (completedGroupMatches.length === groupMatches.length) {
      // Group stage complete, determine finalists
      const sortedTeams = [...updatedTeams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.netRunRate - a.netRunRate;
      });

      const finalMatch = updatedMatches.find(m => m.round === 'final');
      if (finalMatch && sortedTeams.length >= 2) {
        finalMatch.team1Id = sortedTeams[0].id;
        finalMatch.team2Id = sortedTeams[1].id;
        finalMatch.team1Name = sortedTeams[0].name;
        finalMatch.team2Name = sortedTeams[1].name;
      }
    }

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      teams: updatedTeams,
      status: completedGroupMatches.length === groupMatches.length ? 'active' : 'draft',
    };

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="points-table">Points Table</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
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
                  {getTopPlayers('batting').map((player, index) => (
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
                  {getTopPlayers('bowling').map((player, index) => (
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
                            <img src={team.logo} alt={`${team.name} logo`} className="w-6 h-6" />
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
      </Tabs>
    </div>
  );
}
