"use client";

import { useState } from 'react';
import type { Match, Player, Team, Innings, MatchSituation } from '@/types';
import { getMatchSituation, getPowerplayOvers } from '@/lib/cricket-logic';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import InningsSummary from './innings-summary';
import ManhattanChart from './manhattan-chart';
import PartnershipAnalysis from './partnership-analysis';
import WinProbability from './win-probability';
import PhaseAnalysis from './phase-analysis';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/components/ui/theme-provider';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ScoreboardIcon,
  SummaryIcon,
  TimelineIcon,
  RunRateIcon,
  WormIcon,
  FowIcon,
  PartnershipsIcon,
  ManhattanIcon,
  PhasesIcon,
  WinProbIcon,
} from './scoreboard-icons';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function ScoreboardContent({ match, setMatch, onBowlerChange, isSimulating }: { match: Match, setMatch: (match: Match) => void, onBowlerChange: (bowlerId: number) => void, isSimulating?: boolean }) {
  const innings1 = match.innings[0];
  const innings2 = match.innings.length > 1 ? match.innings[1] : null;

  const currentInnings = match.innings[match.currentInnings - 1];
  const matchSituation = getMatchSituation(match);
  const isFreeHit = currentInnings.isFreeHit;
  const powerplayOvers = getPowerplayOvers(match.matchType);
  const isPowerplay = currentInnings.overs < powerplayOvers;
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  
  const BattingCard = ({ innings }: { innings: Innings }) => {
      const playingXI = innings.battingTeam.players.filter((p: Player) => !p.isSubstitute || p.isImpactPlayer);
      const didNotBat = innings.battingTeam.players.filter((p:Player) => p.batting.status === 'did not bat' && !p.isSubstitute);
      
      // Calculate team totals and extras
      const totalRuns = innings.score;
      const totalWickets = innings.wickets;
      const totalExtras = innings.timeline.reduce((sum, ball) => {
        if (['wd', 'nb', 'lb', 'b'].includes(ball.event)) {
          return sum + (ball.extras || 0);
        }
        return sum;
      }, 0);
      
      return (
        <div className="bg-card/50 rounded-md p-2 sm:p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
              <h4 className="text-base font-semibold">Batting</h4>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">{totalRuns}/{totalWickets}</span>
                </div>
                {totalExtras > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Extras:</span>
                    <span className="font-semibold">{totalExtras}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="border-b-muted/50">
                        <TableHead className="w-[35%] font-semibold text-xs sm:text-sm px-2 sm:px-4">Batter</TableHead>
                        <TableHead className="text-left text-xs sm:text-sm px-2 sm:px-4">Status</TableHead>
                        <TableHead className="text-right font-semibold text-xs sm:text-sm px-2 sm:px-4">R</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm px-2 sm:px-4">B</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm px-2 sm:px-4">4s</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm px-2 sm:px-4">6s</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm px-2 sm:px-4">SR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playingXI.filter(p => p.batting.status !== 'did not bat').map((player: Player) => {
                        const isNotOut = player.batting.status === 'not out';
                        const isOnStrike = player.id === currentInnings.batsmanOnStrike && isNotOut;

                        return (
                        <TableRow key={player.id} className={`border-0 text-xs sm:text-sm ${isNotOut ? 'bg-primary/5' : ''}`}>
                          <TableCell className="font-medium py-1 px-2 sm:px-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                              <span className="truncate">{player.name}</span>
                              {isOnStrike && <span className="text-primary font-bold">*</span>}
                              {player.isImpactPlayer && <Badge variant="outline" className="text-xs px-1 py-0.5 font-normal">IP</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate py-1 px-2 sm:px-4">
                              {player.batting.status === 'out' ? player.batting.outDetails : player.batting.status}
                          </TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4 font-medium">{player.batting.runs}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{player.batting.ballsFaced}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{player.batting.fours}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{player.batting.sixes}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{player.batting.strikeRate.toFixed(1)}</TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            {didNotBat.length > 0 && (
                <div className="p-2 sm:p-3 text-xs bg-muted/30 rounded-b-md mt-2">
                    <p className="font-semibold mb-1">Yet to bat:</p>
                    <p className="text-muted-foreground leading-tight">{didNotBat.map(p => p.name).join(', ')}</p>
                </div>
            )}
        </div>
      );
  }

  const BowlingCard = ({ innings }: { innings: Innings }) => {
    const bowlers = innings.bowlingTeam.players.filter((p: Player) => (!p.isSubstitute || p.isImpactPlayer) && p.bowling.ballsBowled > 0);

    return (
        <div className="bg-card/50 rounded-md p-2 sm:p-3">
            <h4 className="text-base font-semibold mb-2">Bowling</h4>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="border-b-muted/50">
                        <TableHead className="w-[40%] font-semibold text-xs sm:text-sm px-2 sm:px-4">Bowler</TableHead>
                        <TableHead className="text-right font-semibold text-xs sm:text-sm px-2 sm:px-4">O</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm px-2 sm:px-4">M</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm px-2 sm:px-4">R</TableHead>
                        <TableHead className="text-right font-semibold text-xs sm:text-sm px-2 sm:px-4">W</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm px-2 sm:px-4">Econ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bowlers.map((player: Player) => (
                        <TableRow key={player.id} className="border-0 text-xs sm:text-sm">
                          <TableCell className="font-medium py-1 px-2 sm:px-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                              <span className="truncate">{player.name}</span>
                              {player.isImpactPlayer && <Badge variant="outline" className="text-xs px-1 py-0.5 font-normal">IP</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{Math.floor(player.bowling.ballsBowled / 6)}.{player.bowling.ballsBowled % 6}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{player.bowling.maidens}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{player.bowling.runsConceded}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4 font-medium">{player.bowling.wickets}</TableCell>
                          <TableCell className="text-right py-1 px-2 sm:px-4">{player.bowling.economyRate.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
        </div>
      );
  }
  
  const FallOfWickets = ({ innings }: { innings: Innings }) => (
    <div className="bg-card/50 rounded-md p-2 sm:p-3 space-y-2">
         <h4 className="text-base font-semibold mb-1">Fall of Wickets</h4>
        {innings.fallOfWickets.map((fow: any, index: number) => (
            <p key={index} className="text-xs sm:text-sm text-muted-foreground leading-tight">
                <span className="font-medium text-foreground">{fow.score}-{fow.wicket}</span> ({fow.playerOut}, {fow.over.toFixed(1)} ov)
            </p>
        ))}
    </div>
  );
  
  const Timeline = ({ innings }: { innings: Innings }) => {
    const overs = [];
    let currentOver: any[] = [];
    let ballsInOver = 0;
    
    // Group balls by over
    const ballsByOver: { [key: number]: any[] } = {};
    innings.timeline.forEach(ball => {
        const overNum = Math.floor(ball.over ?? 0);
        if (!ballsByOver[overNum]) {
            ballsByOver[overNum] = [];
        }
        ballsByOver[overNum].push(ball);
    });

    const sortedOvers = Object.keys(ballsByOver).map(Number).sort((a, b) => b - a);

    return (
        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 bg-muted/40">
            {sortedOvers.map(overNum => (
                <div key={overNum} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-card rounded-md p-2 sm:p-3">
                    <p className="text-sm text-muted-foreground w-12 font-semibold text-center sm:text-left">Ov {overNum + 1}</p>
                    <Separator orientation="horizontal" className="sm:hidden"/>
                    <Separator orientation="vertical" className="hidden sm:block h-6"/>
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 justify-center sm:justify-start">
                        {ballsByOver[overNum].map((ball, ballIndex) => (
                             <span key={ballIndex} 
                                className={`flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full font-bold text-xs border
                                ${ball.event === 'w' ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-transparent'}
                                ${['wd', 'nb', 'lb', 'b'].includes(ball.event) ? 'bg-yellow-500 text-yellow-950 border-yellow-500' : ''} /* Changed extra colors */
                                ${ball.runs === 4 ? 'bg-blue-600 text-white border-blue-600' : ''} /* Changed 4 color */
                                ${ball.runs === 6 ? 'bg-green-600 text-white border-green-600' : ''} /* Changed 6 color */
                                ${ball.event === 'run' && ball.runs > 0 && ball.runs < 4 ? 'bg-primary/20 border-primary/20' : ''} /* Added border to runs */
                                ${ball.event === 'run' && ball.runs === 0 ? 'bg-muted/50 border-muted/50' : ''} /* Added border to dots */
                            `}>
                                {ball.display}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
  };

  const BowlerSelection = () => {
    const availableBowlers = currentInnings.bowlingTeam.players.filter(p => (!p.isSubstitute || p.isImpactPlayer));

    return (
        <div className="p-6 space-y-4 text-center bg-muted/40 rounded-b-lg">
            <h4 className="font-semibold text-lg">Select Next Bowler</h4>
            <p className="text-muted-foreground text-sm">Choose the player to bowl the next over.</p>
            <Select onValueChange={(val) => onBowlerChange(parseInt(val, 10))}>
                <SelectTrigger id="bowler-select" className="w-[75%] mx-auto">
                    <SelectValue placeholder="Select new bowler" />
                </SelectTrigger>
                <SelectContent>
                    {availableBowlers.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
  }

  const RunRateChart = () => {
    const getOverByOverScores = (innings: Innings) => {
        const overScores: {over: number, score: number, runRate: number}[] = [];
        if (!innings) return overScores;
        
        let score = 0;
        let balls = 0;
        const maxOvers = Math.max(innings.overs, 1);

        for (let i = 0; i < maxOvers; i++) {
            const ballsInThisOver = innings.timeline.filter(b => Math.floor(b.over ?? 0) === i);
            const runsInThisOver = ballsInThisOver.reduce((acc, ball) => acc + ball.runs + ball.extras, 0);
            score += runsInThisOver;
            const legalBallsThisOver = ballsInThisOver.filter(b => b.event !== 'wd' && b.event !== 'nb').length;
            balls += legalBallsThisOver;
            
            if(legalBallsThisOver > 0 || i === 0){
              const currentOversValue = i + 1;
              const runRate = score / currentOversValue;

              overScores.push({
                  over: currentOversValue,
                  score: score,
                  runRate: isNaN(runRate) ? 0 : runRate
              });
            }
        }
        return overScores;
    };

    const innings1Scores = getOverByOverScores(innings1);
    const innings2Scores = innings2 ? getOverByOverScores(innings2) : [];

    const chartData = Array.from({length: Math.max(innings1Scores.length, innings2Scores.length)}, (_, i) => ({
        over: i + 1,
        [innings1.battingTeam.name]: innings1Scores[i]?.runRate,
        [innings2 ? innings2.battingTeam.name : '']: innings2Scores[i]?.runRate,
    }));
    
    const chartConfig = {
        [innings1.battingTeam.name]: {
            label: innings1.battingTeam.name,
            color: "hsl(var(--chart-1))",
        },
        ...(innings2 ? {
            [innings2.battingTeam.name]: {
                label: innings2.battingTeam.name,
                color: "hsl(var(--chart-2))",
            }
        } : {})
    };

    return (
        <div className="p-4 h-80 bg-card/50 rounded-md">
            <ChartContainer config={chartConfig} className="w-full h-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="over" tickLine={false} axisLine={false} tickMargin={8} label={{ value: 'Overs', position: 'insideBottom', offset: -10 }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} label={{ value: 'Run Rate', angle: -90, position: 'insideLeft' }} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Legend align="right" verticalAlign="top" iconType="circle" />
                    <defs>
                        <linearGradient id="fillTeam1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                        {innings2 && <linearGradient id="fillTeam2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                        </linearGradient>}
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey={innings1.battingTeam.name} 
                      stroke={`hsl(var(--primary))`} 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#fillTeam1)" 
                      dot={false} 
                      activeDot={{ r: 6, className: "animate-pulse" }}
                    />
                    {innings2 && 
                      <Area 
                        type="monotone" 
                        dataKey={innings2.battingTeam.name} 
                        stroke={`hsl(var(--chart-2))`} 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#fillTeam2)" 
                        dot={false} 
                        activeDot={{ r: 6, className: "animate-pulse" }}
                      />}
                </AreaChart>
            </ChartContainer>
        </div>
    );
  };

  const WormGraph = () => {
    const getOverByOverData = (innings: Innings) => {
        const overData: {over: number, score: number, wickets: number}[] = [];
        if (!innings) return overData;
        
        let score = 0;
        let wickets = 0;
        const maxOvers = Math.max(innings.overs, 1);

        for (let i = 0; i < maxOvers; i++) {
            const ballsInThisOver = innings.timeline.filter(b => Math.floor(b.over ?? 0) === i);
            const runsInThisOver = ballsInThisOver.reduce((acc, ball) => acc + ball.runs + ball.extras, 0);
            const wicketsInThisOver = ballsInThisOver.filter(b => b.isWicket).length;
            
            score += runsInThisOver;
            wickets += wicketsInThisOver;
            
            const legalBallsThisOver = ballsInThisOver.filter(b => b.event !== 'wd' && b.event !== 'nb').length;
            
            if(legalBallsThisOver > 0 || i === 0){
              overData.push({
                  over: i + 1,
                  score: score,
                  wickets: wickets,
              });
            }
        }
        return overData;
    };

    const innings1Data = getOverByOverData(innings1);
    const innings2Data = innings2 ? getOverByOverData(innings2) : [];

    const chartData = Array.from({length: Math.max(innings1Data.length, innings2Data.length)}, (_, i) => {
        const data1 = innings1Data[i];
        const data2 = innings2Data[i];
        return {
            over: i + 1,
            [`${innings1.battingTeam.name}_score`]: data1?.score,
            [`${innings2 ? innings2.battingTeam.name : ''}_score`]: data2?.score,
            [`${innings1.battingTeam.name}_wickets`]: innings1.timeline.filter(b => b.isWicket && Math.floor(b.over ?? 0) === i),
            [`${innings2 ? innings2.battingTeam.name : ''}_wickets`]: innings2 ? innings2.timeline.filter(b => b.isWicket && Math.floor(b.over ?? 0) === i) : [],
        }
    });
    
    const chartConfig = {
        [innings1.battingTeam.name]: {
            label: innings1.battingTeam.name,
            color: "hsl(var(--chart-1))",
        },
        ...(innings2 ? {
            [innings2.battingTeam.name]: {
                label: innings2.battingTeam.name,
                color: "hsl(var(--chart-2))",
            }
        } : {})
    };

    const CustomDot = (props: any) => {
      const { cx, cy, payload, dataKey } = props;
      const teamName = dataKey.split('_')[0];
      const wickets = payload[`${teamName}_wickets`];

      if (wickets && wickets.length > 0) {
        return (
          <g>
            {wickets.map((wicket: any, index: number) => (
              <circle key={index} cx={cx} cy={cy} r={5} fill="red" stroke="white" strokeWidth={1} />
            ))}
          </g>
        );
      }

      return null;
    };

    return (
        <div className="p-4 h-80 bg-card/50 rounded-md">
            <ChartContainer config={chartConfig} className="w-full h-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="over" tickLine={false} axisLine={false} tickMargin={8} label={{ value: 'Overs', position: 'insideBottom', offset: -10 }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Legend align="right" verticalAlign="top" iconType="circle" />
                    <defs>
                        <linearGradient id="fillWormTeam1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                        {innings2 && <linearGradient id="fillWormTeam2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                        </linearGradient>}
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey={`${innings1.battingTeam.name}_score`} 
                      stroke={`hsl(var(--primary))`} 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#fillWormTeam1)" 
                      dot={<CustomDot />} 
                      activeDot={{ r: 6, className: "animate-pulse" }}
                    />
                    {innings2 && 
                      <Area 
                        type="monotone" 
                        dataKey={`${innings2.battingTeam.name}_score`} 
                        stroke={`hsl(var(--chart-2))`} 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#fillWormTeam2)" 
                        dot={<CustomDot />} 
                        activeDot={{ r: 6, className: "animate-pulse" }}
                      />}
                </AreaChart>
            </ChartContainer>
        </div>
    );
  };


  const showBowlerSelection = currentInnings.currentBowler === -1 && match.status === 'inprogress' && currentInnings.overs < match.oversPerInnings;

  return (
    <Card className="shadow-none border-0 w-full max-w-full">
        <div className="absolute top-2 right-2 z-10">
          <ThemeToggle />
        </div>
        <CardContent className="p-0 bg-muted/40 rounded-lg w-full max-w-full overflow-hidden">
            {isFreeHit && (
              <div className="p-2 text-center bg-destructive text-white font-bold text-sm">
                <p>FREE HIT</p>
              </div>
            )}
            {matchSituation.isChasing && (
              <div className="p-2 sm:p-3 text-center bg-primary/10">
                <p className="font-semibold text-base sm:text-lg">
                  {matchSituation.battingTeamName} need {matchSituation.runsNeeded} runs in {matchSituation.ballsRemaining} balls to win.
                </p>
              </div>
            )}
            {showBowlerSelection && !isSimulating ? (
                <BowlerSelection />
            ) : (
                <Tabs defaultValue="scoreboard" className="w-full max-w-full">
                    <TabsList className="grid w-full grid-cols-5 sm:grid-cols-10 rounded-b-none h-auto bg-card border-b overflow-x-auto max-w-full">
                        <TooltipProvider>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="scoreboard" className="rounded-none rounded-tl-lg min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <ScoreboardIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                        {isPowerplay && <Badge variant="destructive" className="ml-1 text-xs">P</Badge>}
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Scoreboard</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="summary" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <SummaryIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Summary</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="timeline" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <TimelineIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Timeline</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="runrate" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <RunRateIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Run Rate</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="worm" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <WormIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Worm</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="fow" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <FowIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Fall of Wickets</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="partnerships" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <PartnershipsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Partnerships</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="manhattan" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <ManhattanIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Manhattan</TooltipContent>
                            </ShadTooltip>
                            <ShadTooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger value="phases" className="rounded-none min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                        <PhasesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Phases</TooltipContent>
                            </ShadTooltip>
                            {match.currentInnings > 1 && (
                                <ShadTooltip>
                                    <TooltipTrigger asChild>
                                        <TabsTrigger value="winprob" className="rounded-none rounded-tr-lg min-w-0 px-2 sm:px-3 text-xs sm:text-sm">
                                            <WinProbIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </TabsTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Win Probability</TooltipContent>
                                </ShadTooltip>
                            )}
                            {match.currentInnings === 1 && <TabsTrigger value="" className="rounded-none rounded-tr-lg invisible min-w-0"></TabsTrigger>}
                        </TooltipProvider>
                    </TabsList>
                    <TabsContent value="summary" className="p-2 sm:p-3">
                        <InningsSummary innings={currentInnings} />
                    </TabsContent>
                    <TabsContent value="scoreboard" className="p-2 sm:p-3 space-y-3">
                        <Tabs defaultValue="innings1" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-card rounded-md">
                                <TabsTrigger value="innings1" className="rounded-md data-[state=active]:bg-primary/10 text-xs sm:text-sm">{innings1.battingTeam.name}</TabsTrigger>
                                {innings2 && <TabsTrigger value="innings2" className="rounded-md data-[state=active]:bg-primary/10 text-xs sm:text-sm">{innings2.battingTeam.name}</TabsTrigger>}
                            </TabsList>
                            <TabsContent value="innings1" className="p-0 pt-3 space-y-3">
                                <BattingCard innings={innings1} />
                                <BowlingCard innings={innings1} />
                            </TabsContent>
                            {innings2 && (
                                <TabsContent value="innings2" className="p-0 pt-3 space-y-3">
                                    <BattingCard innings={innings2} />
                                    <BowlingCard innings={innings2} />
                                </TabsContent>
                            )}
                        </Tabs>
                    </TabsContent>
                <TabsContent value="timeline" className="p-0">
                    <Timeline innings={match.innings[match.currentInnings - 1]} />
                </TabsContent>
                <TabsContent value="runrate" className="p-2 sm:p-3">
                    <RunRateChart />
                </TabsContent>
                <TabsContent value="worm" className="p-2 sm:p-3">
                    <WormGraph />
                </TabsContent>
                <TabsContent value="partnerships" className="p-2 sm:p-3">
                    <PartnershipAnalysis match={match} />
                </TabsContent>
                <TabsContent value="manhattan" className="p-2 sm:p-3">
                    <ManhattanChart innings={currentInnings} />
                </TabsContent>
                <TabsContent value="phases" className="p-2 sm:p-3">
                    <PhaseAnalysis innings={currentInnings} matchType={match.matchType} />
                </TabsContent>
                {match.currentInnings > 1 && (
                    <TabsContent value="winprob" className="p-2 sm:p-3">
                        <WinProbability match={match} />
                    </TabsContent>
                )}
                <TabsContent value="fow" className="p-2 sm:p-3 space-y-3">
                        <Tabs defaultValue="innings1" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-card rounded-md">
                                <TabsTrigger value="innings1" className="rounded-md data-[state=active]:bg-primary/10 text-xs sm:text-sm">{innings1.battingTeam.name}</TabsTrigger>
                                {innings2 && <TabsTrigger value="innings2" className="rounded-md data-[state=active]:bg-primary/10 text-xs sm:text-sm">{innings2.battingTeam.name}</TabsTrigger>}
                            </TabsList>
                            <TabsContent value="innings1" className="p-0 pt-3 space-y-3">
                                {innings1.fallOfWickets.length > 0 ? <FallOfWickets innings={innings1}/> : <p className="p-4 text-center text-muted-foreground text-sm">No wickets have fallen yet.</p>}
                            </TabsContent>
                            {innings2 && (
                                <TabsContent value="innings2" className="p-0 pt-3 space-y-3">
                                    {innings2.fallOfWickets.length > 0 ? <FallOfWickets innings={innings2}/> : <p className="p-4 text-center text-muted-foreground text-sm">No wickets have fallen yet.</p>}
                                </TabsContent>
                            )}
                        </Tabs>
                    </TabsContent>
                </Tabs>
            )}
      </CardContent>
    </Card>
  );
}

export default function Scoreboard(props: { match: Match, setMatch: (match: Match) => void, onBowlerChange: (bowlerId: number) => void, isSimulating?: boolean }) {
  return <ScoreboardContent {...props} />;
}
