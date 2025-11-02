#!/usr/bin/env node
import 'dotenv/config';
import prisma from './src/config/prisma.js';

async function testPrismaConnection() {
  try {
    console.log('🔍 Testing Prisma connection...\n');
    
    // Test 1: Count users
    const userCount = await prisma.user.count();
    console.log(`✅ Users in database: ${userCount}`);
    
    // Test 2: Count pixels
    const pixelCount = await prisma.pixel.count();
    console.log(`✅ Pixels in database: ${pixelCount}`);
    
    // Test 3: Count sessions
    const sessionCount = await prisma.session.count();
    console.log(`✅ Sessions in database: ${sessionCount}`);
    
    // Test 4: Find a sample user (if exists)
    const sampleUser = await prisma.user.findFirst({
      take: 1,
      include: {
        pixels: {
          take: 5
        }
      }
    });
    
    if (sampleUser) {
      console.log(`\n📊 Sample User:`);
      console.log(`   Username: ${sampleUser.username}`);
      console.log(`   Email: ${sampleUser.email}`);
      console.log(`   Pixels drawn: ${sampleUser.pixels.length}`);
    }
    
    console.log('\n✅ Prisma connection test successful!');
    
  } catch (error) {
    console.error('❌ Prisma connection test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaConnection();
