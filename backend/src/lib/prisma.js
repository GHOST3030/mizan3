import pkg from '@prisma/client';
const { PrismaClient } = pkg;

export const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 10000,
    timeout: 30000,
  },
});

export const isPrismaAvailable = () => {
  try {
    new URL(process.env.DATABASE_URL);
    return process.env.DATABASE_URL.startsWith('postgresql://');
  } catch {
    return false;
  }
};