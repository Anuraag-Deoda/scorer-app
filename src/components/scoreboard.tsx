"use client";

import { useState } from 'react';
import type { Match, Player, Team, Innings } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';

export default function Scoreboard({ match, setMatch, onBowlerChange, isSimulating }: { match: Match, setMatch: (match: Match) => void, onBowlerChange: (bowlerId: number) => void, isSimulating?: boolean }) {
  const innings1 = match.innings[0];
  const innings2 = match.innings.length > 1 ? match.innings[1] : null;

  const currentInnings = match.innings[match.currentInnings - 1];
  
  const BattingCard = ({ innings }: { innings: Innings }) => {
      const playingXI = innings.battingTeam.players.filter((p: Player) => !p.isSubstitute || p.isImpactPlayer);
      const didNotBat = innings.battingTeam.players.filter((p:Player) => p.batting.status === 'did not bat' && !p.isSubstitute);
      
      return (
        <div className="bg-card/50 rounded-md p-2">
            <h4 className="text-base font-semibold mb-2">Batting</h4>
            <Table>
              <TableHeader>
                <TableRow className="border-b-muted/50">
                  <TableHead className="w-[35%] font-semibold">Batter</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-right font-semibold">R</TableHead>
                  <TableHead className="text-right">B</TableHead>
                  <TableHead className="text-right">4s</TableHead>
                  <TableHead className="text-right">6s</TableHead>
                  <TableHead className="text-right">SR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playingXI.filter(p => p.batting.status !== 'did not bat').map((player: Player) => {
                  const isNotOut = player.batting.status === 'not out';
                  const isOnStrike = player.id === currentInnings.batsmanOnStrike && isNotOut;

                  return (
                  <TableRow key={player.id} className={`border-0 text-sm ${isNotOut ? 'bg-primary/5' : ''}`}>
                    <TableCell className="font-medium py-1">
                      {player.name}{isOnStrike ? '*' : ''}{player.isImpactPlayer ? <Badge variant="outline" className="ml-1 text-xs px-1 py-0.5 font-normal">IP</Badge> : ''}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate py-1">
                        {player.batting.status === 'out' ? player.batting.outDetails : player.batting.status}
                    </TableCell>
                    <TableCell className="text-right py-1 font-medium">{player.batting.runs}</TableCell>
                    <TableCell className="text-right py-1">{player.batting.ballsFaced}</TableCell>
                    <TableCell className="text-right py-1">{player.batting.fours}</TableCell>
                    <TableCell className="text-right py-1">{player.batting.sixes}</TableCell>
                    <TableCell className="text-right py-1">{player.batting.strikeRate.toFixed(1)}</TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
            {didNotBat.length > 0 && (
                <div className="p-3 text-xs bg-muted/30 rounded-b-md">
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
        <div className="bg-card/50 rounded-md p-2">
            <h4 className="text-base font-semibold mb-2">Bowling</h4>
            <Table>
              <TableHeader>
                <TableRow className="border-b-muted/50">
                  <TableHead className="w-[40%] font-semibold">Bowler</TableHead>
                  <TableHead className="text-right font-semibold">O</TableHead>
                  <TableHead className="text-right">M</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead className="text-right font-semibold">W</TableHead>
                  <TableHead className="text-right">Econ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bowlers.map((player: Player) => (
                  <TableRow key={player.id} className="border-0 text-sm">
                    <TableCell className="font-medium py-1">
                        {player.name}{player.isImpactPlayer ? <Badge variant="outline" className="ml-1 text-xs px-1 py-0.5 font-normal">IP</Badge> : ''}
                    </TableCell>
                    <TableCell className="text-right py-1">{Math.floor(player.bowling.ballsBowled / 6)}.{player.bowling.ballsBowled % 6}</TableCell>
                    <TableCell className="text-right py-1">{player.bowling.maidens}</TableCell>
                    <TableCell className="text-right py-1">{player.bowling.runsConceded}</TableCell>
                    <TableCell className="text-right py-1 font-medium">{player.bowling.wickets}</TableCell>
                    <TableCell className="text-right py-1">{player.bowling.economyRate.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      );
  }
  
  const FallOfWickets = ({ innings }: { innings: Innings }) => (
    <div className="bg-card/50 rounded-md p-3 space-y-2">
         <h4 className="text-base font-semibold mb-1">Fall of Wickets</h4>
        {innings.fallOfWickets.map((fow: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground leading-tight">
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
        <div className="p-4 space-y-4 bg-muted/40">
            {sortedOvers.map(overNum => (
                <div key={overNum} className="flex items-center gap-2 bg-card rounded-md p-3">
                    <p className="text-sm text-muted-foreground w-12 font-semibold">Ov {overNum + 1}</p>
                    <Separator orientation="vertical" className="h-6"/>
                    <div className="flex flex-wrap gap-1.5">
                        {ballsByOver[overNum].map((ball, ballIndex) => (
                             <span key={ballIndex} 
                                className={`flex items-center justify-center h-6 w-6 rounded-full font-bold text-xs border
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
                            <stop offset="5%" stopColor="var(--color-team1)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-team1)" stopOpacity={0.1}/>
                          </linearGradient>
                          {innings2 && <linearGradient id="fillTeam2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-team2)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-team2)" stopOpacity={0.1}/>
                          </linearGradient>}
                      </defs>
                      <Area type="monotone" dataKey={innings1.battingTeam.name} stroke={`hsl(var(--chart-1))`} strokeWidth={2} fillOpacity={1} fill="url(#fillTeam1)" dot={false} />
                      {innings2 && <Area type="monotone" dataKey={innings2.battingTeam.name} stroke={`hsl(var(--chart-2))`} strokeWidth={2} fillOpacity={1} fill="url(#fillTeam2)" dot={false} />}
                  </AreaChart>
              </ChartContainer>
          </div>
      );
  };


  const showBowlerSelection = currentInnings.currentBowler === -1 && match.status === 'inprogress' && currentInnings.overs < match.oversPerInnings;

  return (
    <Card className="shadow-none border-0">
        <CardContent className="p-0 bg-muted/40 rounded-lg">
            {showBowlerSelection && !isSimulating ? (
                <BowlerSelection />
            ) : (
                <Tabs defaultValue="scoreboard" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 rounded-b-none h-auto bg-card border-b">
                        <TabsTrigger value="scoreboard" className="rounded-none rounded-tl-lg">Scoreboard</TabsTrigger>
                        <TabsTrigger value="timeline" className="rounded-none">Timeline</TabsTrigger>
                        <TabsTrigger value="runrate" className="rounded-none rounded-tr-lg">Run Rate</TabsTrigger>
                    </TabsList>
                    <TabsContent value="scoreboard" className="p-3 space-y-3">
                        <Tabs defaultValue="innings1">
                            <TabsList className="grid w-full grid-cols-2 bg-card rounded-md">
                                <TabsTrigger value="innings1" className="rounded-md data-[state=active]:bg-primary/10">{innings1.battingTeam.name}</TabsTrigger>
                                {innings2 && <TabsTrigger value="innings2" className="rounded-md data-[state=active]:bg-primary/10">{innings2.battingTeam.name}</TabsTrigger>}
                            </TabsList>
                            <TabsContent value="innings1" className="p-0 space-y-3">
                                <BattingCard innings={innings1} />
                                <BowlingCard innings={innings1} />
                                {innings1.fallOfWickets.length > 0 && <FallOfWickets innings={innings1}/>}
                            </TabsContent>
                            {innings2 && (
                                <TabsContent value="innings2" className="p-0 space-y-3">
                                    <BattingCard innings={innings2} />
                                    <BowlingCard innings={innings2} />
                                    {innings2.fallOfWickets.length > 0 && <FallOfWickets innings={innings2}/>}
                                </TabsContent>
                            )}
                        </Tabs>
                    </TabsContent>
                    <TabsContent value="timeline" className="p-0">
                        <Timeline innings={match.innings[match.currentInnings - 1]} />
                    </TabsContent>
                     <TabsContent value="runrate" className="p-3">
                        <RunRateChart />
                    </TabsContent>
                </Tabs>
            )}
      </CardContent>
    </Card>
  );
}
