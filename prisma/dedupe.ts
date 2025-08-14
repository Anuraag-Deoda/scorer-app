const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deduplicatePlayers() {
  const players = await prisma.player.findMany();

  const playersByName = new Map<string, (typeof players)[number][]>();

  for (const player of players) {
    const name = player.name.toLowerCase();
    if (!playersByName.has(name)) {
      playersByName.set(name, []);
    }
    playersByName.get(name)!.push(player);
  }

  const idsToDelete: number[] = [];

  for (const [name, playerGroup] of playersByName.entries()) {
    if (playerGroup.length > 1) {
      // Keep the first one, delete the rest
      const playersToDelete = playerGroup.slice(1);
      idsToDelete.push(...playersToDelete.map(p => p.id));
    }
  }

  if (idsToDelete.length > 0) {
    console.log(`Found ${idsToDelete.length} duplicate players to delete.`);
    
    // Before deleting, we need to handle related records in other tables.
    // Let's find all related records and update them to point to the player we're keeping.
    for (const [name, playerGroup] of playersByName.entries()) {
        if (playerGroup.length > 1) {
            const playerToKeep = playerGroup[0];
            const playersToDelete = playerGroup.slice(1);
            const playerIdsToDelete = playersToDelete.map(p => p.id);

            // Update TeamPlayer
            await prisma.teamPlayer.updateMany({
                where: { playerId: { in: playerIdsToDelete } },
                data: { playerId: playerToKeep.id },
            });

            // Update PlayerStats
            await prisma.playerStats.updateMany({
                where: { playerId: { in: playerIdsToDelete } },
                data: { playerId: playerToKeep.id },
            });

            // Update Ball (Batsman)
            await prisma.ball.updateMany({
                where: { batsmanId: { in: playerIdsToDelete } },
                data: { batsmanId: playerToKeep.id },
            });

            // Update Ball (Bowler)
            await prisma.ball.updateMany({
                where: { bowlerId: { in: playerIdsToDelete } },
                data: { bowlerId: playerToKeep.id },
            });

            // Update Ball (Fielder)
            await prisma.ball.updateMany({
                where: { fielderId: { in: playerIdsToDelete } },
                data: { fielderId: playerToKeep.id },
            });
        }
    }
    
    await prisma.player.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });
    console.log('Successfully deleted duplicate players.');
  } else {
    console.log('No duplicate players found.');
  }
}

deduplicatePlayers()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
