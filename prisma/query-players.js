const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const allPlayers = await prisma.player.findMany();
    const players = allPlayers.filter(p => 
      p.name.toLowerCase() === 'anuraag' ||
      p.name.toLowerCase() === 'prashant' ||
      p.name.toLowerCase() === 'harshal'
    );
    console.log('Found players:', players);
  } catch (error) {
    console.error('Error querying players:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
