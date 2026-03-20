/**
 * Set a user as Super_Admin so they can log in to the admin dashboard.
 * Run: node server/src/scripts/setSuperAdmin.js
 * Usage: set email in the script or pass as env SET_SUPERADMIN_EMAIL=superadmin@gmail.com
 */
import '../config/loadEnv.js';
import dns from 'node:dns';
import mongoose from 'mongoose';
import User from '../modules/users/user.model.js';

dns.setServers(['1.1.1.1', '8.8.8.8']);

const email = process.env.SET_SUPERADMIN_EMAIL || 'superadmin@gmail.com';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Set it in server/.env or repo root .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    console.error('User not found with email:', email);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.role = 'Super_Admin';
  user.emailVerified = true;
  await user.save();

  console.log('Updated user to Super_Admin:', user.email);
  console.log('You can now log in to the admin panel with this email and your password.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
