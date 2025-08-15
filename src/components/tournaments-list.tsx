"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Users, Calendar, Play, CheckCircle } from 'lucide-react';
import type { Tournament } from '@/types';
import PlayerRecordsDialog from './player-records-dialog';

interface TournamentsListProps {
  tournaments: Tournament[];
  onCreateTournament: () => void;
  onViewTournament: (tournament: Tournament) => void;
}

export default function TournamentsList({ tournaments, onCreateTournament, onViewTournament }: TournamentsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'draft':
        return <Trophy className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getCompletedMatchesCount = (tournament: Tournament) => {
    return tournament.matches.filter(match => match.status === 'finished').length;
  };

  const getTotalMatchesCount = (tournament: Tournament) => {
    return tournament.matches.length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground">Manage and participate in cricket tournaments</p>
        </div>
        <div className="flex items-center gap-2">
          <PlayerRecordsDialog />
          <Button onClick={onCreateTournament} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Tournament
          </Button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Tournaments Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first tournament to get started with team competitions
            </p>
            <Button onClick={onCreateTournament}>
              Create Your First Tournament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(tournament => (
            <Card 
              key={tournament.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onViewTournament(tournament)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{tournament.name}</CardTitle>
                    {tournament.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {tournament.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStatusColor(tournament.status)}>
                    {getStatusIcon(tournament.status)}
                    <span className="ml-1 capitalize">{tournament.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{tournament.teams.length} Teams</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{tournament.settings.matchType}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {getCompletedMatchesCount(tournament)}/{getTotalMatchesCount(tournament)} matches
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(getCompletedMatchesCount(tournament) / getTotalMatchesCount(tournament)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <Button variant="outline" className="w-full" size="sm">
                    View Tournament
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

