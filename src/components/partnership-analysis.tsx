"use client"

import { useMemo } from 'react'
import { Innings, Player, Match } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface PartnershipAnalysisProps {
  match: Match
  className?: string
}

interface Partnership {
  id: string
  batsman1: Player
  batsman2: Player
  runs: number
  balls: number
  startOver: number
  endOver?: number
  batsman1Runs: number
  batsman2Runs: number
  batsman1Balls: number
  batsman2Balls: number
}

export default function PartnershipAnalysis({ match, className }: PartnershipAnalysisProps) {
  if (!match || !match.innings || match.innings.length === 0) {
    return (
      <Card className={`${className} border-2 border-primary/20 bg-gradient-to-br from-card to-card/50`}>
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/20">
          <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Partnership Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No match data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const innings1 = match.innings[0];
  const innings2 = match.innings[1];

  const calculatePartnerships = (innings: Innings): Partnership[] => {
    const result: Partnership[] = []
    
    if (innings.fallOfWickets.length === 0) {
      // If no wickets, show current partnership
      if (innings.currentPartnership.runs > 0) {
        const batsman1 = innings.battingTeam.players.find(p => p.id === innings.currentPartnership.batsman1)
        const batsman2 = innings.battingTeam.players.find(p => p.id === innings.currentPartnership.batsman2)
        
        if (batsman1 && batsman2) {
          result.push({
            id: 'current',
            batsman1,
            batsman2,
            runs: innings.currentPartnership.runs,
            balls: innings.currentPartnership.balls,
            startOver: 0,
            batsman1Runs: batsman1.batting.runs,
            batsman2Runs: batsman2.batting.runs,
            batsman1Balls: batsman1.batting.ballsFaced,
            batsman2Balls: batsman2.batting.ballsFaced,
          })
        }
      }
      return result
    }

    // Calculate partnerships from fall of wickets
    let previousScore = 0
    let previousOver = 0
    
    innings.fallOfWickets.forEach((fow, index) => {
      const partnershipRuns = fow.score - previousScore
      
      // Find the two batsmen who were batting during this partnership
      const timelineBeforeWicket = innings.timeline.filter(ball => 
        ball.over !== undefined && ball.over < fow.over
      )
      
      // Get unique batsmen IDs from this period
      const batsmanIds = [...new Set(timelineBeforeWicket.map(ball => ball.batsmanId))]
      
      if (batsmanIds.length >= 2) {
        const batsman1 = innings.battingTeam.players.find(p => p.id === batsmanIds[batsmanIds.length - 2])
        const batsman2 = innings.battingTeam.players.find(p => p.id === batsmanIds[batsmanIds.length - 1])
        
        if (batsman1 && batsman2) {
          // Calculate individual contributions
          const batsman1Runs = timelineBeforeWicket
            .filter(ball => ball.batsmanId === batsman1.id)
            .reduce((sum, ball) => sum + ball.runs, 0)
          
          const batsman2Runs = timelineBeforeWicket
            .filter(ball => ball.batsmanId === batsman2.id)
            .reduce((sum, ball) => sum + ball.runs, 0)
          
          const batsman1Balls = timelineBeforeWicket
            .filter(ball => ball.batsmanId === batsman1.id && ball.event !== 'wd' && ball.event !== 'nb')
            .length
          
          const batsman2Balls = timelineBeforeWicket
            .filter(ball => ball.batsmanId === batsman2.id && ball.event !== 'wd' && ball.event !== 'nb')
            .length
          
          const partnershipBalls = batsman1Balls + batsman2Balls;

          result.push({
            id: `partnership-${index}`,
            batsman1,
            batsman2,
            runs: partnershipRuns,
            balls: partnershipBalls,
            startOver: previousOver,
            endOver: fow.over,
            batsman1Runs,
            batsman2Runs,
            batsman1Balls,
            batsman2Balls,
          })
        }
      }
      
      previousScore = fow.score
      previousOver = fow.over
    })
    
    // Add current partnership if it exists and has runs
    if (innings.currentPartnership.runs > 0) {
      const batsman1 = innings.battingTeam.players.find(p => p.id === innings.currentPartnership.batsman1)
      const batsman2 = innings.battingTeam.players.find(p => p.id === innings.currentPartnership.batsman2)
      
      if (batsman1 && batsman2) {
        const lastWicket = innings.fallOfWickets.length > 0 ? innings.fallOfWickets[innings.fallOfWickets.length - 1] : null;
        const startOver = lastWicket ? lastWicket.over : 0;
        
        result.push({
          id: 'current',
          batsman1,
          batsman2,
          runs: innings.currentPartnership.runs,
          balls: innings.currentPartnership.balls,
          startOver: startOver,
          batsman1Runs: batsman1.batting.runs,
          batsman2Runs: batsman2.batting.runs,
          batsman1Balls: batsman1.batting.ballsFaced,
          batsman2Balls: batsman2.batting.ballsFaced,
        })
      }
    }
    
    return result.sort((a, b) => b.runs - a.runs) // Sort by runs descending
  }

  const partnerships1 = calculatePartnerships(innings1);
  const partnerships2 = innings2 ? calculatePartnerships(innings2) : [];

  const renderPartnerships = (partnerships: Partnership[], teamName: string) => {
    if (partnerships.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No partnerships data available yet</p>
        </div>
      )
    }

    return (
      <div className="h-96 overflow-y-auto space-y-4 pr-2">
        {partnerships.map((partnership, index) => (
          <div key={partnership.id} className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  #{index + 1}
                </Badge>
                <span className="font-semibold text-lg">
                  {partnership.batsman1.name} & {partnership.batsman2.name}
                </span>
                {partnership.id === 'current' && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    Current
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {partnership.runs}
                </div>
                <div className="text-sm text-muted-foreground">
                  {partnership.balls} balls
                </div>
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {partnership.batsman1.name}
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Runs:</span>
                    <span className="font-semibold">{partnership.batsman1Runs}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Balls:</span>
                    <span className="font-semibold">{partnership.batsman1Balls}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Strike Rate:</span>
                    <span className="font-semibold">
                      {partnership.batsman1Balls > 0 
                        ? ((partnership.batsman1Runs / partnership.batsman1Balls) * 100).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {partnership.batsman2.name}
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Runs:</span>
                    <span className="font-semibold">{partnership.batsman2Runs}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Balls:</span>
                    <span className="font-semibold">{partnership.batsman2Balls}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Strike Rate:</span>
                    <span className="font-semibold">
                      {partnership.batsman2Balls > 0 
                        ? ((partnership.batsman2Runs / partnership.batsman2Balls) * 100).toFixed(1)
                        : '0.0'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-muted">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Partnership Duration:</span>
                <span>
                  {partnership.startOver.toFixed(1)} - {partnership.endOver ? partnership.endOver.toFixed(1) : 'ongoing'}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Partnership Run Rate:</span>
                <span className="font-medium">
                  {partnership.balls > 0 
                    ? ((partnership.runs / partnership.balls) * 6).toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className={`${className} border-2 border-primary/20 bg-gradient-to-br from-card to-card/50`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/20">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Partnership Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="team1" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="team1">{innings1.battingTeam.name}</TabsTrigger>
            {innings2 && <TabsTrigger value="team2">{innings2.battingTeam.name}</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="team1" className="mt-4">
            {renderPartnerships(partnerships1, innings1.battingTeam.name)}
          </TabsContent>
          
          {innings2 && (
            <TabsContent value="team2" className="mt-4">
              {renderPartnerships(partnerships2, innings2.battingTeam.name)}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
