const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    include: {
      matches: true,
    },
  });
  if (tournaments.length === 0) {
    console.log('No tournaments found.');
  } else {
    console.log(JSON.stringify(tournaments, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
