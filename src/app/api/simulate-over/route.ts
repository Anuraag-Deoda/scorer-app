import { NextRequest, NextResponse } from 'next/server';
import { SimulationEngine } from "@/simulation/engine";
import { RuleBasedStrategy } from "@/simulation/strategies/rule-based-strategy";
import { TemplateStrategy } from "@/simulation/strategies/template-strategy";
import { AiStrategy } from "@/simulation/strategies/ai-strategy";
import { StatisticalStrategy } from "@/simulation/strategies/statistical-strategy";
import { CacheStrategy } from "@/simulation/strategies/cache-strategy";
import { SpecialPlayerStrategy } from '@/simulation/strategies/special-player-strategy';
import { analyzeContext } from "@/simulation/context-analyzer";
import { Match, Team } from '@/types';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { match, aiAggression } = await req.json();

    const currentInnings = match.innings[match.currentInnings - 1];
    const battingTeam = currentInnings.battingTeam;
    const bowlingTeam = currentInnings.bowlingTeam;
    const onStrikeBatsman = battingTeam.players.find((p: any) => p.id === currentInnings.batsmanOnStrike);
    const nonStrikeBatsman = battingTeam.players.find((p: any) => p.id === currentInnings.batsmanNonStrike);
    const currentBowler = bowlingTeam.players.find((p: any) => p.id === currentInnings.currentBowler);

    const simulationEngine = new SimulationEngine([
      new SpecialPlayerStrategy(),
      new CacheStrategy(),
      new AiStrategy(7, aiAggression),
      new StatisticalStrategy(),
      new TemplateStrategy(),
      new RuleBasedStrategy(),
    ]);

    const mockMatchForContext = {
      ...match,
      id: 0,
      date: new Date(),
      team1Id: match.teams[0].id,
      team2Id: match.teams[1].id,
      tossWinnerId: match.teams.find((t: Team) => t.name === match.toss.winner)?.id ?? 0,
      innings: match.innings.map((inning: any) => ({
        id: 0,
        matchId: 0,
        battingTeamId: inning.battingTeam.id,
        bowlingTeamId: inning.bowlingTeam.id,
        score: inning.score,
        wickets: inning.wickets,
        overs: inning.overs,
        balls: [],
      })),
    };

    const mockCurrentInningsForContext = {
      id: 0,
      matchId: 0,
      battingTeamId: currentInnings.battingTeam.id,
      bowlingTeamId: currentInnings.bowlingTeam.id,
      score: currentInnings.score,
      wickets: currentInnings.wickets,
      overs: currentInnings.overs,
      balls: [],
    };

    const context = analyzeContext(
      mockMatchForContext as any,
      mockCurrentInningsForContext as any,
      currentInnings.battingTeam as any,
      currentInnings.bowlingTeam as any,
      onStrikeBatsman as any,
      nonStrikeBatsman as any,
      currentBowler as any
    );

    const result = await simulationEngine.simulateOver(context);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error simulating over:', error);
    return NextResponse.json({ error: 'Failed to simulate over', details: error.message }, { status: 500 });
  }
}
