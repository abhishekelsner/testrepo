/**
 * Seed script: creates realistic analytics events (open, close, click) for existing proposals.
 * Run: node server/src/scripts/seedAnalytics.js
 * Requires MONGODB_URI. Events are created for up to 30 proposals across all orgs.
 */
import '../config/loadEnv.js';
import mongoose from 'mongoose';
import Proposal from '../modules/proposals/proposal.model.js';
import AnalyticsEvent from '../modules/analytics/analyticsEvent.model.js';

const MAX_PROPOSALS = 30;
const MIN_OPEN_PER_PROPOSAL = 1;
const MAX_OPEN_PER_PROPOSAL = 6;
const MIN_CLICK_PER_PROPOSAL = 2;
const MAX_CLICK_PER_PROPOSAL = 18;

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function inRange(min, max, seed) {
  return Math.floor(min + seededRandom(seed) * (max - min + 1));
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Set it in server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');

  const proposals = await Proposal.find({ deletedAt: null })
    .sort({ updatedAt: -1 })
    .limit(MAX_PROPOSALS)
    .lean();

  if (proposals.length === 0) {
    console.log('No proposals found. Create proposals first.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let totalEvents = 0;
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const proposal of proposals) {
    const orgId = proposal.organizationId;
    const proposalId = proposal._id;
    const slug = proposal.slug || null;
    const seed = proposalId.toString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    const numOpens = inRange(MIN_OPEN_PER_PROPOSAL, MAX_OPEN_PER_PROPOSAL, seed);
    const eventsToCreate = [];

    for (let i = 0; i < numOpens; i++) {
      const sessionId = `s-${proposalId}-${i}`;
      const daysAgo = inRange(0, 14, seed + i * 7);
      const openAt = new Date(now - daysAgo * oneDayMs - inRange(0, oneDayMs - 1, seed + i));
      eventsToCreate.push({
        organizationId: orgId,
        proposalId,
        proposalSlug: slug,
        event: 'open',
        payload: { sessionId },
        createdAt: openAt,
        updatedAt: openAt,
      });

      const durationMs = inRange(45, 240, seed + i * 11) * 1000;
      const closeAt = new Date(openAt.getTime() + durationMs);
      eventsToCreate.push({
        organizationId: orgId,
        proposalId,
        proposalSlug: slug,
        event: 'close',
        payload: { sessionId, durationMs },
        createdAt: closeAt,
        updatedAt: closeAt,
      });
    }

    const numClicks = inRange(MIN_CLICK_PER_PROPOSAL, MAX_CLICK_PER_PROPOSAL, seed + 100);
    for (let i = 0; i < numClicks; i++) {
      const daysAgo = inRange(0, 14, seed + i * 13);
      const clickAt = new Date(now - daysAgo * oneDayMs - inRange(0, oneDayMs - 1, seed + i + 200));
      eventsToCreate.push({
        organizationId: orgId,
        proposalId,
        proposalSlug: slug,
        event: 'click',
        payload: {},
        createdAt: clickAt,
        updatedAt: clickAt,
      });
    }

    await AnalyticsEvent.deleteMany({ proposalId });
    await AnalyticsEvent.insertMany(eventsToCreate);
    totalEvents += eventsToCreate.length;
    console.log(`Seeded ${eventsToCreate.length} events for proposal "${(proposal.title || '').slice(0, 40)}"`);
  }

  console.log(`Done. Created ${totalEvents} analytics events for ${proposals.length} proposals.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
