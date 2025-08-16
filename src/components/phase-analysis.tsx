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
    <Card className={`${className} border-2 border-primary/20 bg-gradient-to-br from-card to-card/50`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/20">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Phase Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={250}>
          {phaseData.length > 0 ? (
            <BarChart data={phaseData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="left" 
                orientation="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value, name, props) => {
                  if (name === 'runs') return [
                    <span className="font-semibold text-primary">
                      {value} runs
                    </span>,
                    <span className="text-muted-foreground">
                      {props.payload.balls} balls
                    </span>
                  ]
                  if (name === 'runRate') return [
                    <span className="font-semibold text-chart-3">
                      {value}
                    </span>,
                    'Run Rate'
                  ]
                  if (name === 'wickets') return [
                    <span className="font-semibold text-destructive">
                      {value}
                    </span>,
                    'Wickets'
                  ]
                  return [value, name]
                }}
                labelFormatter={(label) => (
                  <span className="font-medium text-foreground">{label}</span>
                )}
              />
              <Bar 
                dataKey="runs" 
                yAxisId="left" 
                radius={[4, 4, 0, 0]}
                stroke="hsl(var(--primary))"
                strokeWidth={1}
              >
                {phaseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar
                dataKey="wickets"
                yAxisId="left"
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--destructive))"
                stroke="hsl(var(--destructive))"
                strokeWidth={1}
              />
            </BarChart>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-muted/50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-muted-foreground font-medium">No phase data available</p>
                <p className="text-sm text-muted-foreground">Start scoring to see phase analysis</p>
              </div>
            </div>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
