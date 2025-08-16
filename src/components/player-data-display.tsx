"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Zap, TrendingUp, Users, Award } from 'lucide-react';
import { PlayerStats } from '@/types';

interface PlayerDataDisplayProps {
  onClose: () => void;
  players: PlayerStats[];
}

export default function PlayerDataDisplay({ onClose, players }: PlayerDataDisplayProps) {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'runs' | 'wickets' | 'matches' | 'strikeRate'>('runs');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCard = (playerId: number) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(playerId)) {
      newFlipped.delete(playerId);
    } else {
      newFlipped.add(playerId);
    }
    setFlippedCards(newFlipped);
  };

  const getSortedPlayers = () => {
    if (!players || players.length === 0) return [];
    const filtered = players.filter(p => 
      p.playerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'runs': return b.runs - a.runs;
        case 'wickets': return b.wickets - a.wickets;
        case 'matches': return b.matches - a.matches;
        case 'strikeRate': return b.strikeRate - a.strikeRate;
        default: return 0;
      }
    });
  };

  const sortedPlayers = getSortedPlayers();

  const getTopPerformers = () => {
    if (!players || players.length === 0) return { topRuns: [], topWickets: [], topStrikeRate: [] };
    const topRuns = [...players].sort((a, b) => b.runs - a.runs).slice(0, 3);
    const topWickets = [...players].sort((a, b) => b.wickets - a.wickets).slice(0, 3);
    const topStrikeRate = [...players].filter(p => p.ballsFaced >= 20).sort((a, b) => b.strikeRate - a.strikeRate).slice(0, 3);
    
    return { topRuns, topWickets, topStrikeRate };
  };

  const { topRuns, topWickets, topStrikeRate } = getTopPerformers();

  // Check if we have any data
  const hasData = players && players.length > 0 && players.some(p => p.matches > 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Player Statistics & Records
              </h2>
              <p className="text-muted-foreground mt-1">
                {hasData ? `View detailed player performance data for ${players?.length || 0} players` : 'No player data available yet'}
              </p>
            </div>
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!hasData ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Player Data Available</h3>
              <p className="text-muted-foreground">Player statistics will appear here once matches are completed.</p>
            </div>
          ) : (
            <>
              {/* Top Performers Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                      <Trophy className="w-5 h-5" />
                      Top Batsmen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topRuns.length > 0 ? (
                      topRuns.map((player, index) => (
                        <div key={player.playerId} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{index + 1}. {player.playerName}</span>
                          <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                            {player.runs} runs
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No batting data yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                      <Target className="w-5 h-5" />
                      Top Bowlers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topWickets.length > 0 ? (
                      topWickets.map((player, index) => (
                        <div key={player.playerId} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{index + 1}. {player.playerName}</span>
                          <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                            {player.wickets} wkts
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No bowling data yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                      <Zap className="w-5 h-5" />
                      Best Strike Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topStrikeRate.length > 0 ? (
                      topStrikeRate.map((player, index) => (
                        <div key={player.playerId} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{index + 1}. {player.playerName}</span>
                          <Badge variant="secondary" className="bg-green-200 text-green-800">
                            {player.strikeRate.toFixed(1)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No strike rate data yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Search and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === 'runs' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('runs')}
                  >
                    Sort by Runs
                  </Button>
                  <Button
                    variant={sortBy === 'wickets' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('wickets')}
                  >
                    Sort by Wickets
                  </Button>
                  <Button
                    variant={sortBy === 'matches' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('matches')}
                  >
                    Sort by Matches
                  </Button>
                </div>
              </div>

              {/* Player Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedPlayers.map((player) => (
                  <div
                    key={player.playerId}
                    className="relative h-64 cursor-pointer perspective-1000"
                    onClick={() => toggleCard(player.playerId)}
                  >
                    <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                      flippedCards.has(player.playerId) ? 'rotate-y-180' : ''
                    }`}>
                      {/* Front of card */}
                      <Card className="absolute w-full h-full backface-hidden">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-center">{player.playerName}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                          <div className="flex items-center justify-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="w-8 h-8 text-primary" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Matches:</span>
                              <span className="font-semibold">{player.matches}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Runs:</span>
                              <span className="font-semibold text-green-600">{player.runs}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Wickets:</span>
                              <span className="font-semibold text-blue-600">{player.wickets}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Click to see more details
                          </div>
                        </CardContent>
                      </Card>

                      {/* Back of card */}
                      <Card className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-slate-50 to-slate-100">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-center">Detailed Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white p-2 rounded">
                              <div className="font-semibold text-blue-600">{player.ballsFaced}</div>
                              <div className="text-xs text-muted-foreground">Balls Faced</div>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <div className="font-semibold text-green-600">{player.fours}</div>
                              <div className="text-xs text-muted-foreground">4s</div>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <div className="font-semibold text-purple-600">{player.sixes}</div>
                              <div className="text-xs text-muted-foreground">6s</div>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <div className="font-semibold text-orange-600">{player.ballsBowled}</div>
                              <div className="text-xs text-muted-foreground">Balls Bowled</div>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Strike Rate:</span>
                              <span className="font-semibold">{player.strikeRate.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Economy:</span>
                              <span className="font-semibold">{player.economyRate.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Maidens:</span>
                              <span className="font-semibold">{player.maidens}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Click to flip back
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>

              {sortedPlayers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players found matching your search.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
