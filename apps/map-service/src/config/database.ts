import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('✅ Connected to MongoDB Server');
  } catch (err) {
    console.error('❌ Could not connect to MongoDB', err);
    process.exit(1);
  }
};
