import Settings from './settings.model.js';

const STRIPE_KEYS = [
  'stripe_test_secret',
  'stripe_test_publishable',
  'stripe_live_secret',
  'stripe_live_publishable',
  'stripe_use_live', // boolean: use live keys when true
];

export async function getSettings(keys = STRIPE_KEYS) {
  const docs = await Settings.find({ key: { $in: keys } }).lean();
  const map = {};
  docs.forEach((d) => { map[d.key] = d.value; });
  return map;
}

export async function setSetting(key, value) {
  if (!STRIPE_KEYS.includes(key)) {
    const err = new Error('Invalid settings key');
    err.status = 400;
    throw err;
  }
  if (key === 'stripe_use_live') value = !!value;
  await Settings.findOneAndUpdate(
    { key },
    { $set: { value } },
    { upsert: true, new: true }
  );
  return { key, value };
}

export async function setStripeSettings(body) {
  const updates = {};
  // Only update string keys when a non-empty value is sent (don't overwrite with empty)
  if (typeof body.stripe_test_secret === 'string' && body.stripe_test_secret.trim()) updates.stripe_test_secret = body.stripe_test_secret.trim();
  if (typeof body.stripe_test_publishable === 'string' && body.stripe_test_publishable.trim()) updates.stripe_test_publishable = body.stripe_test_publishable.trim();
  if (typeof body.stripe_live_secret === 'string' && body.stripe_live_secret.trim()) updates.stripe_live_secret = body.stripe_live_secret.trim();
  if (typeof body.stripe_live_publishable === 'string' && body.stripe_live_publishable.trim()) updates.stripe_live_publishable = body.stripe_live_publishable.trim();
  if (body.stripe_use_live !== undefined) updates.stripe_use_live = !!body.stripe_use_live;

  for (const [key, value] of Object.entries(updates)) {
    await Settings.findOneAndUpdate(
      { key },
      { $set: { value } },
      { upsert: true }
    );
  }
  return getSettings();
}

/** Get the active Stripe secret key (test or live based on stripe_use_live). */
export async function getStripeSecretKey() {
  const s = await getSettings();
  const useLive = s.stripe_use_live === true;
  return useLive ? s.stripe_live_secret : s.stripe_test_secret;
}

/** Get the active Stripe publishable key for frontend. */
export async function getStripePublishableKey() {
  const s = await getSettings();
  const useLive = s.stripe_use_live === true;
  return useLive ? s.stripe_live_publishable : s.stripe_test_publishable;
}
