// Fills the development database with a household to try the Calendar with:
//   npm run seed:demo -- you@example.com            you are the admin
//   npm run seed:demo -- you@example.com --member   you are a member, so you can suggest
//   npm run seed:demo -- your_username --mine       adds people and meals to the household you run
//   npm run seed:demo -- --remove                   takes it all out again
import { prisma } from '../src/config/db.js';
import { addDemoToMyHousehold, removeDemoHousehold, seedDemoHousehold } from './demoHouseholdSeed.js';

if (process.env.NODE_ENV === 'production') {
  console.error('This adds made-up data, so it does not run in production.');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith('--'));

try {
  if (args.includes('--remove')) {
    await removeDemoHousehold(prisma);
    console.log('Demo people and meals removed.');
  } else if (!email) {
    console.error('Usage: npm run seed:demo -- you@example.com [--member | --mine]   or   npm run seed:demo -- --remove');
    process.exitCode = 1;
  } else if (args.includes('--mine')) {
    const { name, today } = await addDemoToMyHousehold(prisma, email);
    console.log(`Added 3 demo people and meals to ${name}. ${today} has a timer running.`);
  } else {
    const role = args.includes('--member') ? 'member' : 'admin';
    const { today } = await seedDemoHousehold(prisma, email, role);
    console.log(`Demo household ready. You are the ${role}. ${today} has a timer running.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
