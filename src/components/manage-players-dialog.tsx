"use client";

import { useState, useEffect, useCallback, memo } from "react";
import type { Match, Team, Player } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";

const MAX_PLAYERS = 11;

const TeamEditor = memo(({ team, onPlayerNameChange, onSubstitute, onImpactPlayer }: { 
  team: Team, 
  onPlayerNameChange: (playerId: number, newName: string) => void,
  onSubstitute: (playerInId: number, playerOutId: number) => void,
  onImpactPlayer: (playerInId: number, playerOutId: number) => void
}) => {
    const playingXI = team.players.filter(p => !p.isSubstitute).slice(0, MAX_PLAYERS);
    const substitutes = team.players.filter(p => p.isSubstitute);

    const [playerToSubOut, setPlayerToSubOut] = useState<number | null>(null);
    const [playerToImpactOut, setPlayerToImpactOut] = useState<number | null>(null);

    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg">{team.name}</h3>
        <div>
          <h4 className="font-semibold mb-2">Playing XI</h4>
          {playingXI.map(player => (
            <div key={player.id} className="flex items-center gap-2 mb-2">
              <Input
                defaultValue={player.name}
                onChange={(e) => onPlayerNameChange(player.id, e.target.value)}
                className="h-8"
              />
            </div>
          ))}
        </div>
        <Separator />
         <div>
          <h4 className="font-semibold mb-2">Substitutes</h4>
           {substitutes.map(player => (
             <div key={player.id} className="flex items-center gap-2 mb-2">
                <Input
                  defaultValue={player.name}
                  onChange={(e) => onPlayerNameChange(player.id, e.target.value)}
                  className="h-8"
                />
             </div>
           ))}
        </div>
        <Separator />
        <div>
            <h4 className="font-semibold mb-2">Actions</h4>
            <div className="space-y-2">
                <Label>Substitute Player</Label>
                <div className="flex gap-2">
                    <select onChange={(e) => setPlayerToSubOut(parseInt(e.target.value))} className="w-full h-10 border rounded-md px-2 text-sm bg-background">
                        <option>Player Out</option>
                        {playingXI.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select 
                        disabled={playerToSubOut === null} 
                        onChange={(e) => {
                            if (playerToSubOut !== null) {
                                onSubstitute(parseInt(e.target.value), playerToSubOut);
                                setPlayerToSubOut(null);
                                e.target.value = "Player In";
                            }
                        }}
                        className="w-full h-10 border rounded-md px-2 text-sm bg-background"
                    >
                        <option>Player In</option>
                        {substitutes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </div>
             <div className="space-y-2 mt-2">
                <Label>Impact Player</Label>
                <div className="flex gap-2">
                    <select onChange={(e) => setPlayerToImpactOut(parseInt(e.target.value))} className="w-full h-10 border rounded-md px-2 text-sm bg-background">
                        <option>Player Out</option>
                        {playingXI.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select 
                        disabled={playerToImpactOut === null || team.impactPlayerUsed} 
                        onChange={(e) => {
                            if (playerToImpactOut !== null) {
                                onImpactPlayer(parseInt(e.target.value), playerToImpactOut);
                                setPlayerToImpactOut(null);
                                e.target.value = "Player In";
                            }
                        }}
                        className="w-full h-10 border rounded-md px-2 text-sm bg-background"
                    >
                        <option>Player In</option>
                        {substitutes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                 {team.impactPlayerUsed && <p className="text-xs text-destructive mt-1">Impact Player already used for {team.name}.</p>}
            </div>
        </div>
      </div>
    );
  });
TeamEditor.displayName = 'TeamEditor';

interface ManagePlayersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  match: Match;
  setMatch: (match: Match) => void;
}

export default function ManagePlayersDialog({
  isOpen,
  onOpenChange,
  match,
  setMatch,
}: ManagePlayersDialogProps) {
  const [localTeams, setLocalTeams] = useState<[Team, Team]>(() => JSON.parse(JSON.stringify(match.teams)));
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Fetch teams and players from the API instead of using match.teams
      Promise.all([
        fetch('/api/teams').then(res => res.json()),
        fetch('/api/players').then(res => res.json())
      ]).then(([teamsRes, playersRes]) => {
        // Map players to teams
        const teams: Team[] = teamsRes.teams || [];
        const players: Player[] = playersRes.players || [];
        // For each team, assign players whose names match (fallback: assign evenly)
        teams.forEach((team, i) => {
          team.players = players.filter((p, idx) => Math.floor(idx / 11) === i);
        });
        if (teams.length === 2) {
          setLocalTeams([teams[0], teams[1]]);
        } else {
          setLocalTeams(JSON.parse(JSON.stringify(match.teams)));
        }
      }).catch(() => {
        setLocalTeams(JSON.parse(JSON.stringify(match.teams)));
      });
    }
  }, [isOpen, match.teams]);

  const handleNameChangeForTeam = (teamIndex: number) => useCallback((playerId: number, newName: string) => {
    setLocalTeams(prevTeams => {
        const updatedTeams = [...prevTeams] as [Team, Team];
        const team = updatedTeams[teamIndex];
        const player = team.players.find(p => p.id === playerId);
        if (player) {
          player.name = newName;
        }
        return updatedTeams;
    });
  }, []);

  const handleSubstituteForTeam = (teamIndex: number) => useCallback((playerInId: number, playerOutId: number) => {
    setLocalTeams(prevTeams => {
        const updatedTeams = JSON.parse(JSON.stringify(prevTeams)) as [Team, Team];
        const team = updatedTeams[teamIndex];
        const playerInIndex = team.players.findIndex(p => p.id === playerInId);
        const playerOutIndex = team.players.findIndex(p => p.id === playerOutId);

        if (playerInIndex > -1 && playerOutIndex > -1) {
          const playerIn = team.players[playerInIndex];
          const playerOut = team.players[playerOutIndex];
          
          playerIn.isSubstitute = false;
          playerOut.isSubstitute = true;
          playerOut.batting.status = 'did not bat';
          
          [team.players[playerInIndex], team.players[playerOutIndex]] = [team.players[playerOutIndex], team.players[playerInIndex]];
        }
        return updatedTeams;
    });
  }, []);
  
  const handleImpactPlayerForTeam = (teamIndex: number) => useCallback((playerInId: number, playerOutId: number) => {
      setLocalTeams(prevTeams => {
          const updatedTeams = JSON.parse(JSON.stringify(prevTeams)) as [Team, Team];
          const team = updatedTeams[teamIndex];
          
          if (team.impactPlayerUsed) {
              toast({ variant: "destructive", title: "Impact Player already used" });
              return updatedTeams;
          }

          const playerIn = team.players.find(p => p.id === playerInId);
          const playerOut = team.players.find(p => p.id === playerOutId);
          
          if (playerIn && playerOut) {
              playerIn.isSubstitute = false;
              playerIn.isImpactPlayer = true;
              playerOut.isSubstitute = true;
              playerOut.batting.status = 'did not bat';
              team.impactPlayerUsed = true;
          }
          return updatedTeams;
      });
  }, [toast]);

  const handleSaveChanges = async () => {
    // Save players to DB
    const allPlayers = localTeams.flatMap(team => team.players);
    await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: allPlayers.map(p => ({ name: p.name, rating: p.rating })) }),
    });

    // Save teams to DB
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: localTeams.map(t => ({ name: t.name })) }),
    });

    // Fetch latest players and teams from DB
    const [playersRes, teamsRes] = await Promise.all([
      fetch('/api/players').then(res => res.json()),
      fetch('/api/teams').then(res => res.json())
    ]);
    const players = playersRes.players || [];
    const teams = teamsRes.teams || [];

    // Assign players to teams (simple even split or by name)
    teams.forEach((team: Team, i: number) => {
      team.players = players.filter((p: Player, idx: number) => Math.floor(idx / 11) === i);
    });

    const newMatch = JSON.parse(JSON.stringify(match));
    newMatch.teams = teams.length === 2 ? [teams[0], teams[1]] : localTeams;

    // Propagate player name changes to innings objects
    newMatch.innings.forEach((inning: any) => {
        [inning.battingTeam, inning.bowlingTeam].forEach((teamInInning: Team) => {
            const correspondingTeamFromState = newMatch.teams.find((t: Team) => t.id === teamInInning.id);
            if (correspondingTeamFromState) {
                teamInInning.name = correspondingTeamFromState.name;
                teamInInning.impactPlayerUsed = correspondingTeamFromState.impactPlayerUsed;

                teamInInning.players.forEach((player: Player) => {
                    const correspondingPlayerFromState = correspondingTeamFromState.players.find((p: Player) => p.id === player.id);
                    if (correspondingPlayerFromState) {
                        player.name = correspondingPlayerFromState.name;
                        player.isSubstitute = correspondingPlayerFromState.isSubstitute;
                        player.isImpactPlayer = correspondingPlayerFromState.isImpactPlayer;
                    }
                });
            }
        });
    });

    setMatch(newMatch);
    toast({ title: "Success", description: "Player and team changes have been saved to the database and updated in the match." });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Players</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <TeamEditor 
            team={localTeams[0]} 
            onPlayerNameChange={handleNameChangeForTeam(0)}
            onSubstitute={handleSubstituteForTeam(0)}
            onImpactPlayer={handleImpactPlayerForTeam(0)}
          />
          <TeamEditor 
            team={localTeams[1]}
            onPlayerNameChange={handleNameChangeForTeam(1)}
            onSubstitute={handleSubstituteForTeam(1)}
            onImpactPlayer={handleImpactPlayerForTeam(1)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
