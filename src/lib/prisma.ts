import { PrismaClient } from '@prisma/client';

    // Declare a global variable to hold the Prisma client instance
    // This prevents creating multiple instances in development due to hot reloading
    declare global {
      // eslint-disable-next-line no-var
      var prisma: PrismaClient | undefined;
    }

    // Initialize Prisma Client
    // Use the global instance if it exists, otherwise create a new one
    const prisma = global.prisma || new PrismaClient();

    // In development, assign the new instance to the global variable
    if (process.env.NODE_ENV === 'development') {
      global.prisma = prisma;
    }

    export default prisma;
