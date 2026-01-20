import { PrismaClient } from '../generated/client';

// Singleton pattern for Prisma Client
let prisma: PrismaClient;

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
        log: ['error', 'warn'],
    });
} else {
    // In development, use global to prevent multiple instances
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            log: ['query', 'error', 'warn'],
        });
    }
    prisma = global.prisma;
}

export default prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
