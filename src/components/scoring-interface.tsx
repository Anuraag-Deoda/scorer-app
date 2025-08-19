"use client"

import { useState, useEffect, useRef } from 'react';
import type { Match, BallEvent, Team, BallDetails, GenerateMatchCommentaryInput, FielderPlacement } from "@/types"
import { processBall, undoLastBall, updateFieldPlacements, getMatchSituation, getPowerplayOvers, handleRainInterruption, selectNextBatsman } from "@/lib/cricket-logic"
import { generateMatchCommentary } from "@/ai/flows/generate-match-commentary";
import { Button } from "../components/ui/button"
import { BallOutcome } from "@/simulation/types";
import { motion } from "framer-motion";
import { PieChart } from "lucide-react";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import Scoreboard from "./scoreboard"
import { Separator } from "./ui/separator"
import CommentaryGenerator from "./commentary-generator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Undo, Flame, PlusCircle, Users, Bot, ChevronsRight, Target } from "lucide-react"
import ManagePlayersDialog from "./manage-players-dialog";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "./ui/dialog";
import FieldEditor from "./field-editor"; // Assuming you'll create this component


type ScoringInterfaceProps = {
  match: Match
  setMatch: (match: Match) => void
  endMatch: () => void
}

const WICKET_TYPES = [
    "Bowled", "Caught", "LBW", "Run Out", "Stumped", "Hit Wicket"
];

export default function ScoringInterface({ match, setMatch, endMatch }: ScoringInterfaceProps) {
  const { toast } = useToast();
  const [isManagePlayersOpen, setIsManagePlayersOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [commentary, setCommentary] = useState<string[]>([]);
  const [wicketTaker, setWicketTaker] = useState<{type: string, fielderId: number | null}>({type: '', fielderId: null});
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [aiAggression, setAiAggression] = useState(1.0);
  const [showNextBatsmanSelector, setShowNextBatsmanSelector] = useState(false);

  const currentInnings = match.innings[match.currentInnings - 1]
  const battingTeam = currentInnings.battingTeam
  const bowlingTeam = currentInnings.bowlingTeam
  const onStrikeBatsman = battingTeam.players.find(p => p.id === currentInnings.batsmanOnStrike);
  const nonStrikeBatsman = battingTeam.players.find(p => p.id === currentInnings.batsmanNonStrike);
  const currentBowler = bowlingTeam.players.find(p => p.id === currentInnings.currentBowler);

  const handleEvent = (event: BallEvent, runs: number = 0, extras: number = 0, wicketType?: string, fielderId?: number) => {
    if (match.status === 'finished') {
      toast({ title: "Match Finished", description: "This match has already concluded." });
      return;
    }

    if (currentInnings.currentBowler === -1) {
        toast({ variant: "destructive", title: "No Bowler Selected", description: "Please select a bowler for the over." });
        return;
    }

    const bowler = bowlingTeam.players.find(p => p.id === currentInnings.currentBowler);
    if(bowler?.isSubstitute && !bowler.isImpactPlayer) {
      toast({ variant: "destructive", title: "Invalid Bowler", description: "A substitute cannot bowl unless they are an Impact Player." });
      return;
    }

    const newMatchState = processBall(match, { event, runs, extras, wicketType, fielderId });
    if(newMatchState) {
        // Check if we need to select next batsman after wicket
        if (event === 'w' && newMatchState.innings[newMatchState.currentInnings - 1].batsmanOnStrike === -1) {
            setShowNextBatsmanSelector(true);
        }
        
        // Check for rain interruption after manual ball scoring
        if (newMatchState.rainSimulation?.willRain) {
          const currentOver = Math.floor(newMatchState.innings[newMatchState.currentInnings - 1].overs);
          const currentInningsNumber = newMatchState.currentInnings;
          
          // Check if rain should interrupt now
          if (currentOver >= (newMatchState.rainSimulation.interruptionOver || 0) && 
              currentInningsNumber === newMatchState.rainSimulation.interruptionInnings) {
            
            // Apply rain interruption
            const rainInterruptedMatch = handleRainInterruption(newMatchState, currentOver, currentInningsNumber);
            
            // Show rain notification
            if (rainInterruptedMatch.rainSimulation?.rainMessage) {
              toast({
                title: "🌧️ Rain Interruption!",
                description: rainInterruptedMatch.rainSimulation.rainMessage,
                duration: 5000,
              });
            }
            
            setMatch(rainInterruptedMatch);
            return;
          }
        }
        
        setMatch(newMatchState);
    }
  }

  const handleUndo = () => {
    const newMatchState = undoLastBall(match);
    if(newMatchState) {
        setMatch(newMatchState);
        toast({ title: "Undo Successful", description: "Last event has been reversed." });
    } else {
        toast({ variant: "destructive", title: "Undo Failed", description: "No events to undo." });
    }
  }

  const handleBowlerChange = (bowlerId: number) => {
    const newMatch = JSON.parse(JSON.stringify(match));
    const newCurrentInnings = newMatch.innings[newMatch.currentInnings - 1];
    
    if (newCurrentInnings.currentBowler !== -1) {
      toast({ variant: "destructive", title: "Cannot Change Bowler", description: "Bowler can only be changed at the start of an over." });
      return;
    }

    const newBowler = newCurrentInnings.bowlingTeam.players.find((p: any) => p.id === bowlerId);
    if (newBowler?.isSubstitute && !newBowler.isImpactPlayer) {
         toast({ variant: "destructive", title: "Invalid Bowler", description: "A substitute cannot bowl unless they are an Impact Player." });
        return;
    }

    newCurrentInnings.currentBowler = bowlerId;
    setMatch(newMatch);
  }

  const handleNextBatsmanSelection = (batsmanId: number) => {
    const newMatchState = selectNextBatsman(match, batsmanId);
    if (newMatchState) {
      setMatch(newMatchState);
      setShowNextBatsmanSelector(false);
      toast({ title: "Next Batsman Selected", description: "The next batsman has been set." });
    } else {
      toast({ variant: "destructive", title: "Selection Failed", description: "Unable to select this batsman." });
    }
  }

  const getMatchSummaryForAI = (matchState: Match): string => {
    const situation = getMatchSituation(matchState);
    const innings = matchState.innings[matchState.currentInnings - 1];
    const powerplayOvers = getPowerplayOvers(matchState.matchType);
    const isPowerplay = innings.overs < powerplayOvers;
    const onStrike = innings.battingTeam.players.find(p => p.id === innings.batsmanOnStrike);
    const nonStrike = innings.battingTeam.players.find(p => p.id === innings.batsmanNonStrike);
    const bowler = innings.bowlingTeam.players.find(p => p.id === innings.currentBowler);

    let summary = `Innings ${situation.innings}: ${situation.battingTeamName} are ${innings.score}/${innings.wickets} after ${innings.overs}.${innings.ballsThisOver} overs.`;
    if (isPowerplay) {
      summary += ` It's a powerplay over.`;
    }
    if (situation.isChasing) {
      summary += ` Chasing ${situation.target}, they need ${situation.runsNeeded} runs from ${situation.ballsRemaining} balls.`;
    }
    summary += `\n${onStrike?.name} is on strike with ${onStrike?.batting.runs} runs. ${bowler?.name} is bowling.`;
    return summary;
  }
  
  const handleGenerateCommentary = async (matchStateForCommentary: Match | null, ball: BallDetails, ballNumber?: string) => {
    if (!matchStateForCommentary) return;

    const innings = matchStateForCommentary.innings[matchStateForCommentary.currentInnings - 1];
    const batsman = innings.battingTeam.players.find(p => p.id === innings.batsmanOnStrike)?.name || 'Unknown';
    const bowler = innings.bowlingTeam.players.find(p => p.id === innings.currentBowler)?.name || 'Unknown';
    const fielder = ball.fielderId ? innings.bowlingTeam.players.find(p => p.id === ball.fielderId)?.name : undefined;

    try {
      const result = await generateMatchCommentary({
        ball,
        batsman,
        bowler,
        fielder,
        matchState: getMatchSummaryForAI(matchStateForCommentary),
      });
      const prefix = ballNumber ? `${ballNumber}: ` : '';
      setCommentary((prev) => [`${prefix}${result.commentary}`, ...prev]);
    } catch (error) {
      console.error("Failed to generate commentary", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Could not generate commentary at this time.",
      });
    }
  };
  
  const handleSimulateOver = async () => {
    if (match.status === 'finished') {
      toast({ variant: "destructive", title: "Cannot Simulate", description: "Match has already finished." });
      return;
    }
    if (currentInnings.currentBowler === -1) {
      toast({ variant: "destructive", title: "Cannot Simulate", description: "Please select a bowler for the over." });
      return;
    }
    setIsSimulating(true);

    try {
      const response = await fetch('/api/simulate-over', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match, aiAggression }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to simulate over');
      }

      const result = await response.json();

      toast({
        // title: `Simulation Complete (${result.debug.pattern || result.debug.flow})`,
        description: `Strategy: ${result.cost > 0 ? 'AI' : 'Rule-Based'}. Cost: $${result.cost.toFixed(4)}`,
      });

      // 4. Process the results
      let matchState: Match | null = match;
      for (const outcome of result.outcomes) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const ballDetails = mapOutcomeToBallDetails(outcome);
        const processedMatchState = processBall(matchState, ballDetails);

        if (processedMatchState) {
          matchState = processedMatchState;
          // If a wicket fell and next batsman is required, prompt and pause the over processing
          const innings = matchState.innings[matchState.currentInnings - 1];
          if (ballDetails.event === 'w' && innings.batsmanOnStrike === -1) {
            setMatch(matchState);
            setShowNextBatsmanSelector(true);
            break; // wait for user to select next batsman
          }
          
          // Check for rain interruption after each ball
          if (matchState.rainSimulation?.willRain) {
            const currentOver = Math.floor(matchState.innings[matchState.currentInnings - 1].overs);
            const currentInningsNumber = matchState.currentInnings;
            
            // Check if rain should interrupt now
            if (currentOver >= (matchState.rainSimulation.interruptionOver || 0) && 
                currentInningsNumber === matchState.rainSimulation.interruptionInnings) {
              
              // Apply rain interruption
              const rainInterruptedMatch = handleRainInterruption(matchState, currentOver, currentInningsNumber);
              matchState = rainInterruptedMatch;
              
              // Show rain notification
              if (rainInterruptedMatch.rainSimulation?.rainMessage) {
                toast({
                  title: "🌧️ Rain Interruption!",
                  description: rainInterruptedMatch.rainSimulation.rainMessage,
                  duration: 5000,
                });
              }
            }
          }
          
          setMatch(matchState);

          if (matchState.status !== 'finished') {
            const ballNum = `${matchState.innings[matchState.currentInnings - 1].overs}.${matchState.innings[matchState.currentInnings - 1].ballsThisOver}`;
            //await handleGenerateCommentary(matchState, ballDetails, ballNum);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          break; // Stop processing if match state is invalid
        }
      }

    } catch (error) {
      console.error("Failed to simulate over", error);
      toast({
        variant: "destructive",
        title: "Simulation Error",
        description: (error as Error).message,
      });
    } finally {
      setIsSimulating(false);
    }
  }

  function mapOutcomeToBallDetails(outcome: BallOutcome): BallDetails {
    switch (outcome.type) {
      case 'DOT':
        return { event: 'run', runs: 0, extras: 0 };
      case 'SINGLE':
        return { event: 'run', runs: 1, extras: 0 };
      case 'DOUBLE':
        return { event: 'run', runs: 2, extras: 0 };
      case 'FOUR':
        return { event: 'run', runs: 4, extras: 0 };
      case 'SIX':
        return { event: 'run', runs: 6, extras: 0 };
      case 'WICKET':
        return { event: 'w', runs: 0, extras: 0, wicketType: outcome.wicketType };
      case 'WIDE':
        return { event: 'wd', runs: 0, extras: 1 };
      case 'NO_BALL':
        return { event: 'nb', runs: 0, extras: 1 };
      case 'BYE':
        return { event: 'b', runs: 0, extras: 1 };
      case 'LEG_BYE':
        return { event: 'lb', runs: 0, extras: 1 };
      default:
        return { event: 'run', runs: 0, extras: 0 };
    }
  }

  const canSimulate = currentInnings.currentBowler !== -1 && match.status === 'inprogress';
  const scoringControlsDisabled = isSimulating || currentInnings.currentBowler === -1 || match.status === 'finished';

  const renderWicketDialog = () => (
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>How was the dismissal?</AlertDialogTitle>
            <AlertDialogDescription>
            Select the type of wicket to record it accurately. For Caught, Stumped or Run Out, you will be asked to select a fielder.
            </AlertDialogDescription>
        </AlertDialogHeader>
        {wicketTaker.type === '' ? (
            <div className="grid grid-cols-2 gap-2 my-4">
                {WICKET_TYPES.map(type => (
                    <Button 
                        key={type} 
                        onClick={() => {
                            if (["Caught", "Stumped", "Run Out"].includes(type)) {
                                setWicketTaker({ ...wicketTaker, type })
                            } else {
                                handleEvent('w', 0, 0, type, currentBowler?.id);
                            }
                        }} 
                        className="w-full"
                    >
                        {type}
                    </Button>
                ))}
            </div>
        ) : (
            <div className="space-y-4">
                <Label>Fielder Involved</Label>
                <select 
                    onChange={(e) => setWicketTaker({ ...wicketTaker, fielderId: parseInt(e.target.value) })}
                    className="w-full h-10 border rounded-md px-2 text-sm bg-background"
                >
                    <option value="">Select Fielder</option>
                    {bowlingTeam.players.filter(p => !p.isSubstitute).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setWicketTaker({type: '', fielderId: null})}>Back</AlertDialogCancel>
                    <AlertDialogAction 
                        disabled={!wicketTaker.fielderId}
                        onClick={() => {
                            handleEvent('w', 0, 0, wicketTaker.type, wicketTaker.fielderId ?? undefined);
                            setWicketTaker({type: '', fielderId: null});
                        }}
                    >
                        Confirm Dismissal
                    </AlertDialogAction>
                </AlertDialogFooter>
            </div>
        )}
    </AlertDialogContent>
  );

    // Function to handle saving placements from FieldEditor
    const handleSaveFieldPlacements = (placements: FielderPlacement[]) => {
        const newMatchState = updateFieldPlacements(match, placements);
        setMatch(newMatchState);
        setIsFieldEditorOpen(false); // Close the dialog
        toast({title: "Field Placements Updated", description: "Field settings for the current over have been saved."});
    };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-none border-0 bg-muted/40">
          <CardHeader className="pb-3">
            <CardTitle className="font-sans text-lg font-semibold text-center">Scoring Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(runs => (
                <Button key={runs} onClick={() => handleEvent('run', runs)} className="h-14 text-xl font-bold" variant="secondary" disabled={scoringControlsDisabled}>
                  {runs}
                </Button>
              ))}
              {[4, 6].map(runs => (
                <Button key={runs} onClick={() => handleEvent('run', runs)} className="h-14 text-xl font-bold col-span-2" variant={runs === 4 ? 'default' : 'default'} disabled={scoringControlsDisabled}>
                  {runs}
                </Button>
              ))}
               <AlertDialog onOpenChange={(isOpen) => !isOpen && setWicketTaker({ type: '', fielderId: null })}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="h-14 col-span-full text-lg" disabled={scoringControlsDisabled}>Wicket</Button>
                  </AlertDialogTrigger>
                  {renderWicketDialog()}
                </AlertDialog>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button onClick={() => handleEvent('wd', 0, 1)} className="h-10 col-span-2 text-sm" variant="outline" disabled={scoringControlsDisabled}>Wide</Button>
              <Button onClick={() => handleEvent('nb', 0, 1)} className="h-10 col-span-2 text-sm" variant="outline" disabled={scoringControlsDisabled}>No Ball</Button>
              <Button onClick={() => handleEvent('lb', 0, 1)} className="h-10 col-span-2 text-sm" variant="outline" disabled={scoringControlsDisabled}>Leg Bye</Button>
              <Button onClick={() => handleEvent('b', 0, 1)} className="h-10 col-span-2 text-sm" variant="outline" disabled={scoringControlsDisabled}>Bye</Button>
            </div>
             <Separator className="my-4"/>
              <div className="space-y-2">
                <Label htmlFor="ai-aggression">AI Aggression: {aiAggression.toFixed(1)}</Label>
                <Slider
                  id="ai-aggression"
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  value={[aiAggression]}
                  onValueChange={(value) => setAiAggression(value[0])}
                />
              </div>
              <Button onClick={handleSimulateOver} disabled={!canSimulate || isSimulating} className="w-full" size="lg">
                <Bot className={`mr-2 h-5 w-5 ${isSimulating ? 'animate-spin' : ''}`} />
                {isSimulating ? "Simulating..." : "Simulate Over"}
              </Button>
               <Dialog open={isFieldEditorOpen} onOpenChange={setIsFieldEditorOpen}>
                  <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" disabled={isSimulating}><Target className="mr-2"/> Field Editor</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[800px]">
                      <DialogHeader>
                          <DialogTitle>Field Placement Editor</DialogTitle>
                      </DialogHeader>
                       {/* Field Editor Component goes here */}
                       {/* Pass the handleSaveFieldPlacements function to FieldEditor */}
                       <FieldEditor match={match} setMatch={setMatch} onSave={handleSaveFieldPlacements}/>
                       {/* Remove DialogFooter from here as it's now in FieldEditor */}
                  </DialogContent>
              </Dialog>

              {/* Next Batsman Selection Dialog */}
              <Dialog open={showNextBatsmanSelector} onOpenChange={setShowNextBatsmanSelector}>
                  <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                          <DialogTitle>Select Next Batsman</DialogTitle>
                          <DialogDescription>
                              A wicket has fallen. Please select the next batsman to come in.
                          </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                          {battingTeam.players
                              .filter((p: Player) => 
                                  p.batting.status === 'not out' && 
                                  p.id !== currentInnings.batsmanNonStrike &&
                                  (!p.isSubstitute || p.isImpactPlayer)
                              )
                              .map((player: Player) => (
                                  <Button
                                      key={player.id}
                                      onClick={() => handleNextBatsmanSelection(player.id)}
                                      variant="outline"
                                      className="w-full justify-start h-auto p-3"
                                  >
                                      <div className="text-left">
                                          <div className="font-semibold">{player.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                              {player.role || 'Player'} • Rating: {player.rating || 'N/A'}
                                          </div>
                                      </div>
                                  </Button>
                              ))}
                      </div>
                  </DialogContent>
              </Dialog>

             <div className="flex gap-3">
                <Button onClick={handleUndo} className="w-full" variant="ghost" disabled={isSimulating}><Undo className="mr-2"/> Undo</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isSimulating}><Flame className="mr-2" /> End Match</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will end the match and clear all data permanently. You cannot undo this action.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={endMatch}>End Match</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
             </div>
               <div className="flex gap-3">
                  <Button onClick={() => setIsManagePlayersOpen(true)} className="w-full" variant="outline" disabled={isSimulating}><Users className="mr-2"/> Manage Players</Button>
              </div>
          </CardContent>
        </Card>
        
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card className="text-center shadow-none border-0 bg-muted/40">
          <CardHeader className="pb-3 pt-3">
              <CardTitle className="font-sans text-xl font-semibold">{battingTeam.name} vs {bowlingTeam.name}</CardTitle>
              <CardDescription>{match.status === 'superover' ? 'Super Over' : `${match.oversPerInnings} Over Match`}</CardDescription>
              {match.status === 'finished' && <p className="text-lg font-bold text-primary mt-2">{match.result}</p>}
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {match.status === 'finished' && (
              <div className="p-4 text-center bg-green-100 dark:bg-green-900 rounded-lg">
                <p className="font-bold text-xl text-green-700 dark:text-green-300">{match.result}</p>
              </div>
            )}
            <div className="flex justify-around items-center">
              <div className="text-left">
                <p className="text-lg font-semibold text-muted-foreground">{battingTeam.name}</p>
                <p className="font-bold text-6xl font-sans flex items-end">
                  <span>{currentInnings.score}</span>
                  <span className="text-4xl font-normal text-destructive/80">-{currentInnings.wickets}</span>
                </p>
                <p className="font-mono text-muted-foreground text-sm">({currentInnings.overs}.{currentInnings.ballsThisOver} Ovr)</p>
              </div>
              {match.currentInnings > 1 && (
                  <>
                    <ChevronsRight className="w-8 h-8 text-muted-foreground" />
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary"/>
                          <p className="text-base font-semibold text-muted-foreground">Target</p>
                        </div>
                        <p className="font-bold text-5xl font-sans text-primary">{match.innings[0].score + 1}</p>
                    </div>
                  </>
              )}
            </div>
            <Separator className="my-4"/>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-left text-sm">
                <motion.div 
                  className="bg-card p-3 rounded-md shadow-sm border border-border/50"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <p className="font-semibold truncate text-primary">{onStrikeBatsman?.name}{onStrikeBatsman?.id === currentInnings.batsmanOnStrike ? '*' : ''}</p>
                    </div>
                    <p className="text-muted-foreground text-xs">{onStrikeBatsman?.batting.runs} ({onStrikeBatsman?.batting.ballsFaced})</p>
                    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min((onStrikeBatsman?.batting.runs || 0) / 50 * 100, 100)}%` }}
                      ></div>
                    </div>
                </motion.div>
                <motion.div 
                  className="bg-card p-3 rounded-md shadow-sm border border-border/50"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                     <p className="font-semibold truncate">{nonStrikeBatsman?.name}</p>
                     <p className="text-muted-foreground text-xs">{nonStrikeBatsman?.batting.runs} ({nonStrikeBatsman?.batting.ballsFaced})</p>
                     <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground" 
                        style={{ width: `${Math.min((nonStrikeBatsman?.batting.runs || 0) / 50 * 100, 100)}%` }}
                      ></div>
                    </div>
                </motion.div>
                 <motion.div 
                  className="bg-card p-3 rounded-md shadow-sm border border-border/50"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <p className="font-semibold truncate text-primary">{currentBowler?.name || 'N/A'}</p>
                    </div>
                     {currentBowler ? 
                      <>
                        <p className="text-muted-foreground text-xs">{currentBowler?.bowling.wickets}/{currentBowler?.bowling.runsConceded} ({Math.floor(currentBowler?.bowling.ballsBowled/6)}.{currentBowler?.bowling.ballsBowled % 6})</p>
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-destructive" 
                            style={{ width: `${Math.min((currentBowler?.bowling.wickets || 0) / 3 * 100, 100)}%` }}
                          ></div>
                        </div>
                      </> : 
                      <p className="text-muted-foreground text-xs">Select bowler</p>}
                </motion.div>
                 <motion.div 
                  className="bg-card p-3 rounded-md shadow-sm border border-border/50"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                    <div className="flex items-center gap-1">
                      <PieChart className="w-4 h-4 text-muted-foreground" />
                      <p className="font-semibold">Partnership</p>
                    </div>
                    <p className="text-muted-foreground text-xs">{currentInnings.currentPartnership.runs} ({currentInnings.currentPartnership.balls})</p>
                    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[hsl(var(--chart-2))]" 
                        style={{ width: `${Math.min((currentInnings.currentPartnership.runs || 0) / 50 * 100, 100)}%` }}
                      ></div>
                    </div>
                </motion.div>
            </div>
             {match.status === 'finished' && (
              <div className="mt-6">
                <Button onClick={endMatch}>
                  <PlusCircle className="mr-2" />
                  Start New Match
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Scoreboard match={match} setMatch={setMatch} onBowlerChange={handleBowlerChange} isSimulating={isSimulating} />
            <CommentaryGenerator match={match} commentary={commentary} setCommentary={setCommentary} onGenerateCommentary={() => handleGenerateCommentary(match, match.innings[match.currentInnings - 1].timeline[match.innings[match.currentInnings - 1].timeline.length - 1])} />
        </div>
      </div>
      <ManagePlayersDialog
        isOpen={isManagePlayersOpen}
        onOpenChange={setIsManagePlayersOpen}
        match={match}
        setMatch={setMatch}
       />
    </div>
  )
}
