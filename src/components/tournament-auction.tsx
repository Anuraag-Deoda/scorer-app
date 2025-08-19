"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_PLAYERS } from '@/data/default-players';
import { PlayerRole, BowlingStyle, PlayerStats } from '@/types';

import { Trophy, Users, Coins, Gavel, Target, TrendingUp, Award, Clock, XCircle, CheckCircle, Timer, AlertCircle, Play, Pause, SkipForward } from 'lucide-react';

interface AuctionPlayer {
  id: number;
  name: string;
  rating: number;
  role: PlayerRole;
  bowlingStyle?: BowlingStyle;
  basePrice: number;
  currentBid: number;
  currentBidder: string | null;
  status: 'available' | 'sold' | 'unsold';
  soldTo: string | null;
  soldPrice: number;
  bidCount: number;
  lastBidTime: number;
  relistCount?: number;
  // Add player stats
  batting: {
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    status: 'not out' | 'out' | 'did not bat';
    outDetails?: string;
    strikeRate: number;
  };
  bowling: {
    ballsBowled: number;
    runsConceded: number;
    maidens: number;
    wickets: number;
    economyRate: number;
  };
}

interface AuctionTeam {
  id: number;
  name: string;
  logo?: string;
  purse: number;
  initialPurse: number;
  players: number[];
  maxPlayers: 15; // Changed to 15 as per user request
  minPlayers: 13; // Added minimum players
  // Pre-retentions (excluded from auction pool)
  captainId?: number;
  retainedPlayerIds?: number[];
}

interface TournamentAuctionProps {
  teams: AuctionTeam[];
  onAuctionComplete: (teams: AuctionTeam[]) => void;
  onBack: () => void;
  tournamentPlayerStats?: PlayerStats[]; // Add tournament player stats
}

const BID_TIMEOUT = 15000; // 15 seconds
const MAX_BIDS_BEFORE_TIMEOUT = 3; // Maximum bids before auto-timeout

export default function TournamentAuction({ teams, onAuctionComplete, onBack, tournamentPlayerStats }: TournamentAuctionProps) {
  const { toast } = useToast();
  const [allPlayers, setAllPlayers] = useState<AuctionPlayer[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<AuctionPlayer[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [auctionTeams, setAuctionTeams] = useState<AuctionTeam[]>(teams.map(team => ({ ...team, maxPlayers: 15, minPlayers: 13 })));
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [auctionHistory, setAuctionHistory] = useState<Array<{
    playerName: string;
    teamName: string;
    price: number;
    timestamp: Date;
  }>>([]);
  
  // Auction state
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(BID_TIMEOUT);
  const [bidCount, setBidCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Retention phase (select captain + 1 retained per team) before auction starts
  const teamsNeedingRetention = auctionTeams.filter(t => !t.captainId || !(t.retainedPlayerIds && t.retainedPlayerIds.length > 0));
  const [isRetentionPhase, setIsRetentionPhase] = useState(teamsNeedingRetention.length > 0);
  const [activeRetentionTeamId, setActiveRetentionTeamId] = useState<number | null>(teamsNeedingRetention[0]?.id ?? null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayer = availablePlayers[currentPlayerIndex];
  const isAuctionComplete = currentPlayerIndex >= availablePlayers.length;

  // Check if auction should end due to team limits
  const shouldEndAuction = () => {
    return auctionTeams.every(team => 
      team.players.length >= team.minPlayers && team.players.length <= team.maxPlayers
    );
  };

  // Initialize players with tournament stats or fallback to mock stats
  useEffect(() => {
    // If tournament stats exist, build auction players from them to avoid dummy data
    const buildFromStats = (stats: PlayerStats[]) => {
      const deriveRole = (ps: PlayerStats): PlayerRole => {
        const isBowler = ps.wickets >= 8 || (ps.ballsBowled >= 60 && ps.economyRate > 0);
        const isBatsman = ps.runs >= 200 || ps.ballsFaced >= 120;
        if (isBowler && isBatsman) return PlayerRole.AllRounder;
        if (isBowler) return PlayerRole.Bowler;
        if (isBatsman) return PlayerRole.Batsman;
        return PlayerRole.Batsman;
      };

      const deriveRating = (ps: PlayerStats): number => {
        const bat = ps.runs / 5 + ps.fours + ps.sixes * 2 + (isFinite(ps.strikeRate) ? ps.strikeRate / 2 : 0);
        const bowl = ps.wickets * 10 + ps.maidens * 2 + (ps.economyRate > 0 ? 30 / ps.economyRate : 0);
        const raw = (bat + bowl) / 4;
        return Math.max(45, Math.min(95, Math.round(raw)));
      };

      return stats.map(ps => {
        const rating = deriveRating(ps);
        const role = deriveRole(ps);
        const basePrice = Math.max(1, Math.round(rating / 10));
        return {
          id: ps.playerId,
          name: ps.playerName,
          rating,
          role,
          bowlingStyle: undefined as unknown as BowlingStyle | undefined,
          basePrice,
          currentBid: basePrice,
          currentBidder: null,
          status: 'available' as const,
          soldTo: null,
          soldPrice: 0,
          bidCount: 0,
          lastBidTime: Date.now(),
          relistCount: 0,
          batting: {
            runs: ps.runs || 0,
            ballsFaced: ps.ballsFaced || 0,
            fours: ps.fours || 0,
            sixes: ps.sixes || 0,
            status: 'did not bat' as const,
            strikeRate: ps.strikeRate || 0,
          },
          bowling: {
            ballsBowled: ps.ballsBowled || 0,
            runsConceded: ps.runsConceded || 0,
            maidens: ps.maidens || 0,
            wickets: ps.wickets || 0,
            economyRate: ps.economyRate || 0,
          },
        } as AuctionPlayer;
      });
    };

    let players: AuctionPlayer[] = [];
    if (tournamentPlayerStats && tournamentPlayerStats.length > 0) {
      players = buildFromStats(tournamentPlayerStats);
    } else {
      // Fallback to the existing mock generator using DEFAULT_PLAYERS
      players = DEFAULT_PLAYERS.map(player => {
        const isBatsman = Math.random() > 0.4;
        let playerStats;
        if (isBatsman) {
          const runs = Math.floor(Math.random() * 500) + 100;
          const ballsFaced = Math.floor(runs * (0.8 + Math.random() * 0.4));
          const fours = Math.floor(runs * 0.15);
          const sixes = Math.floor(runs * 0.08);
          const strikeRate = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0;
          playerStats = {
            batting: {
              runs,
              ballsFaced: Math.floor(ballsFaced),
              fours: Math.floor(fours),
              sixes: Math.floor(sixes),
              status: 'did not bat' as const,
              strikeRate: Math.round(strikeRate * 10) / 10,
            },
            bowling: {
              ballsBowled: Math.floor(Math.random() * 60) + 20,
              runsConceded: Math.floor(Math.random() * 100) + 50,
              maidens: Math.floor(Math.random() * 3),
              wickets: Math.floor(Math.random() * 8) + 2,
              economyRate: 0,
            },
          };
        } else {
          const ballsBowled = Math.floor(Math.random() * 120) + 60;
          const wickets = Math.floor(Math.random() * 15) + 5;
          const runsConceded = Math.floor(wickets * 25 + Math.random() * 100);
          const maidens = Math.floor(Math.random() * 5);
          const economyRate = ballsBowled > 0 ? (runsConceded / ballsBowled) * 6 : 0;
          playerStats = {
            batting: {
              runs: Math.floor(Math.random() * 200) + 50,
              ballsFaced: Math.floor(Math.random() * 150) + 50,
              fours: Math.floor(Math.random() * 20) + 5,
              sixes: Math.floor(Math.random() * 10) + 2,
              status: 'did not bat' as const,
              strikeRate: 0,
            },
            bowling: {
              ballsBowled,
              runsConceded,
              maidens,
              wickets,
              economyRate: Math.round(economyRate * 10) / 10,
            },
          };
        }
        if (playerStats.batting.ballsFaced > 0) {
          playerStats.batting.strikeRate = Math.round((playerStats.batting.runs / playerStats.batting.ballsFaced) * 100 * 10) / 10;
        }
        // Derive a rating from generated stats for varied base prices
        const mockBat = playerStats.batting.runs / 5 + playerStats.batting.fours + playerStats.batting.sixes * 2 + (playerStats.batting.strikeRate / 2);
        const mockBowl = playerStats.bowling.wickets * 10 + playerStats.bowling.maidens * 2 + (playerStats.bowling.economyRate > 0 ? 30 / playerStats.bowling.economyRate : 0);
        const rating = Math.max(45, Math.min(90, Math.round((mockBat + mockBowl) / 4)));
        const basePrice = Math.max(1, Math.round(rating / 10));
        return {
          id: player.id,
          name: player.name,
          rating,
          role: PlayerRole.Batsman,
          bowlingStyle: (player as any).bowlingStyle,
          basePrice,
          currentBid: basePrice,
          currentBidder: null,
          status: 'available' as const,
          soldTo: null,
          soldPrice: 0,
          bidCount: 0,
          lastBidTime: Date.now(),
          relistCount: 0,
          ...playerStats,
        } as AuctionPlayer;
      });
    }
    // Keep the master list; filtering applied in separate effect
    setAllPlayers(players);
    // Apply initial filter based on any existing retentions
    const retainedIds = new Set<number>();
    auctionTeams.forEach(t => {
      if (t.captainId) retainedIds.add(t.captainId);
      (t.retainedPlayerIds || []).forEach(id => retainedIds.add(id));
    });
    setAvailablePlayers(players.filter(p => !retainedIds.has(p.id)));
  }, [tournamentPlayerStats]);

  // Re-filter available players whenever retentions change
  useEffect(() => {
    const retainedIds = new Set<number>();
    auctionTeams.forEach(t => {
      if (t.captainId) retainedIds.add(t.captainId);
      (t.retainedPlayerIds || []).forEach(id => retainedIds.add(id));
    });
    setAvailablePlayers(allPlayers.filter(p => !retainedIds.has(p.id)));
  }, [auctionTeams, allPlayers]);

  // Timer logic - Fixed to continue after 3 bids
  useEffect(() => {
    if (isAuctionActive && !isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            // Time's up - sell the player
            handleTimeoutSell();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAuctionActive, isPaused, timeRemaining]);

  // Check if auction should end after each player
  useEffect(() => {
    if (shouldEndAuction() && isAuctionActive) {
      setIsAuctionActive(false);
      toast({ 
        title: "Auction Complete!", 
        description: "All teams have reached their player limits (13-15 players)" 
      });
    }
  }, [auctionTeams, isAuctionActive]);

  const getTeamById = (teamId: number) => auctionTeams.find(team => team.id === teamId);
  const getTeamByName = (teamName: string) => auctionTeams.find(team => team.name === teamName);

  const startAuction = () => {
    setIsAuctionActive(true);
    setTimeRemaining(BID_TIMEOUT);
    setBidCount(0);
    toast({ title: "Auction Started!", description: "The auction is now live!" });
  };

  const pauseAuction = () => {
    setIsPaused(true);
    toast({ title: "Auction Paused", description: "The auction has been paused." });
  };

  const resumeAuction = () => {
    setIsPaused(false);
    toast({ title: "Auction Resumed", description: "The auction continues!" });
  };

  const handleBid = (teamId: number, bidAmount: number) => {
    if (!currentPlayer) return;

    const team = getTeamById(teamId);
    if (!team) return;

    if (bidAmount > team.purse) {
      toast({ variant: "destructive", title: "Insufficient Funds", description: "Team doesn't have enough purse for this bid." });
      return;
    }

    if (bidAmount <= currentPlayer.currentBid) {
      toast({ variant: "destructive", title: "Invalid Bid", description: "Bid must be higher than current bid." });
      return;
    }

    if (team.players.length >= team.maxPlayers) {
      toast({ variant: "destructive", title: "Team Full", description: "This team has reached maximum players." });
      return;
    }

    // Update current bid
    const updatedPlayers = [...availablePlayers];
    updatedPlayers[currentPlayerIndex] = {
      ...updatedPlayers[currentPlayerIndex],
      currentBid: bidAmount,
      currentBidder: team.name,
      bidCount: currentPlayer.bidCount + 1,
      lastBidTime: Date.now(),
    };
    setAvailablePlayers(updatedPlayers);

    // Reset timer for new bid (continue bidding)
    setTimeRemaining(BID_TIMEOUT);
    setBidCount(currentPlayer.bidCount + 1);

    toast({ title: "Bid Placed!", description: `${team.name} bid ₹${bidAmount} for ${currentPlayer.name}` });
  };

  const handleTimeoutSell = () => {
    if (!currentPlayer || !currentPlayer.currentBidder) {
      // No bids - mark as unsold
      handlePass();
      return;
    }

    // Sell to highest bidder
    handleSellPlayer();
  };

  const handleSellPlayer = () => {
    if (!currentPlayer || !currentPlayer.currentBidder) return;

    const team = getTeamByName(currentPlayer.currentBidder);
    if (!team) return;

    // Update team
    const updatedTeams = auctionTeams.map(t => {
      if (t.id === team.id) {
        return {
          ...t,
          purse: t.purse - currentPlayer.currentBid,
          players: [...t.players, currentPlayer.id],
        };
      }
      return t;
    });
    setAuctionTeams(updatedTeams);

    // Update player status
    const updatedPlayers = [...availablePlayers];
    updatedPlayers[currentPlayerIndex] = {
      ...updatedPlayers[currentPlayerIndex],
      status: 'sold',
      soldTo: team.name,
      soldPrice: currentPlayer.currentBid,
    };
    setAvailablePlayers(updatedPlayers);

    // Add to auction history
    setAuctionHistory(prev => [...prev, {
      playerName: currentPlayer.name,
      teamName: team.name,
      price: currentPlayer.currentBid,
      timestamp: new Date(),
    }]);

    toast({ title: "SOLD!", description: `${currentPlayer.name} sold to ${team.name} for ₹${currentPlayer.currentBid}` });

    // Move to next player
    if (currentPlayerIndex < availablePlayers.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setTimeRemaining(BID_TIMEOUT);
      setBidCount(0);
    } else {
      setIsAuctionActive(false);
    }
  };

  const handlePass = () => {
    if (!currentPlayer) return;

    const updatedPlayers = [...availablePlayers];
    const player = updatedPlayers[currentPlayerIndex];
    const relistCount = player.relistCount || 0;

    if (relistCount < 1) {
      const decreasedBase = Math.max(1, Math.max(player.basePrice - 1, Math.floor(player.basePrice * 0.9)));
      const relisted: AuctionPlayer = {
        ...player,
        basePrice: decreasedBase,
        currentBid: decreasedBase,
        currentBidder: null,
        status: 'available',
        bidCount: 0,
        lastBidTime: Date.now(),
        relistCount: relistCount + 1,
      };
      // Remove and push to end
      updatedPlayers.splice(currentPlayerIndex, 1);
      updatedPlayers.push(relisted);
      setAvailablePlayers(updatedPlayers);
      toast({ title: 'Player Unsold', description: `${player.name} will return later at base ₹${decreasedBase}` });
    } else {
      updatedPlayers[currentPlayerIndex] = { ...player, status: 'unsold' };
      setAvailablePlayers(updatedPlayers);
      toast({ title: 'Player Passed', description: `${player.name} was passed by all teams` });
    }

    if (currentPlayerIndex < updatedPlayers.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setTimeRemaining(BID_TIMEOUT);
      setBidCount(0);
    } else {
      setIsAuctionActive(false);
    }
  };

  const handleCompleteAuction = () => {
    onAuctionComplete(auctionTeams);
  };

  const getBidIncrement = () => {
    if (currentPlayer.currentBid < 5) return 1;
    if (currentPlayer.currentBid < 20) return 2;
    if (currentPlayer.currentBid < 50) return 5;
    return 10;
  };

  const quickBid = (teamId: number) => {
    const increment = getBidIncrement();
    const newBid = currentPlayer.currentBid + increment;
    handleBid(teamId, newBid);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // Get unsold players
  const getUnsoldPlayers = () => {
    return availablePlayers.filter(player => player.status === 'unsold');
  };

  // Check if auction should end
  const auctionShouldEnd = shouldEndAuction() || isAuctionComplete;

  if (auctionShouldEnd) {
    const unsoldPlayers = getUnsoldPlayers();
    
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Auction Complete!
            </CardTitle>
            <CardDescription>
              {shouldEndAuction() 
                ? "All teams have reached their player limits (13-15 players)"
                : "All players have been auctioned. Review the results below."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Team Results */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Team Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {auctionTeams.map(team => (
                  <Card key={team.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {team.logo && <img src={team.logo} alt={team.name} className="w-8 h-8 rounded-full" />}
                      <h3 className="font-semibold">{team.name}</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Players:</span>
                        <span className={`font-medium ${
                          team.players.length >= team.minPlayers && team.players.length <= team.maxPlayers 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {team.players.length}/{team.maxPlayers}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Purse Left:</span>
                        <span className="font-medium text-green-600">₹{team.purse}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spent:</span>
                        <span className="font-medium text-red-600">₹{team.initialPurse - team.purse}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-medium ${
                          team.players.length >= team.minPlayers && team.players.length <= team.maxPlayers 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {team.players.length >= team.minPlayers && team.players.length <= team.maxPlayers 
                            ? 'Complete' 
                            : team.players.length < team.minPlayers 
                              ? 'Need More Players' 
                              : 'Too Many Players'
                          }
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Unsold Players */}
            {unsoldPlayers.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Unsold Players</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     {unsoldPlayers.map(player => {
                     const tournamentStats = tournamentPlayerStats?.find(ps => ps.playerId === player.id);
                     
                     return (
                       <Card key={player.id} className="p-4 border-2 border-gray-200">
                         <div className="text-center">
                           <h4 className="font-semibold text-gray-600">{player.name}</h4>
                           <div className="text-sm text-muted-foreground mt-1">
                             <div>Role: {player.role}</div>
                             <div>Rating: {player.rating}</div>
                             <div>Base Price: ₹{player.basePrice}</div>
                             {tournamentStats && (
                               <>
                                 <div className="mt-2 pt-2 border-t border-gray-200">
                                   <div className="text-xs font-medium text-gray-500">Tournament Stats</div>
                                   <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                                     <div>Matches: {tournamentStats.matches}</div>
                                     <div>Runs: {tournamentStats.runs}</div>
                                     <div>Wickets: {tournamentStats.wickets}</div>
                                     <div>SR: {tournamentStats.strikeRate.toFixed(1)}</div>
                                   </div>
                                 </div>
                               </>
                             )}
                           </div>
                         </div>
                       </Card>
                     );
                   })}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button onClick={onBack} variant="outline">Back to Tournament</Button>
              <Button onClick={handleCompleteAuction} className="bg-green-600 hover:bg-green-700">
                Complete Auction & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tournament Auction</h1>
          <p className="text-muted-foreground">Bid on players to build your team</p>
        </div>
        <Button onClick={onBack} variant="outline">Back</Button>
      </div>

      {/* Retention Phase */}
      {!isAuctionActive && isRetentionPhase && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              Retain Players (Pick 1 Captain + 1 Player per Team)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {auctionTeams.map(team => (
              <div key={team.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {team.logo && <img src={team.logo} alt={team.name} className="w-6 h-6 rounded-full" />}
                    <span className="font-medium">{team.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {team.captainId ? 'Captain selected' : 'Pick Captain'} • {(team.retainedPlayerIds?.length ? 'Retained selected' : 'Pick Retained')}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Captain selector */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Captain</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availablePlayers.concat(allPlayers.filter(p => p.id === team.captainId)).filter(Boolean).map(player => {
                        const ps = tournamentPlayerStats?.find(s => s.playerId === player.id);
                        const statsLine = ps ? `M ${ps.matches} • ${ps.runs}R, ${ps.wickets}W • SR ${ps.strikeRate.toFixed(1)} • Eco ${ps.economyRate.toFixed(2)}` : 'No stats';
                        return (
                        <Button key={`cap-${team.id}-${player.id}`} variant={team.captainId === player.id ? 'default' : 'outline'} size="sm" className="justify-start flex flex-col items-start py-2" onClick={() => {
                          setAuctionTeams(prev => prev.map(t => t.id === team.id ? { ...t, captainId: t.captainId === player.id ? undefined : player.id } : t));
                        }}>
                          <span className="text-sm font-medium">{player.name}</span>
                          <span className="text-[11px] text-muted-foreground">{statsLine}</span>
                        </Button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Retained selector */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Retained</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availablePlayers.concat(allPlayers.filter(p => p.id === (team.retainedPlayerIds?.[0]))).filter(Boolean).map(player => {
                        const ps = tournamentPlayerStats?.find(s => s.playerId === player.id);
                        const statsLine = ps ? `M ${ps.matches} • ${ps.runs}R, ${ps.wickets}W • SR ${ps.strikeRate.toFixed(1)} • Eco ${ps.economyRate.toFixed(2)}` : 'No stats';
                        return (
                        <Button key={`ret-${team.id}-${player.id}`} variant={(team.retainedPlayerIds || []).includes(player.id) ? 'default' : 'outline'} size="sm" className="justify-start flex flex-col items-start py-2" onClick={() => {
                          setAuctionTeams(prev => prev.map(t => t.id === team.id ? { ...t, retainedPlayerIds: (t.retainedPlayerIds || [])[0] === player.id ? [] : [player.id] } : t));
                        }}>
                          <span className="text-sm font-medium">{player.name}</span>
                          <span className="text-[11px] text-muted-foreground">{statsLine}</span>
                        </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  // Pre-assign retained players to team rosters and deduct purse at their base prices
                  const updatedTeams = auctionTeams.map(team => {
                    const retainedIds = [
                      ...(team.captainId ? [team.captainId] : []),
                      ...((team.retainedPlayerIds || [])),
                    ];
                    const uniquePlayers = Array.from(new Set([...(team.players || []), ...retainedIds]));
                    const retentionCost = retainedIds.reduce((sum, id) => {
                      const p = allPlayers.find(ap => ap.id === id);
                      return sum + (p?.basePrice || 1);
                    }, 0);
                    return {
                      ...team,
                      players: uniquePlayers,
                      purse: Math.max(0, team.purse - retentionCost),
                    };
                  });
                  setAuctionTeams(updatedTeams);
                  setIsRetentionPhase(false);
                  toast({ title: 'Retentions Applied', description: 'Captains and retained players added to teams. Purse adjusted.' });
                }}
                disabled={!auctionTeams.every(t => t.captainId && (t.retainedPlayerIds || []).length === 1)}
              >
                Continue to Auction
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auction Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-orange-500" />
            Auction Controls
          </CardTitle>
        </CardHeader>
                 <CardContent className="space-y-4">
           <div className="flex gap-4 items-center">
             {!isAuctionActive ? (
               <Button onClick={startAuction} className="bg-green-600 hover:bg-green-700">
                 <Play className="w-4 h-4 mr-2" />
                 Start Auction
               </Button>
             ) : (
               <>
                 {isPaused ? (
                   <Button onClick={resumeAuction} className="bg-blue-600 hover:bg-blue-700">
                     <Play className="w-4 h-4 mr-2" />
                     Resume Auction
                   </Button>
                 ) : (
                   <Button onClick={pauseAuction} variant="outline">
                     <Pause className="w-4 h-4 mr-2" />
                     Pause Auction
                   </Button>
                 )}
                 <Button onClick={handleSellPlayer} disabled={!currentPlayer?.currentBidder} className="bg-orange-600 hover:bg-orange-700">
                   <Gavel className="w-4 h-4 mr-2" />
                   Sell Now
                 </Button>
                 <Button onClick={handlePass} variant="outline">
                   <SkipForward className="w-4 h-4 mr-2" />
                   Pass Player
                 </Button>
               </>
             )}
           </div>
           
                       {/* Auction Rules Info */}
            {isAuctionActive && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>📋 Auction Rules:</strong> Each player has a 15-second timer. The timer resets on every new bid, 
                  allowing unlimited bidding until the timer expires. Teams need 13-15 players. Use "Sell Now" to immediately sell or "Pass" to skip.
                </div>
              </div>
            )}

            {/* Team Status Warnings */}
            {isAuctionActive && (
              <div className="space-y-2">
                {auctionTeams.map(team => {
                  if (team.players.length >= team.maxPlayers) {
                    return (
                      <div key={team.id} className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-700">
                        <div className="text-sm text-red-800 dark:text-red-200">
                          <strong>⚠️ {team.name}:</strong> Team is full ({team.players.length}/{team.maxPlayers} players)
                        </div>
                      </div>
                    );
                  } else if (team.players.length >= team.minPlayers) {
                    return (
                      <div key={team.id} className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-700">
                        <div className="text-sm text-green-800 dark:text-green-200">
                          <strong>✅ {team.name}:</strong> Team is complete ({team.players.length}/{team.maxPlayers} players)
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={team.id} className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-700">
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>⚠️ {team.name}:</strong> Needs {team.minPlayers - team.players.length} more players ({team.players.length}/{team.maxPlayers})
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}

                     {isAuctionActive && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="text-center p-4 bg-muted/50 rounded-lg">
                 <div className="text-2xl font-bold text-blue-600">
                   {formatTime(timeRemaining)}
                 </div>
                 <div className="text-sm text-muted-foreground">Time Remaining (15s)</div>
               </div>
               <div className="text-center p-4 bg-muted/50 rounded-lg">
                 <div className="text-2xl font-bold text-orange-600">
                   {bidCount}
                 </div>
                 <div className="text-sm text-muted-foreground">Total Bids</div>
                 <div className="text-xs text-muted-foreground">Timer resets on each bid</div>
               </div>
               <div className="text-center p-4 bg-muted/50 rounded-lg">
                 <div className="text-2xl font-bold text-green-600">
                   {currentPlayerIndex + 1}/{availablePlayers.length}
                 </div>
                 <div className="text-sm text-muted-foreground">Player Progress</div>
               </div>
             </div>
           )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Player Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-6 h-6 text-orange-500" />
                Current Player
              </CardTitle>
              <CardDescription>
                Player {currentPlayerIndex + 1} of {availablePlayers.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlayer && (
                <>
                  {/* Enhanced Player Card */}
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                          {currentPlayer.name}
                        </h2>
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-sm px-3 py-1">
                            {currentPlayer.role}
                          </Badge>
                          {currentPlayer.bowlingStyle && (
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              {currentPlayer.bowlingStyle}
                            </Badge>
                          )}
                          <Badge variant="default" className="text-sm px-3 py-1">
                            Rating: {currentPlayer.rating}
                          </Badge>
                        </div>
                      </div>
                    </div>

                                         {/* Player Stats */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                       <div className="text-center">
                         <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Base Price</div>
                         <div className="text-2xl font-bold text-green-600">₹{currentPlayer.basePrice}</div>
                       </div>
                                               <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Current Bid</div>
                          <div className="text-3xl font-bold text-purple-600">
                            ₹{currentPlayer.currentBid}
                          </div>
                        </div>
                       <div className="text-center">
                         <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Bids</div>
                         <div className="text-2xl font-bold text-orange-600">{currentPlayer.bidCount}</div>
                         <div className="text-xs text-muted-foreground">Timer resets each bid</div>
                       </div>
                       <div className="text-center">
                         <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">Status</div>
                         <div className="text-lg font-bold text-blue-600">
                           {currentPlayer.currentBidder ? 'Bidding' : 'Available'}
                         </div>
                       </div>
                     </div>

                                           {/* Matches Played */}
                      <div className="text-center mb-4">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Matches Played: {(() => {
                            const tournamentStats = tournamentPlayerStats?.find(ps => ps.playerId === currentPlayer.id);
                            const realMatches = tournamentStats?.matches || 0;
                            
                            if (realMatches > 0) {
                              return realMatches;
                            }
                            
                            // Estimate matches from mock stats
                            const totalBalls = currentPlayer.batting.ballsFaced + currentPlayer.bowling.ballsBowled;
                            if (totalBalls > 0) {
                              const estimatedMatches = Math.max(1, Math.floor(totalBalls / 20)); // ~20 balls per match
                              return `${estimatedMatches} (estimated)`;
                            }
                            
                            return 'No matches yet';
                          })()}
                        </div>
                      </div>

                                           {/* Stats Source Indicator */}
                      <div className="text-center mb-2">
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const tournamentStats = tournamentPlayerStats?.find(ps => ps.playerId === currentPlayer.id);
                            return tournamentStats ? '📊 Tournament Statistics' : '🎲 Estimated Statistics';
                          })()}
                        </div>
                      </div>

                      {/* Detailed Player Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Batting Stats */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                          <h4 className="text-lg font-semibold text-center mb-3 text-blue-600">Batting Statistics</h4>
                         <div className="grid grid-cols-2 gap-3 text-sm">
                           <div className="text-center">
                             <div className="text-xl font-bold text-green-600">{currentPlayer.batting.runs}</div>
                             <div className="text-xs text-muted-foreground">Runs</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-blue-600">{currentPlayer.batting.ballsFaced}</div>
                             <div className="text-xs text-muted-foreground">Balls Faced</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-purple-600">{currentPlayer.batting.fours}</div>
                             <div className="text-xs text-muted-foreground">4s</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-orange-600">{currentPlayer.batting.sixes}</div>
                             <div className="text-xs text-muted-foreground">6s</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-red-600">{currentPlayer.batting.strikeRate.toFixed(1)}</div>
                             <div className="text-xs text-muted-foreground">Strike Rate</div>
                           </div>
                           <div className="text-center col-span-2">
                             <div className="text-sm font-medium text-gray-600">
                               Status: {currentPlayer.batting.status}
                             </div>
                           </div>
                         </div>
                       </div>

                       {/* Bowling Stats */}
                       <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                         <h4 className="text-lg font-semibold text-center mb-3 text-green-600">Bowling Statistics</h4>
                         <div className="grid grid-cols-2 gap-3 text-sm">
                           <div className="text-center">
                             <div className="text-xl font-bold text-green-600">{currentPlayer.bowling.wickets}</div>
                             <div className="text-xs text-muted-foreground">Wickets</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-blue-600">{currentPlayer.bowling.ballsBowled}</div>
                             <div className="text-xs text-muted-foreground">Balls Bowled</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-purple-600">{currentPlayer.bowling.maidens}</div>
                             <div className="text-xs text-muted-foreground">Maidens</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-orange-600">{currentPlayer.bowling.runsConceded}</div>
                             <div className="text-xs text-muted-foreground">Runs Conceded</div>
                           </div>
                           <div className="text-center">
                             <div className="text-xl font-bold text-red-600">{currentPlayer.bowling.economyRate.toFixed(1)}</div>
                             <div className="text-xs text-muted-foreground">Economy Rate</div>
                           </div>
                           <div className="text-center col-span-2">
                             <div className="text-sm font-medium text-gray-600">
                               Overs: {Math.floor(currentPlayer.bowling.ballsBowled / 6)}.{currentPlayer.bowling.ballsBowled % 6}
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>

                    {currentPlayer.currentBidder && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-300 dark:border-yellow-700">
                        <div className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                          Current Bid: {currentPlayer.currentBidder}
                        </div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          Last bid: {new Date(currentPlayer.lastBidTime).toLocaleTimeString()}
                        </div>
                      </div>
                    )}

                    {/* Timer Progress Bar */}
                    {isAuctionActive && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Time Remaining</span>
                          <span>{formatTime(timeRemaining)}</span>
                        </div>
                        <Progress 
                          value={(timeRemaining / BID_TIMEOUT) * 100} 
                          className="h-3"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bidding Interface */}
                  {isAuctionActive && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="bid-amount">Bid Amount</Label>
                        <div className="flex gap-2">
                                                     <Input
                             id="bid-amount"
                             type="number"
                             value={currentBid}
                             onChange={(e) => setCurrentBid(Number(e.target.value))}
                             min={currentPlayer.currentBid + 1}
                             placeholder={`Min bid: ₹${currentPlayer.currentBid + 1}`}
                           />
                          <Button
                            onClick={() => setCurrentBid(currentPlayer.currentBid + getBidIncrement())}
                            variant="outline"
                          >
                            +{getBidIncrement()}
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowBidDialog(true)}
                          className="flex-1"
                          disabled={!currentPlayer.currentBidder}
                        >
                          Place Bid
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Teams Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {auctionTeams.map(team => (
                <div key={team.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {team.logo && <img src={team.logo} alt={team.name} className="w-6 h-6 rounded-full" />}
                      <span className="font-medium">{team.name}</span>
                    </div>
                                         <Badge variant={
                       team.players.length >= team.maxPlayers ? "destructive" : 
                       team.players.length >= team.minPlayers ? "default" : "secondary"
                     }>
                       {team.players.length}/{team.maxPlayers}
                     </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Purse:</span>
                      <span className="font-medium">₹{team.purse}</span>
                    </div>
                                         <Progress 
                       value={(team.players.length / team.maxPlayers) * 100} 
                       className="h-2"
                     />
                     <div className="text-xs text-muted-foreground text-center">
                       {team.players.length < team.minPlayers ? 
                         `Need ${team.minPlayers - team.players.length} more` : 
                         team.players.length >= team.maxPlayers ? 
                           'Team Full' : 
                           'Complete'
                       }
                     </div>
                                         {isAuctionActive && (
                       <div className="flex gap-1">
                         <Button
                           size="sm"
                           onClick={() => quickBid(team.id)}
                           disabled={team.players.length >= team.maxPlayers || team.purse <= (currentPlayer?.currentBid || 0)}
                           className="flex-1 text-xs"
                         >
                           Quick Bid
                         </Button>
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Auction History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auctionHistory.slice(-5).reverse().map((sale, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <div>
                      <div className="font-medium">{sale.playerName}</div>
                      <div className="text-muted-foreground">{sale.teamName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">₹{sale.price}</div>
                      <div className="text-xs text-muted-foreground">
                        {sale.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {auctionHistory.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No sales yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bid Dialog */}
      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Bid</DialogTitle>
            <DialogDescription>
              Select a team to place the bid for ₹{currentBid}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {auctionTeams
              .filter(team => team.players.length < team.maxPlayers && team.purse >= currentBid)
              .map(team => (
                <Button
                  key={team.id}
                  onClick={() => {
                    handleBid(team.id, currentBid);
                    setShowBidDialog(false);
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <div className="flex items-center gap-3">
                    {team.logo && <img src={team.logo} alt={team.name} className="w-8 h-8 rounded-full" />}
                    <div className="text-left">
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Purse: ₹{team.purse} • Players: {team.players.length}/{team.maxPlayers}
                        {team.players.length < team.minPlayers && (
                          <span className="text-orange-600 font-medium"> • Needs {team.minPlayers - team.players.length} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBidDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
