import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { createPrismaAdapter } from '../src/config/pg-adapter.js';
import { seedDemoData } from './seed-demo.js';

loadEnv({ path: resolve(import.meta.dirname, '../.env') });
loadEnv({
  path: resolve(process.env.LOCALAPPDATA ?? '', 'AgriConnect', 'backend.env'),
});

function requiredEnv(name: string, fallbackName?: string): string {
  const value =
    process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(
      `${name}${fallbackName ? ` (or ${fallbackName})` : ''} is required to seed.`,
    );
  }
  return value;
}

function seedDemoEnabled(): boolean {
  const raw = process.env.SEED_DEMO;
  if (raw === undefined || raw === '') return true;
  return raw !== 'false' && raw !== '0';
}

const databaseUrl = requiredEnv('DATABASE_URL', 'DIRECT_URL');
const email = requiredEnv('ADMIN_SEED_EMAIL').trim().toLowerCase();
const password = requiredEnv('ADMIN_SEED_PASSWORD');

if (password.length < 12) {
  throw new Error('ADMIN_SEED_PASSWORD must contain at least 12 characters.');
}

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(databaseUrl),
});

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name: 'AgriConnect Administrator',
      role: Role.ADMIN,
      verified: true,
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
      verified: true,
      isSuspended: false,
      deletedAt: null,
    },
  });

  console.info(`Admin seed ensured for ${email}.`);

  if (seedDemoEnabled()) {
    await seedDemoData(prisma);
  } else {
    console.info('SEED_DEMO=false — skipped demo marketplace data.');
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
