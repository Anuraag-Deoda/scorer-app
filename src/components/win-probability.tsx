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
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Win Probability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{match.innings[0].bowlingTeam.name}</span>
            <span className="text-sm font-medium">{match.innings[0].battingTeam.name}</span>
          </div>
          <Progress value={winProbability} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{100 - winProbability}%</span>
            <span>{winProbability}%</span>
          </div>
          
          <div className="h-[150px] w-full mt-4">
            <ChartContainer config={{
              probability: {
                label: 'Win Probability',
                theme: {
                  light: 'hsl(var(--primary))',
                  dark: 'hsl(var(--primary))'
                }
              }
            }}>
              <LineChart data={winProbHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis 
                  dataKey="over" 
                  label={{ value: 'Over', position: 'insideBottom', offset: -5 }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: '%', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Win Probability']}
                  labelFormatter={(label) => `Over ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="probability" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}