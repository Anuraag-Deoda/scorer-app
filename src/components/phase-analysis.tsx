"use client"

import { useMemo } from 'react'
import { Innings, MatchType } from '@/types'
import { getPowerplayOvers } from '@/lib/cricket-logic'
import { ChartContainer } from './ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface PhaseAnalysisProps {
  innings: Innings
  matchType: MatchType
  className?: string
}

interface PhaseData {
  name: string
  runs: number
  wickets: number
  balls: number
  runRate: number
  color: string
}

export default function PhaseAnalysis({ innings, matchType, className }: PhaseAnalysisProps) {
  const phaseData = useMemo(() => {
    const powerplayOvers = getPowerplayOvers(matchType)
    const totalOvers = innings.overs + (innings.ballsThisOver > 0 ? innings.ballsThisOver / 6 : 0)
    const maxOvers = matchType === MatchType.T20 ? 20 : 
                    matchType === MatchType.FiftyOvers ? 50 :
                    matchType === MatchType.TenOvers ? 10 :
                    matchType === MatchType.FiveOvers ? 5 : 2
    
    // Define phases based on match type
    const phases: {name: string, start: number, end: number, color: string}[] = []
    
    // Powerplay phase
    phases.push({
      name: 'Powerplay',
      start: 0,
      end: powerplayOvers,
      color: 'hsl(var(--primary))'
    })
    
    // Middle overs
    if (maxOvers > 10) {
      phases.push({
        name: 'Middle',
        start: powerplayOvers,
        end: maxOvers - 5, // Last 5 overs are death overs in longer formats
        color: 'hsl(var(--chart-2))'
      })
    } else if (maxOvers > 5) {
      phases.push({
        name: 'Middle',
        start: powerplayOvers,
        end: maxOvers - 2, // Last 2 overs are death overs in shorter formats
        color: 'hsl(var(--chart-2))'
      })
    }
    
    // Death overs
    if (maxOvers > 10) {
      phases.push({
        name: 'Death',
        start: maxOvers - 5,
        end: maxOvers,
        color: 'hsl(var(--destructive))'
      })
    } else if (maxOvers > 5) {
      phases.push({
        name: 'Death',
        start: maxOvers - 2,
        end: maxOvers,
        color: 'hsl(var(--destructive))'
      })
    }
    
    // Calculate stats for each phase
    const phaseStats: PhaseData[] = phases.map(phase => {
      // Filter balls in this phase
      const ballsInPhase = innings.timeline.filter(ball => {
        const over = ball.over || 0
        return over >= phase.start && over < phase.end
      })
      
      const runs = ballsInPhase.reduce((sum, ball) => sum + ball.runs + ball.extras, 0)
      const wickets = ballsInPhase.filter(ball => ball.isWicket).length
      const ballCount = ballsInPhase.length
      const runRate = ballCount > 0 ? (runs / ballCount) * 6 : 0
      
      return {
        name: phase.name,
        runs,
        wickets,
        balls: ballCount,
        runRate: parseFloat(runRate.toFixed(2)),
        color: phase.color
      }
    })
    
    return phaseStats
  }, [innings, matchType])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Phase Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {phaseData.length > 0 ? (
            <BarChart data={phaseData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value, name, props) => {
                  if (name === 'runs') return [`${value} runs (${props.payload.balls} balls)`, 'Runs']
                  if (name === 'runRate') return [`${value}`, 'Run Rate']
                  if (name === 'wickets') return [`${value}`, 'Wickets']
                  return [value, name]
                }}
              />
              <Bar dataKey="runs" yAxisId="left" radius={4}>
                {phaseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar
                dataKey="wickets"
                yAxisId="left"
                radius={4}
                fill="hsl(var(--destructive))"
              />
            </BarChart>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No phase data available</p>
            </div>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
