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
        <div className="bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-b-white/10">
                  <TableHead className="w-[35%] font-bold">Batter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right font-bold">R</TableHead>
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
                  <TableRow key={player.id} className={`border-0 ${isNotOut ? 'bg-primary/10' : ''}`}>
                    <TableCell className="font-semibold">
                      {player.name}{isOnStrike ? '*' : ''}{player.isImpactPlayer ? <Badge variant="outline" className="ml-2">IP</Badge> : ''}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {player.batting.status === 'out' ? player.batting.outDetails : player.batting.status}
                    </TableCell>
                    <TableCell className="text-right font-bold">{player.batting.runs}</TableCell>
                    <TableCell className="text-right">{player.batting.ballsFaced}</TableCell>
                    <TableCell className="text-right">{player.batting.fours}</TableCell>
                    <TableCell className="text-right">{player.batting.sixes}</TableCell>
                    <TableCell className="text-right">{player.batting.strikeRate.toFixed(1)}</TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
            {didNotBat.length > 0 && (
                <div className="p-4 text-xs bg-muted">
                    <p className="font-semibold mb-1">Yet to bat:</p>
                    <p className="text-muted-foreground">{didNotBat.map(p => p.name).join(', ')}</p>
                </div>
            )}
        </div>
      );
  }

  const BowlingCard = ({ innings }: { innings: Innings }) => {
    const bowlers = innings.bowlingTeam.players.filter((p: Player) => (!p.isSubstitute || p.isImpactPlayer) && p.bowling.ballsBowled > 0);

    return (
        <Table>
          <TableHeader>
            <TableRow className="border-b-white/10">
              <TableHead className="w-[40%] font-bold">Bowler</TableHead>
              <TableHead className="text-right font-bold">O</TableHead>
              <TableHead className="text-right">M</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right font-bold">W</TableHead>
              <TableHead className="text-right">Econ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bowlers.map((player: Player) => (
              <TableRow key={player.id} className="border-0">
                <TableCell className="font-semibold">
                    {player.name}{player.isImpactPlayer ? <Badge variant="outline" className="ml-2">IP</Badge> : ''}
                </TableCell>
                <TableCell className="text-right">{Math.floor(player.bowling.ballsBowled / 6)}.{player.bowling.ballsBowled % 6}</TableCell>
                <TableCell className="text-right">{player.bowling.maidens}</TableCell>
                <TableCell className="text-right">{player.bowling.runsConceded}</TableCell>
                <TableCell className="text-right font-bold">{player.bowling.wickets}</TableCell>
                <TableCell className="text-right">{player.bowling.economyRate.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
  }
  
  const FallOfWickets = ({ innings }: { innings: Innings }) => (
    <div className="p-4 space-y-2 text-sm bg-card">
        {innings.fallOfWickets.map((fow: any, index: number) => (
            <p key={index} className="text-sm">
                <span className="font-bold">{fow.score}-{fow.wicket}</span> ({fow.playerOut}, {fow.over.toFixed(1)} ov)
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
        <div className="p-4 space-y-4 bg-card">
            {sortedOvers.map(overNum => (
                <div key={overNum} className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground w-16">Ov {overNum + 1}</p>
                    <Separator orientation="vertical" className="h-6"/>
                    <div className="flex flex-wrap gap-1">
                        {ballsByOver[overNum].map((ball, ballIndex) => (
                             <span key={ballIndex} 
                                className={`flex items-center justify-center h-7 w-7 rounded-full font-bold text-xs border
                                ${ball.event === 'w' ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-transparent'}
                                ${['wd', 'nb', 'lb', 'b'].includes(ball.event) ? 'bg-secondary text-secondary-foreground' : ''}
                                ${ball.runs === 4 ? 'bg-primary text-white' : ''}
                                ${ball.runs === 6 ? 'bg-purple-600 text-white' : ''}
                                ${ball.event === 'run' && ball.runs > 0 && ball.runs < 4 ? 'bg-primary/20' : ''}
                                ${ball.event === 'run' && ball.runs === 0 ? 'bg-muted/50' : ''}
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
        <div className="p-6 space-y-4 text-center">
            <h4 className="font-headline text-lg">Select Next Bowler</h4>
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
          <div className="p-4 h-80 bg-card">
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
    <Card>
        <CardContent className="p-0">
            {showBowlerSelection && !isSimulating ? (
                <BowlerSelection />
            ) : (
                <Tabs defaultValue="scoreboard">
                    <TabsList className="w-full justify-around rounded-t-lg rounded-b-none p-0 h-auto bg-card border-b">
                        <TabsTrigger value="scoreboard" className="w-1/3 py-3 data-[state=active]:bg-secondary data-[state=active]:shadow-inner rounded-tl-lg">Scoreboard</TabsTrigger>
                        <TabsTrigger value="timeline" className="w-1/3 py-3 data-[state=active]:bg-secondary data-[state=active]:shadow-inner">Timeline</TabsTrigger>
                        <TabsTrigger value="runrate" className="w-1/3 py-3 data-[state=active]:bg-secondary data-[state=active]:shadow-inner rounded-tr-lg">Run Rate</TabsTrigger>
                    </TabsList>
                    <TabsContent value="scoreboard" className="space-y-2 bg-muted/40">
                        <Tabs defaultValue="innings1">
                            <TabsList className="w-full justify-around bg-card p-0 h-auto border-b">
                                <TabsTrigger value="innings1" className="w-1/2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary-foreground">{innings1.battingTeam.name}</TabsTrigger>
                                {innings2 && <TabsTrigger value="innings2" className="w-1/2 py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary-foreground">{innings2.battingTeam.name}</TabsTrigger>}
                            </TabsList>
                            <TabsContent value="innings1" className="p-0 space-y-2">
                                <Card><CardHeader className="p-3 bg-secondary/50"><CardTitle className="text-base font-headline">Batting</CardTitle></CardHeader><CardContent className="p-0"><BattingCard innings={innings1} /></CardContent></Card>
                                <Card><CardHeader className="p-3 bg-secondary/50"><CardTitle className="text-base font-headline">Bowling</CardTitle></CardHeader><CardContent className="p-0"><BowlingCard innings={innings1} /></CardContent></Card>
                                {innings1.fallOfWickets.length > 0 && <Card><CardHeader className="p-3 bg-secondary/50"><CardTitle className="text-base font-headline">Fall of Wickets</CardTitle></CardHeader><CardContent><FallOfWickets innings={innings1}/></CardContent></Card>}
                            </TabsContent>
                            {innings2 && (
                                <TabsContent value="innings2" className="p-0 space-y-2">
                                    <Card><CardHeader className="p-3 bg-secondary/50"><CardTitle className="text-base font-headline">Batting</CardTitle></CardHeader><CardContent className="p-0"><BattingCard innings={innings2} /></CardContent></Card>
                                    <Card><CardHeader className="p-3 bg-secondary/50"><CardTitle className="text-base font-headline">Bowling</CardTitle></CardHeader><CardContent className="p-0"><BowlingCard innings={innings2} /></CardContent></Card>
                                    {innings2.fallOfWickets.length > 0 && <Card><CardHeader className="p-3 bg-secondary/50"><CardTitle className="text-base font-headline">Fall of Wickets</CardTitle></CardHeader><CardContent><FallOfWickets innings={innings2}/></CardContent></Card>}
                                </TabsContent>
                            )}
                        </Tabs>
                    </TabsContent>
                    <TabsContent value="timeline">
                        <Timeline innings={match.innings[match.currentInnings - 1]} />
                    </TabsContent>
                    <TabsContent value="runrate">
                        <RunRateChart />
                    </TabsContent>
                </Tabs>
            )}
      </CardContent>
    </Card>
  );
}
