/**
 * Stripe SDK singleton. Initialize once so the same instance is used
 * across the app (required for webhook signature verification and idempotency).
 * Uses STRIPE_SECRET_KEY from env; in test mode use sk_test_...
 */
import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey && process.env.NODE_ENV !== 'test') {
  console.warn('[stripe] STRIPE_SECRET_KEY not set; billing features will fail.');
}

export const stripe = secretKey ? new Stripe(secretKey) : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const STRIPE_PRICE_SINGLE = process.env.STRIPE_PRICE_SINGLE;
export const STRIPE_PRICE_TEAM = process.env.STRIPE_PRICE_TEAM;
export const CLIENT_URL = process.env.CLIENT_URL || process.env.WEB_ORIGIN || 'http://localhost:5173';
