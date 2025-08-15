"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_PLAYERS } from '@/data/default-players';
import type { Tournament, TournamentTeam, MatchType, TournamentMatch } from '@/types';
import { loadAllPlayerHistories } from '@/lib/player-stats-store';

interface TournamentCreationFormProps {
  onTournamentCreated: (tournament: Tournament) => void;
  onCancel: () => void;
}

export default function TournamentCreationForm({ onTournamentCreated, onCancel }: TournamentCreationFormProps) {
  const [tournamentName, setTournamentName] = useState('');
  const [description, setDescription] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  const [oversPerInnings, setOversPerInnings] = useState(5);
  const [matchType, setMatchType] = useState<MatchType>('5 Overs');
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [currentTeamName, setCurrentTeamName] = useState('');
  const [currentTeamLogo, setCurrentTeamLogo] = useState<File | null>(null);
  const [currentTeamHomeGround, setCurrentTeamHomeGround] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const { toast } = useToast();

  // Get available players (not selected by any team)
  const getAvailablePlayers = () => {
    const selectedPlayerIds = teams.flatMap(team => team.players);
    return DEFAULT_PLAYERS.filter(player => !selectedPlayerIds.includes(player.id));
  };

  const handleAddTeam = () => {
    if (!currentTeamName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a team name." });
      return;
    }

    if (!currentTeamHomeGround.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a home ground." });
      return;
    }

    if (selectedPlayers.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select at least one player for the team." });
      return;
    }

    if (selectedPlayers.length > 13) {
      toast({ variant: "destructive", title: "Error", description: "A team can have maximum 13 players." });
      return;
    }

    const newTeam: TournamentTeam = {
      id: teams.length + 1,
      name: currentTeamName.trim(),
      logo: currentTeamLogo ? URL.createObjectURL(currentTeamLogo) : undefined,
      homeGround: currentTeamHomeGround.trim(),
      players: selectedPlayers,
      points: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesTied: 0,
      netRunRate: 0,
      runsScored: 0,
      runsConceded: 0,
      oversFaced: 0,
      oversBowled: 0,
    };

    setTeams([...teams, newTeam]);
    setCurrentTeamName('');
    setCurrentTeamLogo(null);
    setCurrentTeamHomeGround('');
    setSelectedPlayers([]);

    toast({ title: "Team Added", description: `${newTeam.name} has been added to the tournament.` });
  };

  const handleRemoveTeam = (teamId: number) => {
    setTeams(teams.filter(team => team.id !== teamId));
  };

  const handlePlayerToggle = (playerId: number) => {
    setSelectedPlayers(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  };

  const handleCreateTournament = () => {
    if (!tournamentName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a tournament name." });
      return;
    }

    if (teams.length < 2) {
      toast({ variant: "destructive", title: "Error", description: "Please add at least 2 teams to create a tournament." });
      return;
    }

    // Generate tournament matches
    const matches = generateTournamentMatches(teams);

    const tournament: Tournament = {
      id: `tournament_${Date.now()}`,
      name: tournamentName.trim(),
      description: description.trim(),
      numberOfTeams: teams.length,
      teams,
      matches,
      status: 'draft',
      createdDate: new Date(),
      updatedDate: new Date(),
      settings: {
        oversPerInnings,
        matchType,
        groupStageRounds: 3, // Each team plays each other 3 times
        topTeamsAdvance: teams.length > 4 ? 4 : 2, // For playoffs
      },
    };

    onTournamentCreated(tournament);
  };

  const generateTournamentMatches = (tournamentTeams: TournamentTeam[]) => {
    const matches: TournamentMatch[] = [];
    let matchNumber = 1;

    // For each unique pair, schedule 3 matches: home1, home2, neutral
    for (let i = 0; i < tournamentTeams.length; i++) {
      for (let j = i + 1; j < tournamentTeams.length; j++) {
        const teamA = tournamentTeams[i];
        const teamB = tournamentTeams[j];
        matches.push({
          id: `match_${Date.now()}_${matchNumber}`,
          tournamentId: `tournament_${Date.now()}`,
          team1Id: teamA.id,
          team2Id: teamB.id,
          team1Name: teamA.name,
          team2Name: teamB.name,
          matchNumber: matchNumber++,
          round: 'group',
          venue: teamA.homeGround || 'Neutral',
          status: 'pending',
        });
        matches.push({
          id: `match_${Date.now()}_${matchNumber}`,
          tournamentId: `tournament_${Date.now()}`,
          team1Id: teamA.id,
          team2Id: teamB.id,
          team1Name: teamA.name,
          team2Name: teamB.name,
          matchNumber: matchNumber++,
          round: 'group',
          venue: teamB.homeGround || 'Neutral',
          status: 'pending',
        });
        matches.push({
          id: `match_${Date.now()}_${matchNumber}`,
          tournamentId: `tournament_${Date.now()}`,
          team1Id: teamA.id,
          team2Id: teamB.id,
          team1Name: teamA.name,
          team2Name: teamB.name,
          matchNumber: matchNumber++,
          round: 'group',
          venue: 'Neutral',
          status: 'pending',
        });
      }
    }

    // Add playoffs placeholders
    if (tournamentTeams.length > 4) {
      matches.push({ id: `q1_${Date.now()}`, tournamentId: `tournament_${Date.now()}`, team1Id: 0, team2Id: 0, team1Name: 'TBD', team2Name: 'TBD', matchNumber: matchNumber++, round: 'qualifier1', status: 'pending', venue: 'Neutral' });
      matches.push({ id: `elim_${Date.now()}`, tournamentId: `tournament_${Date.now()}`, team1Id: 0, team2Id: 0, team1Name: 'TBD', team2Name: 'TBD', matchNumber: matchNumber++, round: 'eliminator', status: 'pending', venue: 'Neutral' });
      matches.push({ id: `q2_${Date.now()}`, tournamentId: `tournament_${Date.now()}`, team1Id: 0, team2Id: 0, team1Name: 'TBD', team2Name: 'TBD', matchNumber: matchNumber++, round: 'qualifier2', status: 'pending', venue: 'Neutral' });
      matches.push({ id: `final_${Date.now()}`, tournamentId: `tournament_${Date.now()}`, team1Id: 0, team2Id: 0, team1Name: 'TBD', team2Name: 'TBD', matchNumber: matchNumber++, round: 'final', status: 'pending', venue: 'Neutral' });
    } else {
      matches.push({ id: `final_${Date.now()}`, tournamentId: `tournament_${Date.now()}`, team1Id: 0, team2Id: 0, team1Name: 'TBD', team2Name: 'TBD', matchNumber: matchNumber++, round: 'final', status: 'pending', venue: 'Neutral' });
    }

    return matches;
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'image/svg+xml' || file.type === 'image/png')) {
      setCurrentTeamLogo(file);
    } else if (file) {
      toast({ variant: "destructive", title: "Error", description: "Please upload an SVG or PNG file for the team logo." });
    }
  };

  const availablePlayers = getAvailablePlayers();
  const histories = loadAllPlayerHistories();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tournament Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tournament-name">Tournament Name</Label>
              <Input id="tournament-name" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} placeholder="Enter tournament name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number-of-teams">Number of Teams</Label>
              <Select value={numberOfTeams.toString()} onValueChange={(value) => setNumberOfTeams(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter tournament description" rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overs">Overs per Innings</Label>
              <Select value={oversPerInnings.toString()} onValueChange={(value) => setOversPerInnings(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 10, 20, 50].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-type">Match Type</Label>
              <Select value={matchType} onValueChange={(value) => setMatchType(value as MatchType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2 Overs">2 Overs</SelectItem>
                  <SelectItem value="5 Overs">5 Overs</SelectItem>
                  <SelectItem value="10 Overs">10 Overs</SelectItem>
                  <SelectItem value="T20">T20</SelectItem>
                  <SelectItem value="50 Overs">50 Overs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input id="team-name" value={currentTeamName} onChange={(e) => setCurrentTeamName(e.target.value)} placeholder="Enter team name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-logo">Team Logo (SVG/PNG)</Label>
              <div className="flex items-center gap-2">
                <Input id="team-logo" type="file" accept=".svg,.png" onChange={handleLogoUpload} className="hidden" />
                <Button type="button" variant="outline" onClick={() => document.getElementById('team-logo')?.click()} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-ground">Home Ground</Label>
              <Input id="home-ground" value={currentTeamHomeGround} onChange={(e) => setCurrentTeamHomeGround(e.target.value)} placeholder="e.g., Wankhede Stadium" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Select Players (Max 13) - Available: {availablePlayers.length}</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto border rounded-md p-4">
                {availablePlayers.map(player => {
                  const hist = histories[player.id]?.stats;
                  return (
                    <div key={player.id} className="flex items-center space-x-2">
                      <Checkbox id={`player-${player.id}`} checked={selectedPlayers.includes(player.id)} onCheckedChange={() => handlePlayerToggle(player.id)} disabled={selectedPlayers.length >= 13 && !selectedPlayers.includes(player.id)} />
                      <Label htmlFor={`player-${player.id}`} className="text-sm cursor-pointer">
                        {player.name}
                        {hist && (
                          <span className="ml-1 text-[11px] text-muted-foreground">({hist.runs}R, {hist.wickets}W)</span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {availablePlayers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">All players have been selected by teams.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Selected Players: {selectedPlayers.length}/13</Label>
              <Button type="button" onClick={handleAddTeam} disabled={!currentTeamName.trim() || !currentTeamHomeGround.trim() || selectedPlayers.length === 0} className="w-full">
                Add Team
              </Button>
            </div>
          </div>

          {teams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => (
                <div key={team.id} className="border rounded-lg p-4 relative">
                  <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 w-6 p-0" onClick={() => handleRemoveTeam(team.id)}>
                    <X className="h-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-3 mb-3">
                    {team.logo && (<img src={team.logo} alt={`${team.name} logo`} className="w-8 h-8" />)}
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">Home: {team.homeGround}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Players: {team.players.length}</p>
                    <div className="flex flex-wrap gap-1">
                      {team.players.slice(0, 5).map(playerId => {
                        const player = DEFAULT_PLAYERS.find(p => p.id === playerId);
                        return (<Badge key={playerId} variant="secondary" className="text-xs">{player?.name}</Badge>);
                      })}
                      {team.players.length > 5 && (<Badge variant="outline" className="text-xs">+{team.players.length - 5} more</Badge>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleCreateTournament} disabled={teams.length < 2 || !tournamentName.trim()}>Create Tournament</Button>
      </div>
    </div>
  );
}
