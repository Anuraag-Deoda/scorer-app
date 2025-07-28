import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // data: { players: [{ name: string, rating?: number }] }
    if (!Array.isArray(data.players)) {
      return NextResponse.json({ error: 'Invalid players data' }, { status: 400 });
    }

    // Create players in DB
    const createdPlayers = await prisma.player.createMany({
      data: data.players.map((p: { name: string; rating?: number }) => ({
        name: p.name,
        rating: p.rating ?? null,
      })),
    });

    // Return all players (including those just created)
    const allPlayers = await prisma.player.findMany();

    return NextResponse.json({ players: allPlayers });
  } catch (error) {
    console.error('API /api/players error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const players = await prisma.player.findMany();
    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
