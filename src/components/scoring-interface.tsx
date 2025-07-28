"use client"

import { useState, useEffect } from "react";
import type { Match, BallEvent, Team, BallDetails, GenerateMatchCommentaryInput } from "@/types"
import { processBall, undoLastBall } from "@/lib/cricket-logic"
import { simulateOver } from "@/ai/flows/simulate-over";
import { generateMatchCommentary } from "@/ai/flows/generate-match-commentary";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Scoreboard from "./scoreboard"
import { Separator } from "./ui/separator"
import CommentaryGenerator from "./commentary-generator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Undo, Flame, PlusCircle, Users, Bot, ChevronsRight, Target } from "lucide-react"
import ManagePlayersDialog from "./manage-players-dialog";
import { Label } from "./ui/label";

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

  const getMatchSummaryForAI = (matchState: Match): string => {
    const innings = matchState.innings[matchState.currentInnings - 1];
    const onStrike = innings.battingTeam.players.find(p => p.id === innings.batsmanOnStrike);
    const nonStrike = innings.battingTeam.players.find(p => p.id === innings.batsmanNonStrike);
    const bowler = innings.bowlingTeam.players.find(p => p.id === innings.currentBowler);
    
    return `
      Match: ${innings.battingTeam.name} vs ${innings.bowlingTeam.name}.
      Innings: ${matchState.currentInnings}.
      Score: ${innings.score}/${innings.wickets} in ${innings.overs}.${innings.ballsThisOver} overs.
      Target: ${matchState.currentInnings === 2 ? matchState.innings[0].score + 1 : 'N/A'}.
      On strike: ${onStrike?.name} (${onStrike?.batting.runs} runs).
      Non-striker: ${nonStrike?.name} (${nonStrike?.batting.runs} runs).
      Bowler: ${bowler?.name}.
      Last ball: ${innings.timeline.length > 0 ? innings.timeline[innings.timeline.length - 1].display : 'N/A'}.
    `;
  }
  
  const handleGenerateCommentary = async (matchStateForCommentary: Match | null, ballNumber?: string) => {
    if (!matchStateForCommentary) return;
      try {
        const result = await generateMatchCommentary({
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
    if(match.status === 'finished') {
        toast({ variant: "destructive", title: "Cannot Simulate", description: "Match has already finished." });
        return;
    }
     if (currentInnings.currentBowler === -1) {
        toast({ variant: "destructive", title: "Cannot Simulate", description: "Please select a bowler for the over." });
        return;
    }
    setIsSimulating(true);

    try {
        const bowlingTeamPlayerIds = bowlingTeam.players
            .filter(p => !p.isSubstitute || p.isImpactPlayer)
            .map(p => p.id)
            .join(', ');

        const result = await simulateOver({
            matchContext: getMatchSummaryForAI(match),
            bowlingTeamPlayerIds
        });
        
        let matchState: Match | null = match;
        
        for (const ball of result.over) {
            if (!matchState || matchState.status === 'finished') break;

            await new Promise(resolve => setTimeout(resolve, 800));
            
            matchState = processBall(matchState, { ...ball });
            
            if(matchState) {
                const isStillInSameInnings = matchState.currentInnings === match.currentInnings;

                setMatch(matchState);

                if (matchState.status !== 'finished' && isStillInSameInnings) {
                    const updatedInnings = matchState.innings[matchState.currentInnings - 1];
                    const ballNum = `${updatedInnings.overs}.${updatedInnings.ballsThisOver}`;
                    await handleGenerateCommentary(matchState, ballNum);
                }
            }
        }

        toast({ title: "Over Simulated", description: "AI has completed the over." });
    } catch (error) {
        console.error("Failed to simulate over", error);
        toast({
            variant: "destructive",
            title: "AI Error",
            description: "Could not simulate the over.",
        });
    } finally {
        setIsSimulating(false);
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
                    <option>Select Fielder</option>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="font-headline text-center text-xl">Scoring Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <Button key={runs} onClick={() => handleEvent('run', runs)} className="h-16 text-2xl font-bold" variant={runs === 4 ? 'primary' : runs === 6 ? 'default' : 'secondary'} disabled={scoringControlsDisabled}>
                  {runs}
                </Button>
              ))}
               <AlertDialog onOpenChange={(isOpen) => !isOpen && setWicketTaker({ type: '', fielderId: null })}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="h-16 col-span-2 text-lg" disabled={scoringControlsDisabled}>Wicket</Button>
                  </AlertDialogTrigger>
                  {renderWicketDialog()}
                </AlertDialog>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button onClick={() => handleEvent('wd', 0, 1)} className="h-12 col-span-2" variant="outline" disabled={scoringControlsDisabled}>Wide</Button>
              <Button onClick={() => handleEvent('nb', 0, 1)} className="h-12 col-span-2" variant="outline" disabled={scoringControlsDisabled}>No Ball</Button>
              <Button onClick={() => handleEvent('lb', 0, 1)} className="h-12 col-span-2" variant="outline" disabled={scoringControlsDisabled}>Leg Bye</Button>
              <Button onClick={() => handleEvent('b', 0, 1)} className="h-12 col-span-2" variant="outline" disabled={scoringControlsDisabled}>Bye</Button>
            </div>
             <Separator />
              <Button onClick={handleSimulateOver} disabled={!canSimulate || isSimulating} className="w-full" size="lg">
                <Bot className={`mr-2 h-5 w-5 ${isSimulating ? 'animate-spin' : ''}`} />
                {isSimulating ? "Simulating..." : "Simulate Over"}
              </Button>
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
        <Card className="text-center shadow-lg bg-card/70">
          <CardHeader className="pb-4 pt-4">
              <CardTitle className="font-headline text-2xl">{battingTeam.name} vs {bowlingTeam.name}</CardTitle>
              <CardDescription>{match.oversPerInnings} Over Match</CardDescription>
              {match.status === 'finished' && <p className="text-lg font-bold text-primary mt-2">{match.result}</p>}
          </CardHeader>
          <CardContent>
            <div className="flex justify-around items-center">
              <div className="text-left">
                <p className="text-lg font-semibold">{battingTeam.name}</p>
                <p className="font-bold text-5xl font-headline flex items-end">
                  <span>{currentInnings.score}</span>
                  <span className="text-3xl font-normal text-destructive/80">-{currentInnings.wickets}</span>
                </p>
                <p className="font-mono text-muted-foreground">({currentInnings.overs}.{currentInnings.ballsThisOver} Ovr)</p>
              </div>
              {match.currentInnings > 1 && (
                  <>
                    <ChevronsRight className="w-8 h-8 text-muted-foreground" />
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                          <Target className="w-6 h-6 text-primary"/>
                          <p className="text-lg font-semibold">Target</p>
                        </div>
                        <p className="font-bold text-5xl font-headline text-primary">{match.innings[0].score + 1}</p>
                    </div>
                  </>
              )}
            </div>
            <Separator className="my-4"/>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-left text-sm">
                <div className="bg-muted/50 p-2 rounded-md">
                    <p className="font-bold truncate">{onStrikeBatsman?.name}*</p>
                    <p className="text-muted-foreground">{onStrikeBatsman?.batting.runs} ({onStrikeBatsman?.batting.ballsFaced})</p>
                </div>
                <div className="bg-muted/50 p-2 rounded-md">
                     <p className="font-bold truncate">{nonStrikeBatsman?.name}</p>
                     <p className="text-muted-foreground">{nonStrikeBatsman?.batting.runs} ({nonStrikeBatsman?.batting.ballsFaced})</p>
                </div>
                 <div className="bg-muted/50 p-2 rounded-md">
                    <p className="font-bold truncate">{currentBowler?.name || 'N/A'}</p>
                     {currentBowler ? <p className="text-muted-foreground">{currentBowler?.bowling.wickets}/{currentBowler?.bowling.runsConceded} ({Math.floor(currentBowler?.bowling.ballsBowled/6)}.{currentBowler?.bowling.ballsBowled % 6})</p> : <p className="text-muted-foreground">Overs: {currentInnings.overs}</p>}
                </div>
                 <div className="bg-muted/50 p-2 rounded-md">
                    <p className="font-bold">Partnership</p>
                    <p className="text-muted-foreground">{currentInnings.currentPartnership.runs} ({currentInnings.currentPartnership.balls})</p>
                </div>
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
            <CommentaryGenerator match={match} commentary={commentary} setCommentary={setCommentary} onGenerateCommentary={() => handleGenerateCommentary(match)} />
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
