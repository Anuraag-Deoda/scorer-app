const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const players = await prisma.player.findMany();
    console.log('Players:', players);
    const teams = await prisma.team.findMany();
    console.log('Teams:', teams);
  } catch (error) {
    console.error('Prisma test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
