import Subscription from '../models/Subscription.js';

const STRIPE_PRICE_SINGLE = process.env.STRIPE_PRICE_SINGLE;
const STRIPE_PRICE_TEAM = process.env.STRIPE_PRICE_TEAM;

const PLAN_MAP = {
  [STRIPE_PRICE_SINGLE]: { planType: 'Single', amount: 19.0 },
  [STRIPE_PRICE_TEAM]: { planType: 'Team', amount: 49.0 },
};

/**
 * Upsert subscription after confirmed payment.
 * Safe to call from both webhook and session-based flows.
 * Amount from Stripe (cents) must be divided by 100 before passing as amountPaid.
 */
export async function upsertSubscription({
  userId,
  organizationId,
  priceId,
  stripeSubscriptionId = null,
  stripePaymentIntentId = null,
  stripeCustomerId = null,
  amountPaidCents = null,
}) {
  const plan = priceId ? PLAN_MAP[priceId] : null;
  const planType = plan?.planType ?? (STRIPE_PRICE_TEAM && priceId === STRIPE_PRICE_TEAM ? 'Team' : 'Single');
  const amount = plan
    ? plan.amount
    : amountPaidCents != null
      ? amountPaidCents / 100
      : planType === 'Team'
        ? 49.0
        : 19.0;

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 28);

  const subscription = await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        organizationId,
        planType,
        amountPaid: amount,
        paymentStatus: 'active',
        startDate,
        endDate,
        stripeSubscriptionId,
        stripePaymentIntentId,
        stripeCustomerId,
        stripePriceId: priceId || null,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return subscription;
}

/**
 * Mark subscriptions expired if endDate has passed.
 * Call during API fetch or via cron.
 */
export async function syncExpiredSubscriptions() {
  try {
    const result = await Subscription.updateMany(
      {
        paymentStatus: 'active',
        endDate: { $lt: new Date() },
      },
      { $set: { paymentStatus: 'expired' } }
    );
    return result.modifiedCount ?? 0;
  } catch (err) {
    console.error('[subscriptionHelper] syncExpiredSubscriptions:', err.message);
    return 0;
  }
}
