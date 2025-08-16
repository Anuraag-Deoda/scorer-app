"use client"

import { useMemo } from 'react'
import { Match } from '@/types'
import { ChartContainer } from './ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'

interface WinProbabilityProps {
  match: Match
  className?: string
}

export default function WinProbability({ match, className }: WinProbabilityProps) {
  const { winProbability, winProbHistory } = useMemo(() => {
    // Default to 50-50 if it's the first innings
    if (match.currentInnings === 1) {
      return { 
        winProbability: 50, 
        winProbHistory: Array(10).fill(0).map((_, i) => ({
          over: i + 1,
          probability: 50
        }))
      }
    }
    
    const innings1 = match.innings[0]
    const innings2 = match.innings[1]
    
    // Calculate based on required run rate vs current run rate
    const totalBalls = match.oversPerInnings * 6
    const ballsRemaining = totalBalls - (innings2.overs * 6 + innings2.ballsThisOver)
    const runsNeeded = innings1.score + 1 - innings2.score
    
    // Required run rate
    const requiredRunRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 0
    
    // Current run rate
    const ballsFaced = innings2.overs * 6 + innings2.ballsThisOver
    const currentRunRate = ballsFaced > 0 ? (innings2.score / ballsFaced) * 6 : 0
    
    // Wickets factor (more wickets in hand = better chance)
    const wicketsFactor = (10 - innings2.wickets) / 10
    
    // Calculate win probability
    let probability = 50
    
    if (runsNeeded <= 0) {
      // Batting team has won
      probability = 100
    } else if (innings2.wickets >= 10 || ballsRemaining <= 0) {
      // Bowling team has won
      probability = 0
    } else {
      // Base calculation on run rates and wickets
      const runRateRatio = currentRunRate / requiredRunRate
      probability = Math.min(Math.max(runRateRatio * 50 * wicketsFactor, 1), 99)
      
      // Adjust based on balls remaining
      const ballsRemainingFactor = ballsRemaining / totalBalls
      probability = probability * (1 - ballsRemainingFactor * 0.3)
      
      // Adjust for very close games
      if (runsNeeded < 10 && ballsRemaining > runsNeeded * 2) {
        probability = Math.min(probability * 1.2, 95)
      }
      
      // Adjust for very difficult chases
      if (requiredRunRate > currentRunRate * 2 && ballsRemaining < totalBalls / 2) {
        probability = Math.max(probability * 0.7, 5)
      }
    }
    
    // Generate history data (simplified for demo)
    const history = []
    const totalOvers = match.oversPerInnings
    
    for (let i = 1; i <= totalOvers; i++) {
      const overProgress = i / totalOvers
      
      // For overs that have been played, use a formula that gradually approaches the final probability
      if (i <= innings2.overs) {
        const initialProb = 50
        const finalProb = probability
        const currentProb = initialProb + (finalProb - initialProb) * (i / innings2.overs)
        
        history.push({
          over: i,
          probability: Math.round(currentProb)
        })
      } else {
        // For future overs, project based on current probability
        history.push({
          over: i,
          probability: Math.round(probability)
        })
      }
    }
    
    return { 
      winProbability: Math.round(probability), 
      winProbHistory: history 
    }
  }, [match])

  return (
    <Card className={`${className} border-2 border-primary/20 bg-gradient-to-br from-card to-card/50`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/20">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Win Probability
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{match.innings[0].bowlingTeam.name}</span>
            <span className="text-sm font-medium text-foreground">{match.innings[0].battingTeam.name}</span>
          </div>
          <Progress value={winProbability} className="h-3 bg-muted/50" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{100 - winProbability}%</span>
            <span className="font-medium">{winProbability}%</span>
          </div>
          
          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={winProbHistory} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="over" 
                  label={{ 
                    value: 'Over', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
                  }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ 
                    value: 'Win Probability %', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }
                  }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [
                    <span className="font-semibold text-primary">
                      {value}%
                    </span>,
                    'Win Probability'
                  ]}
                  labelFormatter={(label) => (
                    <span className="font-medium text-foreground">Over {label}</span>
                  )}
                />
                <Line 
                  type="monotone" 
                  dataKey="probability" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--chart-2))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}