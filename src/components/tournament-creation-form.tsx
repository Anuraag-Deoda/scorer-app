"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PLAYERS } from "@/data/default-players";
import { MatchType } from "@/types";
import type {
  Tournament,
  TournamentTeam,
  TournamentMatch,
  TournamentType,
} from "@/types";
import {
  loadAllPlayerHistories,
  PlayerHistory,
} from "@/lib/player-stats-store";

interface TournamentCreationFormProps {
  onTournamentCreated: (tournament: Tournament) => void;
  onCancel: () => void;
}

export default function TournamentCreationForm({
  onTournamentCreated,
  onCancel,
}: TournamentCreationFormProps) {
  const [tournamentName, setTournamentName] = useState("");
  const [description, setDescription] = useState("");
  const [numberOfTeams, setNumberOfTeams] = useState(4);
  const [oversPerInnings, setOversPerInnings] = useState(5);
  const [matchType, setMatchType] = useState<MatchType>(MatchType.FiveOvers);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [currentTeamName, setCurrentTeamName] = useState("");
  const [currentTeamLogo, setCurrentTeamLogo] = useState<File | null>(null);
  const [currentTeamLogoPreview, setCurrentTeamLogoPreview] =
    useState<string>("");
  const [currentTeamHomeGround, setCurrentTeamHomeGround] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [tournamentType, setTournamentType] =
    useState<TournamentType>("round-robin-3");
  const [useAuction, setUseAuction] = useState(false);
  // Pre-retention in auction mode
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [retainedId, setRetainedId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Get available players (not selected by any team)
  const getAvailablePlayers = () => {
    const selectedPlayerIds = teams.flatMap((team) => [
      ...team.players,
      ...(team.retainedPlayerIds || []),
      ...(team.captainId ? [team.captainId] : []),
    ]);
    return DEFAULT_PLAYERS.filter(
      (player) => !selectedPlayerIds.includes(player.id)
    );
  };

  const handleAddTeam = () => {
    if (!currentTeamName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a team name.",
      });
      return;
    }

    if (!currentTeamHomeGround.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a home ground.",
      });
      return;
    }

    if (!useAuction && selectedPlayers.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one player for the team.",
      });
      return;
    }

    if (!useAuction && selectedPlayers.length > 15) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "A team can have maximum 15 players.",
      });
      return;
    }

    const newTeam: TournamentTeam = {
      id: teams.length + 1,
      name: currentTeamName.trim(),
      logo: currentTeamLogoPreview,
      homeGround: currentTeamHomeGround.trim(),
      players: useAuction ? [] : selectedPlayers, // Empty array for auction mode
      // In auction mode we store pre-retentions
      ...(useAuction
        ? {
            captainId: captainId || undefined,
            retainedPlayerIds: retainedId ? [retainedId] : [],
          }
        : {}),
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
    setCurrentTeamName("");
    setCurrentTeamLogo(null);
    setCurrentTeamLogoPreview("");
    setCurrentTeamHomeGround("");
    setSelectedPlayers([]);
    setCaptainId(null);
    setRetainedId(null);

    toast({
      title: "Team Added",
      description: `${newTeam.name} has been added to the tournament.`,
    });
  };

  const handleRemoveTeam = (teamId: number) => {
    setTeams(teams.filter((team) => team.id !== teamId));
  };

  const handlePlayerToggle = (playerId: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleCreateTournament = async () => {
    if (!tournamentName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a tournament name.",
      });
      return;
    }

    if (teams.length < 2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least 2 teams to create a tournament.",
      });
      return;
    }

    if (useAuction) {
      // In auction mode, check if teams have no players
      const teamsWithPlayers = teams.filter((team) => team.players.length > 0);
      if (teamsWithPlayers.length > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "In auction mode, teams should not have pre-selected players.",
        });
        return;
      }
    }

    setIsCreating(true);

    try {
      // Generate tournament matches
      const matches = generateTournamentMatches(teams);

      const tournamentData = {
        name: tournamentName.trim(),
        description: description.trim(),
        numberOfTeams: teams.length,
        teams,
        matches,
        settings: {
          tournamentType,
          oversPerInnings: oversPerInnings,
          matchType: matchType as MatchType,
          groupStageRounds:
            tournamentType === "round-robin-3"
              ? 3
              : tournamentType === "round-robin-2"
              ? 2
              : 1,
          topTeamsAdvance: Math.min(4, teams.length),
        },
      };

      // Create tournament in database
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tournamentData),
      });

      if (!response.ok) {
        throw new Error("Failed to create tournament");
      }

      const result = await response.json();

      // Create tournament object for local state
      const tournament: Tournament = {
        id: result.tournamentId,
        name: tournamentName.trim(),
        description: description.trim(),
        numberOfTeams: teams.length,
        teams,
        matches,
        status: useAuction ? "auction" : "draft", // Set status to auction if using auction mode
        createdDate: new Date(),
        updatedDate: new Date(),
        settings: {
          tournamentType,
          oversPerInnings: oversPerInnings,
          matchType: matchType as MatchType,
          groupStageRounds:
            tournamentType === "round-robin-3"
              ? 3
              : tournamentType === "round-robin-2"
              ? 2
              : 1,
          topTeamsAdvance: Math.min(4, teams.length),
        },
        useAuction, // Add auction flag to tournament
      };

      onTournamentCreated(tournament);
      toast({
        title: "Success",
        description: "Tournament created successfully!",
      });
    } catch (error) {
      console.error("Error creating tournament:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create tournament. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const generateTournamentMatches = (
    tournamentTeams: TournamentTeam[]
  ): TournamentMatch[] => {
    const matches: TournamentMatch[] = [];
    let matchNumber = 1;
    const neutralVenue = "Neutral Ground";

    if (tournamentType === "knockout") {
      const shuffledTeams = [...tournamentTeams].sort(
        () => Math.random() - 0.5
      );
      for (let i = 0; i < shuffledTeams.length; i += 2) {
        if (shuffledTeams[i + 1]) {
          matches.push({
            id: `match${matchNumber++}`,
            tournamentId: "",
            team1Id: shuffledTeams[i].id,
            team2Id: shuffledTeams[i + 1].id,
            team1Name: shuffledTeams[i].name,
            team2Name: shuffledTeams[i + 1].name,
            matchNumber: matchNumber - 1,
            round: "group",
            status: "pending",
            venue: neutralVenue,
          });
        }
      }
    } else {
      const rounds =
        tournamentType === "round-robin-3"
          ? 3
          : tournamentType === "round-robin-2" || tournamentType === "ipl-style"
          ? 2
          : 1;
      const pairings: Array<{
        team1: TournamentTeam;
        team2: TournamentTeam;
        round: number;
        venue: string;
      }>[] = [];
      for (let r = 0; r < rounds; r++) {
        const roundPairs: Array<{
          team1: TournamentTeam;
          team2: TournamentTeam;
          round: number;
          venue: string;
        }> = [];
        for (let i = 0; i < tournamentTeams.length; i++) {
          for (let j = i + 1; j < tournamentTeams.length; j++) {
            const team1 = tournamentTeams[i];
            const team2 = tournamentTeams[j];
            let venue = neutralVenue;
            if (r === 0) venue = team1.homeGround || neutralVenue;
            else if (r === 1) venue = team2.homeGround || neutralVenue;
            roundPairs.push({ team1, team2, round: r, venue });
          }
        }
        // Randomize order per round
        for (let k = roundPairs.length - 1; k > 0; k--) {
          const swap = Math.floor(Math.random() * (k + 1));
          [roundPairs[k], roundPairs[swap]] = [roundPairs[swap], roundPairs[k]];
        }
        pairings.push(roundPairs);
      }

      // Flatten pairings while attempting to avoid consecutive matches for the same team
      const flat: (typeof pairings)[number] = pairings.flat();
      const scheduled: typeof flat = [];
      const lastPlayed = new Map<number, number>(); // teamId -> last index
      flat.forEach((p) => {
        scheduled.push(p);
      });
      // Simple shuffle to reduce back-to-back occurrences
      for (let i = 1; i < scheduled.length; i++) {
        const a = scheduled[i - 1];
        const b = scheduled[i];
        if (
          a &&
          b &&
          (a.team1.id === b.team1.id ||
            a.team1.id === b.team2.id ||
            a.team2.id === b.team1.id ||
            a.team2.id === b.team2.id)
        ) {
          const swapIndex = Math.min(i + 2, scheduled.length - 1);
          [scheduled[i], scheduled[swapIndex]] = [
            scheduled[swapIndex],
            scheduled[i],
          ];
        }
      }
      scheduled.forEach((p) => {
        matches.push({
          id: `match${matchNumber++}`,
          tournamentId: "",
          team1Id: p.team1.id,
          team2Id: p.team2.id,
          team1Name: p.team1.name,
          team2Name: p.team2.name,
          matchNumber: matchNumber - 1,
          round: "group",
          status: "pending",
          venue: p.venue,
        });
      });
    }

    if (
      tournamentTeams.length >= 4 &&
      (tournamentType === "ipl-style" || tournamentType !== "knockout")
    ) {
      matches.push({
        id: `match${matchNumber++}`,
        tournamentId: "",
        team1Id: 0,
        team2Id: 0,
        team1Name: "TBD",
        team2Name: "TBD",
        matchNumber: matchNumber - 1,
        round: "qualifier1",
        status: "pending",
        venue: neutralVenue,
      });
      matches.push({
        id: `match${matchNumber++}`,
        tournamentId: "",
        team1Id: 0,
        team2Id: 0,
        team1Name: "TBD",
        team2Name: "TBD",
        matchNumber: matchNumber - 1,
        round: "eliminator",
        status: "pending",
        venue: neutralVenue,
      });
      matches.push({
        id: `match${matchNumber++}`,
        tournamentId: "",
        team1Id: 0,
        team2Id: 0,
        team1Name: "TBD",
        team2Name: "TBD",
        matchNumber: matchNumber - 1,
        round: "qualifier2",
        status: "pending",
        venue: neutralVenue,
      });
    }

    matches.push({
      id: `match${matchNumber++}`,
      tournamentId: "",
      team1Id: 0,
      team2Id: 0,
      team1Name: "TBD",
      team2Name: "TBD",
      matchNumber: matchNumber - 1,
      round: "final",
      status: "pending",
      venue: neutralVenue,
    });

    return matches.map((m) => ({
      ...m,
      tournamentId: `tournament_${Date.now()}`,
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === "image/svg+xml" || file.type === "image/png")) {
      setCurrentTeamLogo(file);

      // Convert to base64 for preview and storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCurrentTeamLogoPreview(result);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please upload an SVG or PNG file for the team logo.",
      });
    }
  };
  const [availablePlayers, setAvailablePlayers] = useState<
    { id: number; name: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const histories = loadAllPlayerHistories();

  useEffect(() => {
    setAvailablePlayers(getAvailablePlayers());
  }, []);

  const filteredPlayers = availablePlayers.filter((player) =>
    player.name.toLowerCase().includes(search.toLowerCase())
  );
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
              <Input
                id="tournament-name"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Enter tournament name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number-of-teams">Number of Teams</Label>
              <Select
                value={numberOfTeams.toString()}
                onValueChange={(value) => setNumberOfTeams(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter tournament description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overs">Overs per Innings</Label>
              <Select
                value={oversPerInnings.toString()}
                onValueChange={(value) => setOversPerInnings(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 10, 20, 50].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-type">Match Type</Label>
              <Select
                value={matchType}
                onValueChange={(value) => setMatchType(value as MatchType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MatchType.TwoOvers}>2 Overs</SelectItem>
                  <SelectItem value={MatchType.FiveOvers}>5 Overs</SelectItem>
                  <SelectItem value={MatchType.TenOvers}>10 Overs</SelectItem>
                  <SelectItem value={MatchType.T20}>T20</SelectItem>
                  <SelectItem value={MatchType.FiftyOvers}>50 Overs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament-type">Tournament Type</Label>
            <Select
              value={tournamentType}
              onValueChange={(value: TournamentType) =>
                setTournamentType(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tournament type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round-robin-3">
                  Round Robin (3 matches each)
                </SelectItem>
                <SelectItem value="round-robin-2">
                  Round Robin (2 matches each)
                </SelectItem>
                <SelectItem value="knockout">
                  Single Elimination Knockout
                </SelectItem>
                <SelectItem value="ipl-style">
                  IPL Style (Group + Playoffs)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {tournamentType === "round-robin-3" &&
                "Each team plays every other team 3 times (home, away, neutral)"}
              {tournamentType === "round-robin-2" &&
                "Each team plays every other team 2 times (home, away)"}
              {tournamentType === "knockout" &&
                "Single elimination tournament - lose once and you're out!"}
              {tournamentType === "ipl-style" &&
                "Group stage followed by playoffs (Qualifier 1, Eliminator, Qualifier 2, Final)"}
            </p>
          </div>

          {/* Auction Option */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-auction"
                checked={useAuction}
                onCheckedChange={(checked) => setUseAuction(checked as boolean)}
              />
              <Label htmlFor="use-auction" className="text-sm font-medium">
                Use Auction System for Player Selection
              </Label>
            </div>
            {useAuction && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p>• Each team will start with ₹100 purse</p>
                <p>• Teams must bid on players to build their squad</p>
                <p>• Teams need 13-15 players (minimum 13, maximum 15)</p>
                <p>• Players will be auctioned one by one</p>
                <p>• Auction ends when all teams reach their player limits</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Teams</CardTitle>
          {useAuction && (
            <p className="text-sm text-muted-foreground">
              In auction mode, pick 2 players per team now: one captain and one
              retained. The rest go to auction.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={currentTeamName}
                onChange={(e) => setCurrentTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-logo">Team Logo (SVG/PNG)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="team-logo"
                  type="file"
                  accept=".svg,.png"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("team-logo")?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-ground">Home Ground</Label>
              <Input
                id="home-ground"
                value={currentTeamHomeGround}
                onChange={(e) => setCurrentTeamHomeGround(e.target.value)}
                placeholder="e.g., Wankhede Stadium"
              />
            </div>
          </div>

          {currentTeamLogoPreview && (
            <div className="flex items-center gap-2">
              <Label>Logo Preview:</Label>
              <img
                src={currentTeamLogoPreview}
                alt="Team logo preview"
                className="w-8 h-8 border rounded"
              />
            </div>
          )}

          {!useAuction ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Select Players (Max 15) - Available: {availablePlayers.length}
                </Label>
                <Input
                  id="search-player"
                  type="text"
                  placeholder="Search players..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-2"
                />
                {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto border rounded-md p-4"> */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto border rounded-md p-4">
                  {/* {filteredPlayers.map((player) => {
                    const hist = histories[player.id]?.stats;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`player-${player.id}`}
                          checked={selectedPlayers.includes(player.id)}
                          onCheckedChange={() => handlePlayerToggle(player.id)}
                          disabled={
                            selectedPlayers.length >= 15 &&
                            !selectedPlayers.includes(player.id)
                          }
                        />
                        <Label
                          htmlFor={`player-${player.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {player.name}
                          {hist && (
                            <span className="ml-1 text-[11px] text-muted-foreground">
                              ({hist.runs}R, {hist.wickets}W)
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })} */}
                  {filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player) => {
                      const hist = histories[player.id]?.stats;
                      return (
                        <div
                          key={player.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`player-${player.id}`}
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={() =>
                              handlePlayerToggle(player.id)
                            }
                            disabled={
                              selectedPlayers.length >= 15 &&
                              !selectedPlayers.includes(player.id)
                            }
                          />
                          <Label
                            htmlFor={`player-${player.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {player.name}
                            {hist && (
                              <span className="ml-1 text-[11px] text-muted-foreground">
                                ({hist.runs}R, {hist.wickets}W)
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center col-span-full">
                      {search
                        ? "No players match your search."
                        : "All players have been selected by teams."}
                    </p>
                  )}
                </div>
                {availablePlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All players have been selected by teams.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Selected Players: {selectedPlayers.length}/15</Label>
                <Button
                  type="button"
                  onClick={handleAddTeam}
                  disabled={
                    !currentTeamName.trim() ||
                    !currentTeamHomeGround.trim() ||
                    selectedPlayers.length === 0
                  }
                  className="w-full"
                >
                  Add Team
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>
                    Select Captain and one Retained Player (2 total)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 max-h-80 overflow-y-auto border rounded-md p-4">
                    {getAvailablePlayers().map((player) => {
                      const hist = histories[player.id]?.stats;
                      const runs = hist?.runs ?? 0;
                      const wickets = hist?.wickets ?? 0;
                      const strikeRate = hist?.strikeRate ?? 0;
                      const economyRate = hist?.economyRate ?? 0;
                      const matches = hist?.matches ?? 0;
                      const derivedRating = Math.max(
                        45,
                        Math.min(
                          95,
                          Math.round(
                            (runs / 5 +
                              (hist?.fours ?? 0) +
                              (hist?.sixes ?? 0) * 2 +
                              strikeRate / 2 +
                              wickets * 10 +
                              (hist?.maidens ?? 0) * 2 +
                              (economyRate > 0 ? 30 / economyRate : 0)) /
                              4
                          )
                        )
                      );
                      const basePrice = Math.max(
                        1,
                        Math.round(derivedRating / 10)
                      );
                      return (
                        <div
                          key={player.id}
                          className="flex flex-col gap-2 p-3 rounded border"
                        >
                          <div className="text-sm font-medium truncate">
                            {player.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {`M ${matches} • ${runs}R, ${wickets}W • SR ${Number(
                              strikeRate
                            ).toFixed(1)} • Eco ${Number(economyRate).toFixed(
                              2
                            )} • Base ₹${basePrice}`}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              variant={
                                captainId === player.id ? "default" : "outline"
                              }
                              onClick={() =>
                                setCaptainId((prev) =>
                                  prev === player.id ? null : player.id
                                )
                              }
                              disabled={
                                captainId !== null && captainId !== player.id
                              }
                            >
                              Captain
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              variant={
                                retainedId === player.id ? "default" : "outline"
                              }
                              onClick={() =>
                                setRetainedId((prev) =>
                                  prev === player.id ? null : player.id
                                )
                              }
                              disabled={
                                retainedId !== null && retainedId !== player.id
                              }
                            >
                              Retain
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Selections</Label>
                  <div className="space-y-1 text-sm">
                    <div>
                      Captain:{" "}
                      {captainId
                        ? DEFAULT_PLAYERS.find((p) => p.id === captainId)?.name
                        : "None"}
                    </div>
                    <div>
                      Retained:{" "}
                      {retainedId
                        ? DEFAULT_PLAYERS.find((p) => p.id === retainedId)?.name
                        : "None"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddTeam}
                    disabled={
                      !currentTeamName.trim() ||
                      !currentTeamHomeGround.trim() ||
                      captainId === null ||
                      retainedId === null
                    }
                    className="w-full"
                  >
                    Add Team
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                After adding all teams, start the auction from the dashboard.
              </p>
            </div>
          )}

          {teams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="border rounded-lg p-4 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => handleRemoveTeam(team.id)}
                  >
                    <X className="h-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-3 mb-3">
                    {team.logo && (
                      <img
                        src={team.logo}
                        alt={`${team.name} logo`}
                        className="w-8 h-8"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Home: {team.homeGround}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Players: {team.players.length}
                      {useAuction && (
                        <span className="text-blue-600"> (Auction Mode)</span>
                      )}
                    </p>
                    {!useAuction ? (
                      <div className="flex flex-wrap gap-1">
                        {team.players.slice(0, 5).map((playerId) => {
                          const player = DEFAULT_PLAYERS.find(
                            (p) => p.id === playerId
                          );
                          return (
                            <Badge
                              key={playerId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {player?.name}
                            </Badge>
                          );
                        })}
                        {team.players.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{team.players.length - 5} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          Captain:{" "}
                          {team.captainId
                            ? DEFAULT_PLAYERS.find(
                                (p) => p.id === team.captainId
                              )?.name
                            : "None"}
                        </div>
                        <div>
                          Retained:{" "}
                          {(team.retainedPlayerIds || [])
                            .map(
                              (id) =>
                                DEFAULT_PLAYERS.find((p) => p.id === id)?.name
                            )
                            .filter(Boolean)
                            .join(", ") || "None"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateTournament}
          disabled={teams.length < 2 || !tournamentName.trim() || isCreating}
        >
          {isCreating ? "Creating..." : "Create Tournament"}
        </Button>
      </div>
    </div>
  );
}
