import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('GET /api/tournaments - Starting to fetch tournaments...');
    
    const tournaments = await prisma.tournament.findMany({
      include: {
        teams: {
          include: {
            team: true,
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        matches: true, // Don't include team relations to avoid null issues
      },
      orderBy: {
        createdDate: 'desc',
      },
    });

    console.log(`Found ${tournaments.length} tournaments in database`);

    // Get all teams for mapping
    const allTeams = await prisma.team.findMany();
    const teamMap = new Map(allTeams.map(team => [team.id, team]));
    
    console.log(`Found ${allTeams.length} teams in database for mapping`);

    // Transform the data to match the expected format
    const transformedTournaments = tournaments.map(tournament => {
      console.log('Processing tournament:', tournament.name, 'with', tournament.matches.length, 'matches');
      
      return {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        numberOfTeams: tournament.numberOfTeams,
        status: tournament.status as 'draft' | 'active' | 'completed',
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        createdDate: tournament.createdDate,
        updatedDate: tournament.updatedDate,
        settings: {
          tournamentType: tournament.tournamentType as any,
          oversPerInnings: tournament.oversPerInnings,
          matchType: tournament.matchType as any,
          groupStageRounds: tournament.groupStageRounds,
          topTeamsAdvance: tournament.topTeamsAdvance,
        },
        teams: tournament.teams.map(tt => ({
          id: tt.team.id,
          name: tt.team.name,
          logo: tt.team.logo,
          homeGround: tt.team.homeGround,
          players: tt.players.map(tp => tp.player.id),
          points: tt.points,
          matchesPlayed: tt.matchesPlayed,
          matchesWon: tt.matchesWon,
          matchesLost: tt.matchesLost,
          matchesTied: tt.matchesTied,
          netRunRate: tt.netRunRate,
          runsScored: tt.runsScored,
          runsConceded: tt.runsConceded,
          oversFaced: tt.oversFaced,
          oversBowled: tt.oversBowled,
        })),
        matches: tournament.matches.map(match => {
          const team1 = match.team1Id ? teamMap.get(match.team1Id) : null;
          const team2 = match.team2Id ? teamMap.get(match.team2Id) : null;
          
          console.log('Processing match:', match.matchNumber, 'team1:', team1?.name || 'TBD', 'team2:', team2?.name || 'TBD');
          
          return {
            id: match.id,
            tournamentId: match.tournamentId,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            team1Name: team1?.name || 'TBD',
            team2Name: team2?.name || 'TBD',
            matchNumber: match.matchNumber,
            round: match.round as any,
            status: match.status as any,
            venue: match.venue,
            result: match.result,
            winnerTeamId: match.winnerTeamId,
            loserTeamId: match.loserTeamId,
            matchData: match.matchData,
            scheduledDate: match.scheduledDate,
            completedDate: match.completedDate,
          };
        }),
        awards: tournament.playerOfSeriesId ? {
          playerOfSeriesId: tournament.playerOfSeriesId,
          playerOfSeriesName: tournament.playerOfSeriesName,
        } : undefined,
      };
    });

    console.log('Successfully transformed tournaments, returning response...');
    return NextResponse.json({ tournaments: transformedTournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch tournaments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      numberOfTeams,
      teams,
      matches,
      settings,
    } = body;

    console.log('Creating tournament with data:', { name, numberOfTeams, teamsCount: teams.length, matchesCount: matches.length });

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        numberOfTeams,
        status: 'draft',
        tournamentType: settings.tournamentType,
        oversPerInnings: settings.oversPerInnings,
        matchType: settings.matchType,
        groupStageRounds: settings.groupStageRounds,
        topTeamsAdvance: settings.topTeamsAdvance,
      },
    });

    console.log('Tournament created with ID:', tournament.id);

    // Create a mapping from frontend team IDs to database team IDs
    const teamIdMapping = new Map<number, number>();

    // Create teams and their players
    for (const teamData of teams) {
      try {
        // Create or update team
        let team = await prisma.team.findFirst({
          where: { name: teamData.name },
        });

        if (!team) {
          team = await prisma.team.create({
            data: {
              name: teamData.name,
              logo: teamData.logo,
              homeGround: teamData.homeGround,
            },
          });
          console.log('Created team:', team.name, 'with ID:', team.id);
        } else {
          // Update existing team with logo and home ground if not set
          team = await prisma.team.update({
            where: { id: team.id },
            data: {
              logo: teamData.logo || team.logo,
              homeGround: teamData.homeGround || team.homeGround,
            },
          });
          console.log('Updated team:', team.name, 'with ID:', team.id);
        }

        // Store the mapping from frontend ID to database ID
        teamIdMapping.set(teamData.id, team.id);

        // Create tournament team
        const tournamentTeam = await prisma.tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            teamId: team.id,
            points: teamData.points || 0,
            matchesPlayed: teamData.matchesPlayed || 0,
            matchesWon: teamData.matchesWon || 0,
            matchesLost: teamData.matchesLost || 0,
            matchesTied: teamData.matchesTied || 0,
            netRunRate: teamData.netRunRate || 0,
            runsScored: teamData.runsScored || 0,
            runsConceded: teamData.runsConceded || 0,
            oversFaced: teamData.oversFaced || 0,
            oversBowled: teamData.oversBowled || 0,
          },
        });

        console.log('Created tournament team:', tournamentTeam.id);

        // Create tournament team players
        for (const playerId of teamData.players) {
          await prisma.tournamentTeamPlayer.create({
            data: {
              tournamentTeamId: tournamentTeam.id,
              playerId,
            },
          });
        }
        console.log('Created', teamData.players.length, 'tournament team players');
      } catch (teamError) {
        console.error('Error creating team:', teamData.name, teamError);
        throw new Error(`Failed to create team: ${teamData.name}`);
      }
    }

    // Create matches
    for (const matchData of matches) {
      try {
        console.log('Processing match:', matchData.matchNumber, 'round:', matchData.round, 'teams:', matchData.team1Name, 'vs', matchData.team2Name);
        
        // For TBD matches, we need to handle the case where team IDs are 0
        let team1Id = null;
        let team2Id = null;

        // If this is not a TBD match, map the frontend team IDs to database team IDs
        if (matchData.team1Name !== 'TBD' && matchData.team2Name !== 'TBD') {
          team1Id = teamIdMapping.get(matchData.team1Id);
          team2Id = teamIdMapping.get(matchData.team2Id);
          
          console.log('Mapping team IDs:', { 
            frontend: { team1: matchData.team1Id, team2: matchData.team2Id },
            database: { team1: team1Id, team2: team2Id }
          });
          
          if (!team1Id || !team2Id) {
            throw new Error(`Could not find team IDs for match ${matchData.matchNumber}`);
          }
        } else {
          console.log('TBD match - setting team IDs to null');
        }

        await prisma.tournamentMatch.create({
          data: {
            tournament: {
              connect: { id: tournament.id }
            },
            team1: team1Id ? {
              connect: { id: team1Id }
            } : undefined,
            team2: team2Id ? {
              connect: { id: team2Id }
            } : undefined,
            matchNumber: matchData.matchNumber,
            round: matchData.round,
            status: matchData.status,
            venue: matchData.venue,
            result: matchData.result,
            winnerTeamId: matchData.winnerTeamId,
            loserTeamId: matchData.loserTeamId,
            matchData: matchData.matchData,
            scheduledDate: matchData.scheduledDate,
            completedDate: matchData.completedDate,
          },
        });
        console.log('Created match:', matchData.matchNumber, 'for round:', matchData.round);
      } catch (matchError) {
        console.error('Error creating match:', matchData.matchNumber, matchError);
        throw new Error(`Failed to create match: ${matchData.matchNumber}`);
      }
    }

    console.log('Tournament creation completed successfully');
    return NextResponse.json({ 
      message: 'Tournament created successfully',
      tournamentId: tournament.id 
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
