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
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Runs Per Over</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="over"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `Ov ${value}`}
            />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Over
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {payload[0].payload.over}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Runs
                          </span>
                          <span className="font-bold">
                            {payload[0].value}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Wickets
                          </span>
                          <span className="font-bold text-destructive">
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
            <Legend />
            <Bar dataKey="runs" fill="hsl(var(--primary))" radius={4} />
            <Bar dataKey="wickets" fill="hsl(var(--destructive))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
