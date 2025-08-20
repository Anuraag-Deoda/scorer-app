"use client";

import { useState, useEffect } from 'react';
import type { Match, MatchSettings, Player, Tournament, Team } from '@/types';
import { createMatch } from '@/lib/cricket-logic';
import NewMatchForm from '@/components/new-match-form';
import ScoringInterface from '@/components/scoring-interface';
import TournamentCreationForm from '@/components/tournament-creation-form';
import TournamentDashboard from '@/components/tournament-dashboard';
import TournamentsList from '@/components/tournaments-list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CricketBallIcon } from '@/components/icons';
import { useToast } from "@/hooks/use-toast"
import PlayerRatingsDialog from '@/components/player-ratings-dialog';

const LOCAL_STORAGE_KEY = 'cricket-clash-scorer-match';

console.log = () => {}
export default function Home() {
  const [match, setMatch] = useState<Match | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState('matches');
  const [isClient, setIsClient] = useState(false);
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false);
  const { toast } = useToast();

console.log = () => {}
  useEffect(() => {
    setIsClient(true);
    // Fetch players from the API on load
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players || []);
      })
      .catch(() => {
        setPlayers([]);
      });

    try {
      const savedMatch = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedMatch) {
        setMatch(JSON.parse(savedMatch));
      }
    } catch (error) {
      console.error("Failed to load data from local storage", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load saved data.",
      })
    }

    // Fetch tournaments from database
    fetchTournaments();
  }, [toast]);

  useEffect(() => {
    if (match) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(match));
      } catch (error) {
        console.error("Failed to save match to local storage", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save match progress.",
        })
      }
    }
  }, [match, toast]);

  const fetchTournaments = async () => {
    setIsLoadingTournaments(true);
    try {
      const response = await fetch('/api/tournaments');
      if (response.ok) {
        const data = await response.json();
        setTournaments(data.tournaments || []);
      } else {
        console.error('Failed to fetch tournaments');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load tournaments from database.",
        });
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load tournaments from database.",
      });
    } finally {
      setIsLoadingTournaments(false);
    }
  };

  const handleNewMatch = (settings: MatchSettings) => {
    const team1Players = players.slice(0, 11);
    const team2Players = players.slice(11, 22);

    const team1: Team = {
      id: 1,
      name: settings.teamNames[0],
      players: team1Players,
      impactPlayerUsed: false,
    };
    const team2: Team = {
      id: 2,
      name: settings.teamNames[1],
      players: team2Players,
      impactPlayerUsed: false,
    };

    const newMatch = createMatch([team1, team2], settings);
    setMatch(newMatch);
    setActiveTab('matches');
  };
  
  const handleEndMatch = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setMatch(null);
    toast({
      title: "Match Ended",
      description: "The match data has been cleared.",
    })
  }

  const handleCreateTournament = (tournament: Tournament) => {
    setTournaments([...tournaments, tournament]);
    setCurrentTournament(tournament);
    setActiveTab('tournaments');
    toast({
      title: "Tournament Created",
      description: `${tournament.name} has been created successfully!`,
    });
  };

  const handleTournamentUpdate = async (updatedTournament: Tournament) => {
    try {
      // Update tournament in database
      const response = await fetch(`/api/tournaments/${updatedTournament.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matches: updatedTournament.matches,
          teams: updatedTournament.teams,
          status: updatedTournament.status,
          awards: updatedTournament.awards,
        }),
      });

      if (!response.ok) {
        // throw new Error('Failed to update tournament');
      }

      // Update local state
      setTournaments(tournaments.map(t => 
        t.id === updatedTournament.id ? updatedTournament : t
      ));
      setCurrentTournament(updatedTournament);

      // toast({
      //   title: "Success",
      //   description: "Tournament updated successfully!",
      // });
    } catch (error) {
      console.error('Error updating tournament:', error);
      // toast({
      //   variant: "destructive",
      //   title: "Error",
      //   description: "Failed to update tournament. Please try again.",
      // });
    }
  };

  const handleBackToTournaments = () => {
    setCurrentTournament(null);
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tournament');
      }

      // Remove tournament from tournaments list
      const updatedTournaments = tournaments.filter(t => t.id !== tournamentId);
      setTournaments(updatedTournaments);
      
      // If the deleted tournament was the current one, go back to tournaments list
      if (currentTournament?.id === tournamentId) {
        setCurrentTournament(null);
      }
      
      toast({
        title: "Tournament Deleted",
        description: "Tournament and all associated data has been removed.",
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete tournament. Please try again.",
      });
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <CricketBallIcon className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (currentTournament) {
    return (
      <main className="container mx-auto p-2 sm:p-4">
        <TournamentDashboard 
          tournament={currentTournament}
          onTournamentUpdate={handleTournamentUpdate}
          onBackToTournaments={handleBackToTournaments}
        />
      </main>
    );
  }

  return (
    <main className="container mx-auto p-2 sm:p-4">
      <header className="text-center my-4 md:my-6">
        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-primary flex items-center justify-center gap-3">
          <CricketBallIcon className="w-8 h-8 sm:w-10 sm:h-10" />
          Cricket Clash Scorer
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">The ultimate tool for tracking your cricket matches and tournaments.</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
          <TabsTrigger value="matches">Normal Matches</TabsTrigger>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4">
          {match ? (
            <ScoringInterface match={match} setMatch={setMatch} endMatch={handleEndMatch} />
          ) : (
            <>
              <Card className="max-w-2xl mx-auto shadow-lg bg-card/50 border-primary/20">
                <CardContent className="p-4 sm:p-6">
                  <NewMatchForm onNewMatch={handleNewMatch} />
                </CardContent>
              </Card>
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setIsRatingsOpen(true)}>View Player Ratings</Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-4">
          <TournamentsList
            tournaments={tournaments}
            onCreateTournament={() => setActiveTab('create-tournament')}
            onViewTournament={setCurrentTournament}
            onDeleteTournament={handleDeleteTournament}
            isLoading={isLoadingTournaments}
            onRefresh={fetchTournaments}
          />
        </TabsContent>

        <TabsContent value="create-tournament" className="space-y-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Create New Tournament</h2>
              <Button variant="outline" onClick={() => setActiveTab('tournaments')}>
                ← Back to Tournaments
              </Button>
            </div>
            <TournamentCreationForm 
              onTournamentCreated={handleCreateTournament}
              onCancel={() => setActiveTab('tournaments')}
            />
          </div>
        </TabsContent>
      </Tabs>

      <footer className="text-center mt-8 sm:mt-12 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Cricket Clash Scorer. All rights reserved.</p>
      </footer>
      
      <PlayerRatingsDialog
        isOpen={isRatingsOpen}
        onOpenChange={setIsRatingsOpen}
        players={players}
      />
    </main>
  );
}
