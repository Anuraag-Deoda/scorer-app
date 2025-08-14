import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const anuraag = await prisma.player.findMany({ where: { name: { equals: 'Anuraag' } } });
    const prashant = await prisma.player.findMany({ where: { name: { equals: 'Prashant' } } });
    const harshal = await prisma.player.findMany({ where: { name: { equals: 'Harshal' } } });

    return NextResponse.json({
      anuraagIds: anuraag.map(p => p.id),
      prashantIds: prashant.map(p => p.id),
      harshalIds: harshal.map(p => p.id),
    });
  } catch (error) {
    console.error('Error fetching special player IDs:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
