"use client"

import { useMemo } from 'react'
import { Innings } from '@/types'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface ManhattanChartProps {
  innings: Innings
  className?: string
}

export default function ManhattanChart({ innings, className }: ManhattanChartProps) {
  const data = useMemo(() => {
    const runsPerOver: { over: number; runs: number; wickets: number }[] = []
    
    // Group balls by over
    const overMap = new Map<number, { runs: number; wickets: number }>()
    
    innings.timeline.forEach(ball => {
      const overNumber = Math.floor(ball.over || 0)
      
      if (!overMap.has(overNumber)) {
        overMap.set(overNumber, { runs: 0, wickets: 0 })
      }
      
      const overData = overMap.get(overNumber)!
      overData.runs += ball.runs + ball.extras
      if (ball.isWicket) {
        overData.wickets += 1
      }
    })
    
    // Convert map to array
    overMap.forEach((value, key) => {
      runsPerOver.push({
        over: key + 1, // 1-indexed for display
        runs: value.runs,
        wickets: value.wickets
      })
    })
    
    return runsPerOver.sort((a, b) => a.over - b.over)
  }, [innings])

  return (
    <Card className={`${className} border-2 border-primary/20 bg-gradient-to-br from-card to-card/50`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/20">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Runs Per Over
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="over"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `Ov ${value}`}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-lg border-primary/20">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs uppercase text-muted-foreground font-medium">
                            Over
                          </span>
                          <span className="font-bold text-primary text-lg">
                            {payload[0].payload.over}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs uppercase text-muted-foreground font-medium">
                            Runs
                          </span>
                          <span className="font-bold text-chart-2 text-lg">
                            {payload[0].value}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs uppercase text-muted-foreground font-medium">
                            Wickets
                          </span>
                          <span className="font-bold text-destructive text-lg">
                            {payload[1].value}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value, entry, index) => (
                <span className="text-sm font-medium text-foreground">
                  {value === 'runs' ? 'Runs' : 'Wickets'}
                </span>
              )}
            />
            <Bar 
              dataKey="runs" 
              fill="hsl(var(--chart-2))" 
              radius={[4, 4, 0, 0]}
              stroke="hsl(var(--chart-2))"
              strokeWidth={1}
            />
            <Bar 
              dataKey="wickets" 
              fill="hsl(var(--destructive))" 
              radius={[4, 4, 0, 0]}
              stroke="hsl(var(--destructive))"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
