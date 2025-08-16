"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Users, Calendar, Trash2, Eye, RefreshCw } from 'lucide-react';
import type { Tournament } from '@/types';
import PlayerDataDisplay from './player-data-display';

interface TournamentsListProps {
  tournaments: Tournament[];
  onCreateTournament: () => void;
  onViewTournament: (tournament: Tournament) => void;
  onDeleteTournament: (tournamentId: string) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function TournamentsList({ 
  tournaments, 
  onCreateTournament, 
  onViewTournament, 
  onDeleteTournament,
  isLoading = false,
  onRefresh
}: TournamentsListProps) {
  const [showPlayerData, setShowPlayerData] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);
  const [globalPlayerStats, setGlobalPlayerStats] = useState<any[]>([]);

  // Calculate global player stats from all tournaments
  const calculateGlobalPlayerStats = () => {
    const playerMap = new Map<number, any>();

    tournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        if (match.status === 'finished' && match.matchData) {
          // Process batting and bowling stats from innings
          match.matchData.innings.forEach(innings => {
            // Get batting team players
            const battingTeam = innings.battingTeam;
            battingTeam.players.forEach(player => {
              let playerStat = playerMap.get(player.id);
              if (!playerStat) {
                playerStat = {
                  playerId: player.id,
                  playerName: player.name,
                  teamId: battingTeam.id,
                  teamName: battingTeam.name,
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
              
              // Add batting stats
              playerStat.runs += player.batting.runs;
              playerStat.ballsFaced += player.batting.ballsFaced;
              playerStat.fours += player.batting.fours;
              playerStat.sixes += player.batting.sixes;
            });

            // Get bowling team players
            const bowlingTeam = innings.bowlingTeam;
            bowlingTeam.players.forEach(player => {
              let playerStat = playerMap.get(player.id);
              if (!playerStat) {
                playerStat = {
                  playerId: player.id,
                  playerName: player.name,
                  teamId: bowlingTeam.id,
                  teamName: bowlingTeam.name,
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
              
              // Add bowling stats
              playerStat.wickets += player.bowling.wickets;
              playerStat.ballsBowled += player.bowling.ballsBowled;
              playerStat.runsConceded += player.bowling.runsConceded;
              playerStat.maidens += player.bowling.maidens;
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

    const stats = Array.from(playerMap.values());
    setGlobalPlayerStats(stats);
    console.log('Global player stats calculated:', stats);
    return stats;
  };

  const handleViewPlayerData = () => {
    const stats = calculateGlobalPlayerStats();
    setShowPlayerData(true);
  };

  const handleDeleteTournament = (tournamentId: string) => {
    if (window.confirm('Are you sure you want to delete this tournament? This will also delete all associated match data and player statistics.')) {
      onDeleteTournament(tournamentId);
      setTournamentToDelete(null);
    }
  };

  const getTournamentStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTournamentTypeLabel = (tournament: Tournament) => {
    switch (tournament.settings.tournamentType) {
      case 'round-robin-3': return 'Round Robin (3x)';
      case 'round-robin-2': return 'Round Robin (2x)';
      case 'knockout': return 'Knockout';
      case 'ipl-style': return 'IPL Style';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {showPlayerData && (
        <PlayerDataDisplay 
          players={globalPlayerStats} 
          onClose={() => setShowPlayerData(false)} 
        />
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground">Manage and participate in cricket tournaments</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleViewPlayerData}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Player Data
          </Button>
          {onRefresh && (
            <Button 
              variant="outline" 
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Button onClick={onCreateTournament} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Tournament
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="text-center py-12">
          <CardContent>
            <RefreshCw className="w-16 h-16 mx-auto text-muted-foreground mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading tournaments...</h3>
            <p className="text-muted-foreground">Please wait while we fetch your tournaments</p>
          </CardContent>
        </Card>
      ) : tournaments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tournaments yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first tournament to get started with team competitions
            </p>
            <Button onClick={onCreateTournament} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Tournament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{tournament.name}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getTournamentTypeLabel(tournament)}
                      </Badge>
                      <Badge className={`text-xs ${getTournamentStatusColor(tournament.status)}`}>
                        {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTournamentToDelete(tournament.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Team logos preview */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Teams:</span>
                  <div className="flex -space-x-2">
                    {tournament.teams.slice(0, 4).map((team) => (
                      <div key={team.id} className="relative">
                        {team.logo ? (
                          <img 
                            src={team.logo} 
                            alt={`${team.name} logo`} 
                            className="w-6 h-6 rounded-full border-2 border-background"
                            title={team.name}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {tournament.teams.length > 4 && (
                      <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                        +{tournament.teams.length - 4}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{tournament.numberOfTeams} teams</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{tournament.matches.length} matches</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trophy className="w-4 h-4" />
                  <span>{tournament.settings.oversPerInnings} overs</span>
                </div>
                
                {tournament.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => onViewTournament(tournament)} 
                    className="flex-1"
                  >
                    {tournament.status === 'draft' ? 'Manage Tournament' : 'View Tournament'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tournamentToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Tournament</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to delete this tournament? This action cannot be undone and will remove:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>All tournament data</li>
                <li>Match results and statistics</li>
                <li>Team information</li>
                <li>Player performance records</li>
              </ul>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setTournamentToDelete(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteTournament(tournamentToDelete)}
                  className="flex-1"
                >
                  Delete Tournament
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
