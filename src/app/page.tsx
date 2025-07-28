"use client";

import { useState, useEffect } from 'react';
import type { Match, MatchSettings, Player } from '@/types';
import { createMatch } from '@/lib/cricket-logic';
import NewMatchForm from '@/components/new-match-form';
import ScoringInterface from '@/components/scoring-interface';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CricketBallIcon } from '@/components/icons';
import { useToast } from "@/hooks/use-toast"
import PlayerRatingsDialog from '@/components/player-ratings-dialog';
const LOCAL_STORAGE_KEY = 'cricket-clash-scorer-match';

export default function Home() {
  const [match, setMatch] = useState<Match | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const { toast } = useToast();

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
      console.error("Failed to load match from local storage", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load saved match data.",
      })
    }
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

  const handleNewMatch = (settings: MatchSettings) => {
    const newMatch = createMatch(settings, players);
    setMatch(newMatch);
  };
  
  const handleEndMatch = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setMatch(null);
    toast({
      title: "Match Ended",
      description: "The match data has been cleared.",
    })
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <CricketBallIcon className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto p-2 sm:p-4">
      {!match && (
        <header className="text-center my-4 md:my-6">
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-primary flex items-center justify-center gap-3">
            <CricketBallIcon className="w-8 h-8 sm:w-10 sm:h-10" />
            Cricket Clash Scorer
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">The ultimate tool for tracking your cricket matches.</p>
        </header>
      )}

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
