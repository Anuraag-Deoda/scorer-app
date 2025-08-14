import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create Teams
  const rupeshGiants = await prisma.team.create({
    data: {
      name: 'Rupesh Giants',
      players: {
        create: [
          { name: 'Siddharth', rating: 85 },
          { name: 'Rupesh', rating: 90 },
          { name: 'Prashant', rating: 92 },
          { name: 'Sushant', rating: 88 },
          { name: 'Sujit', rating: 82 },
          { name: 'Sajeesh', rating: 78 },
          { name: 'Vicky', rating: 75 },
          { name: 'Vivek', rating: 76 },
          { name: 'Pratik', rating: 79 },
          { name: 'Ashish', rating: 77 },
          { name: 'Yogesh', rating: 74 },
        ],
      },
    },
  });

  const prashantSuperKings = await prisma.team.create({
    data: {
      name: 'Prashant Super Kings',
      players: {
        create: [
          { name: 'Anuraag', rating: 89 },
          { name: 'Harshal', rating: 87 },
          { name: 'Amaan', rating: 84 },
          { name: 'Siddhu', rating: 81 },
          { name: 'Jay', rating: 80 },
          { name: 'Sani', rating: 79 },
          { name: 'Ruzda', rating: 77 },
          { name: 'Aashif', rating: 76 },
          { name: 'Kunal', rating: 75 },
          { name: 'Mitesh', rating: 73 },
          { name: 'Sandesh', rating: 72 },
        ],
      },
    },
  });

  console.log({ rupeshGiants, prashantSuperKings });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
