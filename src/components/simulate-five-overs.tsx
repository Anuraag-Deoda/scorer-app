"use client"

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Play, Pause, RotateCcw, Target, Timer, Users } from 'lucide-react'
import type { Match, Innings, Player, Ball } from '@/types'

interface SimulateFiveOversProps {
  match: Match
  currentInnings: Innings
  onBallUpdate: (ball: Ball) => void
  onInningsUpdate: (innings: Innings) => void
  onMatchUpdate: (match: Match) => void
  className?: string
}

interface BowlerStats {
  playerId: number
  name: string
  oversBowled: number
  maxOvers: number
  canBowl: boolean
}

export default function SimulateFiveOvers({
  match,
  currentInnings,
  onBallUpdate,
  onInningsUpdate,
  onMatchUpdate,
  className
}: SimulateFiveOversProps) {
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // 1 second per ball
  const [currentOver, setCurrentOver] = useState(currentInnings.overs)
  const [currentBall, setCurrentBall] = useState(0)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [selectedBowler, setSelectedBowler] = useState<number | null>(null)

  // Calculate bowling restrictions based on tournament type
  const getMaxOversPerBowler = () => {
    switch (match.tournamentType) {
      case 't10':
        return 2
      case 't20':
        return 4
      case '50-50':
        return 10
      default:
        return 4 // Default to T20 rules
    }
  }

  const maxOversPerBowler = getMaxOversPerBowler()

  // Get available bowlers with their current overs
  const getAvailableBowlers = (): BowlerStats[] => {
    return currentInnings.bowlingTeam.players.map(player => {
      const oversBowled = Math.floor(player.bowling.ballsBowled / 6)
      const canBowl = oversBowled < maxOversPerBowler
      
      return {
        playerId: player.id,
        name: player.name,
        oversBowled,
        maxOvers: maxOversPerBowler,
        canBowl
      }
    })
  }

  // Smart bowler selection logic
  const selectNextBowler = (): number | null => {
    const availableBowlers = getAvailableBowlers()
    const eligibleBowlers = availableBowlers.filter(b => b.canBowl)
    
    if (eligibleBowlers.length === 0) {
      return null // No bowlers available
    }

    // Prefer bowlers with fewer overs bowled
    const sortedBowlers = eligibleBowlers.sort((a, b) => a.oversBowled - b.oversBowled)
    
    // If multiple bowlers have same overs, prefer the one with better economy
    if (sortedBowlers.length > 1 && sortedBowlers[0].oversBowled === sortedBowlers[1].oversBowled) {
      const bowler1 = currentInnings.bowlingTeam.players.find(p => p.id === sortedBowlers[0].playerId)
      const bowler2 = currentInnings.bowlingTeam.players.find(p => p.id === sortedBowlers[1].playerId)
      
      if (bowler1 && bowler2) {
        const economy1 = bowler1.bowling.ballsBowled > 0 ? (bowler1.bowling.runsConceded / bowler1.bowling.ballsBowled) * 6 : 0
        const economy2 = bowler2.bowling.ballsBowled > 0 ? (bowler2.bowling.runsConceded / bowler2.bowling.ballsBowled) * 6 : 0
        
        if (economy1 < economy2) {
          return sortedBowlers[0].playerId
        } else {
          return sortedBowlers[1].playerId
        }
      }
    }
    
    return sortedBowlers[0].playerId
  }

  // Simulate a single ball
  const simulateBall = (): Ball => {
    const bowler = currentInnings.bowlingTeam.players.find(p => p.id === selectedBowler)
    if (!bowler) {
      throw new Error('No bowler selected')
    }

    // Simple ball simulation logic (can be enhanced)
    const possibleEvents = ['0', '1', '2', '3', '4', '6', 'w', 'wd', 'nb']
    const weights = [30, 25, 15, 5, 15, 5, 3, 1, 1] // Probability weights
    
    let random = Math.random() * weights.reduce((a, b) => a + b, 0)
    let eventIndex = 0
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        eventIndex = i
        break
      }
    }
    
    const event = possibleEvents[eventIndex]
    let runs = 0
    let extras = 0
    let isWicket = false
    
    switch (event) {
      case '0':
        runs = 0
        break
      case '1':
        runs = 1
        break
      case '2':
        runs = 2
        break
      case '3':
        runs = 3
        break
      case '4':
        runs = 4
        break
      case '6':
        runs = 6
        break
      case 'w':
        runs = 0
        isWicket = true
        break
      case 'wd':
        runs = 0
        extras = 1
        break
      case 'nb':
        runs = 0
        extras = 1
        break
    }

    const ball: Ball = {
      id: Date.now(),
      over: currentOver + (currentBall + 1) / 6,
      ball: (currentBall + 1) % 6 || 6,
      event,
      runs,
      extras,
      isWicket,
      batsmanId: currentInnings.striker,
      bowlerId: selectedBowler,
      timestamp: new Date().toISOString()
    }

    return ball
  }

  // Start simulation
  const startSimulation = () => {
    if (!selectedBowler) {
      const nextBowler = selectNextBowler()
      if (!nextBowler) {
        alert('No bowlers available to bowl!')
        return
      }
      setSelectedBowler(nextBowler)
    }
    
    setIsSimulating(true)
  }

  // Pause simulation
  const pauseSimulation = () => {
    setIsSimulating(false)
  }

  // Reset simulation
  const resetSimulation = () => {
    setIsSimulating(false)
    setCurrentOver(currentInnings.overs)
    setCurrentBall(0)
    setSimulationProgress(0)
    setSelectedBowler(null)
  }

  // Simulation loop
  useEffect(() => {
    if (!isSimulating || !selectedBowler) return

    const interval = setInterval(() => {
      try {
        const ball = simulateBall()
        
        // Update current ball and over
        if (currentBall === 5) {
          setCurrentBall(0)
          setCurrentOver(prev => prev + 1)
        } else {
          setCurrentBall(prev => prev + 1)
        }
        
        // Update progress
        const totalBalls = 30 // 5 overs * 6 balls
        const completedBalls = (currentOver - currentInnings.overs) * 6 + currentBall
        setSimulationProgress((completedBalls / totalBalls) * 100)
        
        // Call update functions
        onBallUpdate(ball)
        
        // Check if simulation is complete
        if (completedBalls >= totalBalls) {
          setIsSimulating(false)
          return
        }
        
        // Auto-select next bowler if current bowler has completed their overs
        const bowler = currentInnings.bowlingTeam.players.find(p => p.id === selectedBowler)
        if (bowler && Math.floor(bowler.bowling.ballsBowled / 6) >= maxOversPerBowler) {
          const nextBowler = selectNextBowler()
          if (nextBowler) {
            setSelectedBowler(nextBowler)
          } else {
            setIsSimulating(false)
            alert('No more bowlers available!')
          }
        }
        
      } catch (error) {
        console.error('Simulation error:', error)
        setIsSimulating(false)
      }
    }, simulationSpeed)

    return () => clearInterval(interval)
  }, [isSimulating, selectedBowler, currentOver, currentBall, simulationSpeed])

  const availableBowlers = getAvailableBowlers()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Simulate 5 Overs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simulation Controls */}
        <div className="flex items-center gap-2">
          {!isSimulating ? (
            <Button onClick={startSimulation} disabled={availableBowlers.filter(b => b.canBowl).length === 0}>
              <Play className="w-4 h-4 mr-2" />
              Start Simulation
            </Button>
          ) : (
            <Button onClick={pauseSimulation} variant="secondary">
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          
          <Button onClick={resetSimulation} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Simulation Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Simulation Progress</span>
            <span>{Math.round(simulationProgress)}%</span>
          </div>
          <Progress value={simulationProgress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {currentOver.toFixed(1)} overs completed
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{currentOver.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Current Over</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{currentBall || 0}</div>
            <div className="text-xs text-muted-foreground">Current Ball</div>
          </div>
        </div>

        {/* Bowler Selection */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Available Bowlers
          </h4>
          <div className="space-y-2">
            {availableBowlers.map(bowler => (
              <div
                key={bowler.playerId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedBowler === bowler.playerId ? 'border-primary bg-primary/10' : 'border-border'
                } ${!bowler.canBowl ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{bowler.name}</span>
                  <Badge variant="secondary">
                    {bowler.oversBowled}/{bowler.maxOvers} overs
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {bowler.canBowl && (
                    <Button
                      size="sm"
                      variant={selectedBowler === bowler.playerId ? "default" : "outline"}
                      onClick={() => setSelectedBowler(bowler.playerId)}
                      disabled={!bowler.canBowl}
                    >
                      {selectedBowler === bowler.playerId ? "Selected" : "Select"}
                    </Button>
                  )}
                  {!bowler.canBowl && (
                    <Badge variant="destructive">Max Overs</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tournament Rules Info */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <Timer className="w-4 h-4" />
            <span className="font-medium">Bowling Restrictions</span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            {match.tournamentType === 't10' && 'T10: Maximum 2 overs per bowler'}
            {match.tournamentType === 't20' && 'T20: Maximum 4 overs per bowler'}
            {match.tournamentType === '50-50' && '50-50: Maximum 10 overs per bowler'}
            {!['t10', 't20', '50-50'].includes(match.tournamentType) && 'Default: Maximum 4 overs per bowler'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
