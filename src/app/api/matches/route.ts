import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // data: { match: { ... }, teamPlayers: [...], playerStats: [...] }
    const { match, teamPlayers, playerStats } = data;

    // Create the match
    const createdMatch = await prisma.match.create({
      data: {
        date: match.date ? new Date(match.date) : undefined,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        result: match.result,
        status: match.status,
        oversPerInnings: match.oversPerInnings,
        tossWinnerId: match.tossWinnerId,
        tossDecision: match.tossDecision,
        teamPlayers: {
          create: teamPlayers,
        },
        playerStats: {
          create: playerStats,
        },
      },
      include: {
        teamPlayers: true,
        playerStats: true,
      },
    });

    return NextResponse.json({ match: createdMatch });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return all matches with teams and stats
    const matches = await prisma.match.findMany({
      include: {
        team1: true,
        team2: true,
        teamPlayers: { include: { player: true, team: true } },
        playerStats: { include: { player: true, team: true } },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
