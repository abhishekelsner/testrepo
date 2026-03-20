/**
 * Seed script: creates one organization (Elsner) with Admin and Kartik users.
 * Run: node server/src/scripts/seedUsers.js
 * Ensure MONGODB_URI is set in server/.env or repo root .env
 */
import '../config/loadEnv.js';
import dns from 'node:dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../modules/users/user.model.js';
import Organization from '../modules/organizations/organization.model.js';

// Use public DNS so MongoDB Atlas SRV lookup works (avoids querySrv ECONNREFUSED on some networks)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const SALT_ROUNDS = 10;

const SEED = {
  organization: { name: 'Elsner', slug: 'elsner' },
  users: [
    { email: 'admin@elsner.com', password: 'Admin@123', name: 'Admin', role: 'Admin' },
    { email: 'superadmin@elsner.com', password: 'SuperAdmin@123', name: 'Super Admin', role: 'Super_Admin' },
    { email: 'kartik@elsner.com', password: 'Kartik@123', name: 'Kartik Trivedi', role: 'Creator' },
  ],
};

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Set it in server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');

  let org = await Organization.findOne({ slug: SEED.organization.slug });
  if (org) {
    console.log('Organization "Elsner" already exists');
    const adminEmailLower = 'admin@elsner.com';
    const superAdminEmailLower = 'superadmin@elsner.com';
    await User.updateMany({}, { $set: { emailVerified: true } });
    await User.updateMany(
      { $expr: { $eq: [ { $toLower: '$email' }, adminEmailLower ] } },
      { $set: { role: 'Admin' } }
    );
    await User.updateMany(
      { $expr: { $eq: [ { $toLower: '$email' }, superAdminEmailLower ] } },
      { $set: { role: 'Super_Admin' } }
    );
    const toCreator = await User.updateMany(
      { $expr: { $and: [ { $ne: [ { $toLower: '$email' }, adminEmailLower ] }, { $ne: [ { $toLower: '$email' }, superAdminEmailLower ] } ] } },
      { $set: { role: 'Creator' } }
    );
    console.log('Roles set: Admin, Super_Admin, others Creator. Updated to Creator:', toCreator.modifiedCount);
  } else {
    org = await Organization.create(SEED.organization);
    console.log('Created organization:', org.name);
  }

  for (const u of SEED.users) {
    const existing = await User.findOne({ organizationId: org._id, email: u.email });
    if (existing) {
      console.log('User already exists:', u.email);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    await User.create({
      email: u.email,
      passwordHash,
      name: u.name,
      organizationId: org._id,
      role: u.role,
      emailVerified: true, // seeded users can sign in without verification
    });
    console.log('Created user:', u.email, '(', u.role, ')');
  }

  console.log('Seed done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
