import Stripe from 'stripe';
import Workspace from '../models/Workspace.js';
import SubscriptionPayment from '../models/SubscriptionPayment.js';
import { upsertSubscription } from '../utils/subscriptionHelper.js';
import { stripe, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_SINGLE, STRIPE_PRICE_TEAM } from '../config/stripe.js';

function planFromPriceId(priceId) {
  if (!priceId) return 'single';
  if (STRIPE_PRICE_SINGLE && priceId === STRIPE_PRICE_SINGLE) return 'single';
  return 'team';
}

function getPriceIdFromSubscription(sub) {
  const items = sub.items;
  const data = items?.data ?? (Array.isArray(items) ? items : null);
  const first = Array.isArray(data) ? data[0] : null;
  const price = first?.price;
  if (!price) return null;
  return typeof price === 'string' ? price : (price?.id ?? null);
}

/** Fetch card and billing details from subscription default payment method and save to workspace. */
async function syncPaymentMethodToWorkspace(workspace, subscription) {
  if (!workspace || !stripe) return;
  const pmId = subscription.default_payment_method;
  if (!pmId) return;
  try {
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.card) {
      workspace.paymentMethodBrand = pm.card.brand || null;
      workspace.paymentMethodLast4 = pm.card.last4 || null;
      workspace.paymentMethodExpMonth = pm.card.exp_month ?? null;
      workspace.paymentMethodExpYear = pm.card.exp_year ?? null;
    }
    if (pm.billing_details?.name) workspace.paymentMethodName = pm.billing_details.name;
  } catch (e) {
    // optional; don't fail webhook
  }
}

/**
 * Stripe webhook handler. Must use raw body for signature verification.
 * Always return 200 to Stripe to avoid retries; log and swallow non-critical errors.
 */
export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  if (!STRIPE_WEBHOOK_SECRET || !sig) {
    console.warn('[webhook] Missing STRIPE_WEBHOOK_SECRET or stripe-signature');
    return res.status(400).send('Webhook secret or signature missing');
  }

  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspaceId || session.subscription?.metadata?.workspaceId;
        if (!workspaceId) {
          console.warn('[webhook] checkout.session.completed missing workspaceId in metadata');
          break;
        }
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
          console.warn('[webhook] Workspace not found:', workspaceId);
          break;
        }
        workspace.stripeSubscriptionId = session.subscription;
        workspace.subscriptionStatus = 'active';
        if (session.customer_email) workspace.billingEmail = session.customer_email;
        let priceId = null;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['default_payment_method', 'items.data.price'],
          });
          priceId = getPriceIdFromSubscription(sub);
          workspace.plan = planFromPriceId(priceId);
          workspace.currentPeriodStart = sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : null;
          workspace.currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null;
          workspace.cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;
          await syncPaymentMethodToWorkspace(workspace, sub);
        }
        await workspace.save();
        try {
          const userId = session.metadata?.userId ?? workspace.ownerId?.toString?.() ?? workspace.ownerId;
          const organizationId = session.metadata?.organizationId ?? workspace.organizationId?.toString?.() ?? workspace.organizationId;
          if (userId && organizationId) {
            await upsertSubscription({
              userId,
              organizationId,
              priceId: priceId ?? session.metadata?.priceId ?? undefined,
              stripeSubscriptionId: session.subscription ?? null,
              stripeCustomerId: session.customer ?? workspace.stripeCustomerId ?? null,
            });
          }
        } catch (e) {
          console.error('[webhook] upsertSubscription failed:', e.message);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;
        const workspace = await Workspace.findOne({ stripeSubscriptionId: subId });
        if (!workspace) break;
        workspace.subscriptionStatus = 'active';
        const line = invoice.lines?.data?.[0];
        if (line?.period) {
          if (line.period.end)
            workspace.currentPeriodEnd = new Date(line.period.end * 1000);
          if (line.period.start)
            workspace.currentPeriodStart = new Date(line.period.start * 1000);
        }
        if (invoice.customer_email) workspace.billingEmail = invoice.customer_email;
        await workspace.save();

        // Store payment record in DB for history
        try {
          await SubscriptionPayment.findOneAndUpdate(
            { stripeInvoiceId: invoice.id },
            {
              workspaceId: workspace._id,
              stripeInvoiceId: invoice.id,
              amount: invoice.amount_paid != null ? invoice.amount_paid / 100 : 0,
              currency: (invoice.currency || 'usd').toLowerCase(),
              status: 'paid',
              paidAt: invoice.status_transitions?.paid_at
                ? new Date(invoice.status_transitions.paid_at * 1000)
                : new Date(),
              periodStart: line?.period?.start ? new Date(line.period.start * 1000) : null,
              periodEnd: line?.period?.end ? new Date(line.period.end * 1000) : null,
              description: line?.description || invoice.description || null,
            },
            { upsert: true, new: true }
          );
        } catch (e) {
          console.error('[webhook] SubscriptionPayment upsert failed:', e.message);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;
        await Workspace.updateOne(
          { stripeSubscriptionId: subId },
          { $set: { subscriptionStatus: 'past_due' } }
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const workspace = await Workspace.findOne({ stripeSubscriptionId: sub.id });
        if (!workspace) break;
        const priceId = getPriceIdFromSubscription(sub);
        workspace.plan = planFromPriceId(priceId);
        workspace.currentPeriodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : workspace.currentPeriodStart;
        workspace.currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : workspace.currentPeriodEnd;
        workspace.cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;
        await syncPaymentMethodToWorkspace(workspace, sub);
        await workspace.save();
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const workspace = await Workspace.findOne({ stripeSubscriptionId: sub.id });
        if (!workspace) break;
        workspace.stripeSubscriptionId = null;
        workspace.subscriptionStatus = 'inactive';
        workspace.plan = 'single';
        workspace.cancelAtPeriodEnd = false;
        workspace.currentPeriodStart = null;
        workspace.currentPeriodEnd = null;
        workspace.paymentMethodBrand = null;
        workspace.paymentMethodLast4 = null;
        workspace.paymentMethodExpMonth = null;
        workspace.paymentMethodExpYear = null;
        workspace.paymentMethodName = null;
        await workspace.save();
        break;
      }

      default:
        // Unhandled event type — still return 200
        break;
    }
  } catch (err) {
    console.error('[webhook] Handler error for', event.type, err);
    // Do not throw — return 200 so Stripe does not retry
  }

  res.sendStatus(200);
}
