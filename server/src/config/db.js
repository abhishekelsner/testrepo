import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set; skipping DB connect');
    return;
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
