import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check if MongoDB is running as replica set (required for transactions)
    mongoose.connection.once('open', async () => {
      try {
        const admin = mongoose.connection.db.admin();
        const serverStatus = await admin.serverStatus();
        
        if (!serverStatus.repl) {
          console.warn('⚠️  WARNING: MongoDB is not running as a replica set!');
          console.warn('⚠️  Transactions will FAIL. Outbox Pattern requires replica set.');
          console.warn('⚠️  To fix:');
          console.warn('    1. Stop MongoDB');
          console.warn('    2. Start with: mongod --replSet rs0 --dbpath /data/db');
          console.warn('    3. In mongo shell, run: rs.initiate()');
          console.warn('    4. Restart your application');
        } else {
          console.log(`✅ MongoDB replica set detected: ${serverStatus.repl.setName}`);
          console.log('✅ Transactions are supported');
        }
      } catch (err) {
        console.warn('⚠️  Could not check replica set status:', err.message);
      }
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
