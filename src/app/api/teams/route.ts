import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // data: { teams: [{ name: string }] }
    if (!Array.isArray(data.teams)) {
      return NextResponse.json({ error: 'Invalid teams data' }, { status: 400 });
    }

    // Create teams in DB
    const createdTeams = await prisma.team.createMany({
      data: data.teams.map((t: { name: string }) => ({
        name: t.name,
      })),
    });

    // Return all teams (including those just created)
    const allTeams = await prisma.team.findMany();

    return NextResponse.json({ teams: allTeams });
  } catch (error) {
    console.error('API /api/teams error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const teams = await prisma.team.findMany();
    return NextResponse.json({ teams });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
