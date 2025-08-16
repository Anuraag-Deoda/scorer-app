import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create players
  const players = [
    { name: "Prashant" },
    { name: "Ashish" },
    { name: "Sonal J" },
    { name: "Vicky" },
    { name: "Jay" },
    { name: "Amaan" },
    { name: "Anish" },
    { name: "Sajeesh" },
    { name: "Rohan" },
    { name: "Vivek" },
    { name: "Sujit" },
    { name: "Kunal" },
    { name: "Kashmira" },
    { name: "Ismail" },
    { name: "Anuraag" },
    { name: "Divyesh" },
    { name: "Ruzda" },
    { name: "Harshal" },
    { name: "Riyaz" },
    { name: "Suyog" },
    { name: "Sandesh" },
    { name: "Roshan" },
    { name: "Siddhu" },
    { name: "Vipul" },
    { name: "Yash" },
    { name: "IT Prathamesh" },
    { name: "Rupesh" },
    { name: "Manoj" },
    { name: "Mitesh" },
    { name: "Pratik" },
    { name: "Prathamesh D" },
    { name: "Sani" },
    { name: "Aasif" },
    { name: "Ashok" },
    { name: "Sushant" },
    { name: "Venu" },
    { name: "Ishant" },
    { name: "Vishal M" },
    { name: "Saurabh" },
    { name: "Akshata" },
    { name: "Yogesh" },
    { name: "aby thomas" },
    { name: "nitin s" },
    { name: "imran k" },
    { name: "amit" },
    { name: "apeksha" },
    { name: "pranali" },
    { name: "mayuresh" },
    { name: "mahesh" },
    { name: "sagar" },
    { name: "rohit" },
    { name: "rahul b" },
    { name: "shivam" },
    { name: "Wasique Shaikh" },
    { name: "Sonal Sheth" },
    { name: "ravindra" },
    { name: "rohit d" },
    { name: "Omkar" },
    { name: "Hricha" },
    { name: "Samyak" },
    { name: "Punit" },
    { name: "Rahul A" },
    { name: "Tausif" },
    { name: "Rajesh" },
    { name: "Priyanka" }
  ];

  console.log('Creating players...');
  try {
    await prisma.player.createMany({
      data: players,
      skipDuplicates: true,
    });
  } catch (error) {
    console.log('Players already exist, skipping...');
  }

  // Create some sample teams
  const teams = [
    {
      name: "Mumbai Indians",
      homeGround: "Wankhede Stadium",
      logo: null, // Will be added later if needed
    },
    {
      name: "Chennai Super Kings",
      homeGround: "M. A. Chidambaram Stadium",
      logo: null,
    },
    {
      name: "Royal Challengers Bangalore",
      homeGround: "M. Chinnaswamy Stadium",
      logo: null,
    },
    {
      name: "Kolkata Knight Riders",
      homeGround: "Eden Gardens",
      logo: null,
    },
  ];

  console.log('Creating teams...');
  try {
    await prisma.team.createMany({
      data: teams,
      skipDuplicates: true,
    });
  } catch (error) {
    console.log('Teams already exist, skipping...');
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
