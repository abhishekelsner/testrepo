/**
 * Seed subscription payments for workspaces that have active/trialing subscription
 * but no payment record yet (e.g. no Stripe webhook). This makes Total Revenue show
 * in the admin dashboard.
 * Run from repo root: node server/src/scripts/seedSubscriptionPayments.js
 */
import '../config/loadEnv.js';
import dns from 'node:dns';
import mongoose from 'mongoose';

dns.setServers(['1.1.1.1', '8.8.8.8']);
import Workspace from '../models/Workspace.js';
import SubscriptionPayment from '../models/SubscriptionPayment.js';

const DEFAULT_AMOUNT_SINGLE = 29.99;
const DEFAULT_AMOUNT_TEAM = 99;

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Set it in server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');

  const workspaces = await Workspace.find({
    subscriptionStatus: { $in: ['active', 'trialing'] },
  }).lean();

  if (workspaces.length === 0) {
    console.log('No active/trialing workspaces found. Total Revenue will stay $0 until you have subscriptions.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let created = 0;
  for (const ws of workspaces) {
    const existing = await SubscriptionPayment.findOne({
      workspaceId: ws._id,
      status: 'paid',
    });
    if (existing) {
      console.log(`Workspace ${ws._id} already has payment(s), skipping.`);
      continue;
    }

    const amount = ws.plan === 'team' ? DEFAULT_AMOUNT_TEAM : DEFAULT_AMOUNT_SINGLE;
    const now = new Date();
    const periodStart = ws.currentPeriodStart || now;
    const periodEnd = ws.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await SubscriptionPayment.create({
      workspaceId: ws._id,
      stripeInvoiceId: `seed_${ws._id}`,
      amount,
      currency: 'usd',
      status: 'paid',
      paidAt: now,
      periodStart,
      periodEnd,
      description: 'Seed payment for dashboard revenue',
    });
    created++;
    console.log(`Created payment $${amount} for workspace ${ws._id}`);
  }

  console.log(`Done. Created ${created} payment(s). Total Revenue in admin dashboard will now include these.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
