"use client"

import { useMemo } from 'react'
import { Innings } from '@/types'
import { ChartContainer } from './ui/chart'
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface PartnershipAnalysisProps {
  innings: Innings
  className?: string
}

interface Partnership {
  name: string
  value: number
  balls: number
}

export default function PartnershipAnalysis({ innings, className }: PartnershipAnalysisProps) {
  const data = useMemo(() => {
    const partnerships: Partnership[] = []
    const currentPartnership = innings.currentPartnership
    
    // Add previous partnerships from fall of wickets
    if (innings.fallOfWickets.length > 0) {
      let previousScore = 0
      
      innings.fallOfWickets.forEach((fow, index) => {
        const partnershipRuns = fow.score - previousScore
        const batsman1 = innings.battingTeam.players.find(p => 
          innings.timeline.some(ball => 
            ball.batsmanId === p.id && 
            ball.over !== undefined && 
            ball.over < fow.over
          )
        )
        
        const partnershipName = batsman1 ? 
          `${batsman1.name} & ${fow.playerOut}` : 
          `Partnership ${index + 1}`
        
        partnerships.push({
          name: partnershipName,
          value: partnershipRuns,
          balls: Math.round(partnershipRuns * 1.5) // Estimate balls faced
        })
        
        previousScore = fow.score
      })
    }
    
    // Add current partnership if it exists
    if (currentPartnership.runs > 0) {
      const batsman1 = innings.battingTeam.players.find(p => p.id === currentPartnership.batsman1)
      const batsman2 = innings.battingTeam.players.find(p => p.id === currentPartnership.batsman2)
      
      if (batsman1 && batsman2) {
        partnerships.push({
          name: `${batsman1.name} & ${batsman2.name}`,
          value: currentPartnership.runs,
          balls: currentPartnership.balls
        })
      }
    }
    
    return partnerships
  }, [innings])

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Partnership Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
            {data.length > 0 ? (
                <PieChart>
                    <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip
                    formatter={(value, name, props) => [
                        `${value} runs (${props.payload.balls} balls)`,
                        props.payload.name
                    ]}
                    />
                    <Legend />
                </PieChart>
            ) : (
                <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No partnerships data available</p>
                </div>
            )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
