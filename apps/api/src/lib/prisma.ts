// Default import for CJS/ESM interop — @prisma/client uses a CJS spread
// pattern that prevents Node.js from detecting named exports in ESM.
import Prisma from '@prisma/client';
const { PrismaClient } = Prisma;

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
