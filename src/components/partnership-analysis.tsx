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

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))', 
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
    'hsl(var(--chart-7))',
    'hsl(var(--chart-8))'
  ]

  return (
    <Card className={`${className} border-2 border-primary/20 bg-gradient-to-br from-card to-card/50`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/20">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Partnership Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={250}>
            {data.length > 0 ? (
                <PieChart>
                    <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    innerRadius={30}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    >
                    {data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                    ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name, props) => [
                        <span className="font-semibold text-primary">
                          {value} runs
                        </span>,
                        <span className="text-muted-foreground">
                          {props.payload.balls} balls
                        </span>
                      ]}
                      labelFormatter={(label) => (
                        <span className="font-medium text-foreground">{label}</span>
                      )}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry, index) => (
                        <span className="text-sm font-medium text-foreground">
                          {value}
                        </span>
                      )}
                    />
                </PieChart>
            ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-muted/50 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground font-medium">No partnerships data available</p>
                    <p className="text-sm text-muted-foreground">Start scoring to see partnership analysis</p>
                  </div>
                </div>
            )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
