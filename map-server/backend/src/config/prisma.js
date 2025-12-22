// map-server/backend/src/config/prisma.js

import { PrismaClient } from '@prisma/client';

// Tạo instance Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting Prisma Client...');
  await prisma.$disconnect();
});

export default prisma;
