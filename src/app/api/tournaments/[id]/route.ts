import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const { matches, teams, status, awards } = body;

    // Update tournament status if provided
    if (status) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { 
          status,
          updatedDate: new Date(),
          ...(awards?.playerOfSeriesId && {
            playerOfSeriesId: awards.playerOfSeriesId,
            playerOfSeriesName: awards.playerOfSeriesName,
          }),
        },
      });
    }

    // Update teams if provided
    if (teams) {
      for (const teamData of teams) {
        await prisma.tournamentTeam.updateMany({
          where: {
            tournamentId,
            teamId: teamData.id,
          },
          data: {
            points: teamData.points,
            matchesPlayed: teamData.matchesPlayed,
            matchesWon: teamData.matchesWon,
            matchesLost: teamData.matchesLost,
            matchesTied: teamData.matchesTied,
            netRunRate: teamData.netRunRate,
            runsScored: teamData.runsScored,
            runsConceded: teamData.runsConceded,
            oversFaced: teamData.oversFaced,
            oversBowled: teamData.oversBowled,
          },
        });
      }
    }

    // Update matches if provided
    if (matches) {
      for (const matchData of matches) {
        await prisma.tournamentMatch.update({
          where: { id: matchData.id },
          data: {
            status: matchData.status,
            result: matchData.result,
            winnerTeamId: matchData.winnerTeamId,
            loserTeamId: matchData.loserTeamId,
            matchData: matchData.matchData,
            completedDate: matchData.completedDate,
          },
        });
      }
    }

    return NextResponse.json({ message: 'Tournament updated successfully' });
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Delete tournament (cascades to teams and matches)
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    );
  }
}
