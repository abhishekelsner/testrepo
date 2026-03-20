import Workspace from '../models/Workspace.js';
import SubscriptionPayment from '../models/SubscriptionPayment.js';
import User from '../modules/users/user.model.js';
import { upsertSubscription } from '../utils/subscriptionHelper.js';
import { stripe, STRIPE_PRICE_SINGLE, STRIPE_PRICE_TEAM, CLIENT_URL } from '../config/stripe.js';
import { AppError } from '../utils/AppError.js';
import { PLAN_LIMITS } from '../utils/planLimits.js';

/**
 * Map Stripe price ID to plan. Only Single is matched by env; any other price = Team
 * so plan stays correct even if STRIPE_PRICE_TEAM env differs from Stripe (e.g. extra chars).
 */
function resolvePlanFromPriceId(priceId) {
  if (!priceId) return 'single';
  if (STRIPE_PRICE_SINGLE && priceId === STRIPE_PRICE_SINGLE) return 'single';
  // Team price or any other price (e.g. different Team price id) => team
  return 'team';
}

/** Stripe can return price as string (id) or object with .id. Handle list structure. */
function getPriceIdFromSubscription(sub) {
  const items = sub.items;
  const data = items?.data ?? (Array.isArray(items) ? items : null);
  const first = Array.isArray(data) ? data[0] : null;
  const price = first?.price;
  if (!price) return null;
  return typeof price === 'string' ? price : (price?.id ?? null);
}

/**
 * Get price ID from subscription - either from sub.items or by listing subscription items.
 * Stripe SDK version / expand can change the shape, so we try both.
 */
async function getPriceIdFromStripeSubscription(subId) {
  if (!stripe) return null;
  try {
    // Try with expand first (price may be object with .id)
    const sub = await stripe.subscriptions.retrieve(subId, {
      expand: ['items.data.price'],
    });
    let priceId = getPriceIdFromSubscription(sub);
    if (priceId) return priceId;
    // Try without expand (price is often returned as string id)
    const subPlain = await stripe.subscriptions.retrieve(subId);
    priceId = getPriceIdFromSubscription(subPlain);
    if (priceId) return priceId;
    // Fallback: list subscription items (different API shape)
    try {
      const list = await stripe.subscriptionItems.list({ subscription: subId, limit: 1 });
      const first = list?.data?.[0];
      const price = first?.price;
      if (price) return typeof price === 'string' ? price : (price?.id ?? null);
    } catch (listErr) {
      console.error('[billing] subscriptionItems.list fallback failed:', listErr.message);
    }
    return null;
  } catch (e) {
    console.error('[billing] getPriceIdFromStripeSubscription failed:', e.message);
    return null;
  }
}

/** Sync payment method (brand, last4, expiry, name) from Stripe subscription to workspace. */
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
    // optional
  }
}

/**
 * Save a SubscriptionPayment record from a Stripe invoice (so admin dashboard shows revenue).
 * Idempotent: upsert by stripeInvoiceId so webhook and confirm-session don't duplicate.
 */
async function savePaymentFromStripeInvoice(workspace, invoice) {
  if (!invoice?.id || !workspace?._id) return;
  const line = invoice.lines?.data?.[0];
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
}

/**
 * Apply successful checkout to workspace (same logic as webhook checkout.session.completed).
 * Also saves the payment to SubscriptionPayment so the admin dashboard shows revenue
 * even when Stripe webhook doesn't run (e.g. local dev).
 */
async function applyCheckoutCompleted(workspace, session) {
  if (!session.subscription || session.payment_status !== 'paid') return false;
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subId) return false;
  workspace.stripeSubscriptionId = subId;
  workspace.subscriptionStatus = 'active';
  if (session.customer_email) workspace.billingEmail = session.customer_email;
  const sub = await stripe.subscriptions.retrieve(subId, {
    expand: ['default_payment_method', 'items.data.price', 'latest_invoice'],
  });
  const priceId = getPriceIdFromSubscription(sub);
  workspace.plan = resolvePlanFromPriceId(priceId);
  workspace.currentPeriodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : null;
  workspace.currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;
  workspace.cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;
  await syncPaymentMethodToWorkspace(workspace, sub);
  await workspace.save();

  // Save payment to DB so admin dashboard shows revenue (works even without webhook)
  try {
    let invoice = sub.latest_invoice;
    if (typeof invoice === 'string') {
      invoice = await stripe.invoices.retrieve(invoice);
    }
    if (invoice?.id && invoice?.amount_paid != null) {
      await savePaymentFromStripeInvoice(workspace, invoice);
    }
  } catch (e) {
    console.error('[billing] savePaymentFromStripeInvoice failed:', e.message);
  }

  return true;
}

/**
 * Ensure workspace has a Stripe customer; create one if missing.
 * Returns the updated workspace (with stripeCustomerId set if Stripe succeeded).
 */
async function ensureStripeCustomer(workspace, ownerEmail) {
  if (workspace.stripeCustomerId) return workspace;
  if (!stripe || !ownerEmail) return workspace;
  try {
    const customer = await stripe.customers.create({
      email: ownerEmail,
      metadata: {
        workspaceId: workspace._id.toString(),
        organizationId: workspace.organizationId.toString(),
      },
    });
    workspace.stripeCustomerId = customer.id;
    await workspace.save();
  } catch (err) {
    console.error('[billing] Stripe customer creation failed:', err.message);
  }
  return workspace;
}

/**
 * Get or create workspace for this organization. Creates Stripe customer on first create.
 * Does not block workspace creation on Stripe failure — we log and leave stripeCustomerId null.
 */
export async function getOrCreateWorkspace(organizationId, ownerId, ownerEmail, workspaceName) {
  let workspace = await Workspace.findOne({ organizationId });
  if (workspace) return workspace;

  workspace = await Workspace.create({
    name: workspaceName || 'Default Workspace',
    organizationId,
    ownerId,
    members: [ownerId],
    plan: 'single',
    subscriptionStatus: 'inactive',
  });

  await ensureStripeCustomer(workspace, ownerEmail);
  return workspace;
}

/**
 * POST /api/billing/create-checkout-session
 * Body: { plan: "single" | "team" }
 */
export async function createCheckoutSession(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const userId = req.userId;
    if (!organizationId) throw new AppError('Authentication required', 401);

    const user = await User.findById(userId).populate('organizationId');
    if (!user || !user.organizationId) throw new AppError('Organization not found', 404);

    const workspace = await getOrCreateWorkspace(
      organizationId,
      userId,
      user.email,
      user.organizationId.name
    );

    const plan = req.body?.plan;
    if (!plan || !['single', 'team'].includes(plan)) {
      throw new AppError('plan must be "single" or "team"', 400);
    }

    const priceId = plan === 'team' ? STRIPE_PRICE_TEAM : STRIPE_PRICE_SINGLE;
    if (!priceId) {
      const missing = plan === 'team' ? 'STRIPE_PRICE_TEAM' : 'STRIPE_PRICE_SINGLE';
      throw new AppError(
        `Billing not configured: add ${missing} to server .env (create a recurring price in Stripe Dashboard and paste the price_... id).`,
        503
      );
    }
    if (!stripe) {
      throw new AppError('Billing not configured: add STRIPE_SECRET_KEY to server .env', 503);
    }
    // Create Stripe customer now if workspace never had one (e.g. created before Stripe was configured)
    await ensureStripeCustomer(workspace, user.email);
    if (!workspace.stripeCustomerId) {
      throw new AppError(
        'Could not create billing account. Check STRIPE_SECRET_KEY in server .env and try again.',
        503
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: workspace.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        workspaceId: workspace._id.toString(),
        userId: userId.toString(),
        organizationId: organizationId.toString(),
        priceId,
      },
      success_url: `${CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/cancel`,
      subscription_data: {
        metadata: {
          workspaceId: workspace._id.toString(),
          userId: userId.toString(),
          organizationId: organizationId.toString(),
          priceId,
        },
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/billing/confirm-session
 * Body: { sessionId: "cs_..." }
 * Called from the success page so we save subscription to DB even when Stripe webhook
 * doesn't run (e.g. local dev without Stripe CLI). Retrieves session from Stripe and
 * updates workspace the same way as checkout.session.completed.
 */
export async function confirmCheckoutSession(req, res, next) {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) throw new AppError('Authentication required', 401);
    const sessionId = req.body?.sessionId;
    if (!sessionId) throw new AppError('sessionId is required', 400);
    if (!stripe) throw new AppError('Billing not configured', 503);

    const workspace = await Workspace.findOne({ organizationId });
    if (!workspace) throw new AppError('Workspace not found', 404);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
    const workspaceId = session.metadata?.workspaceId;
    if (!workspaceId || workspaceId !== workspace._id.toString()) {
      throw new AppError('This checkout session does not belong to your workspace', 403);
    }
    if (session.payment_status !== 'paid' || !session.subscription) {
      return res.json({ success: false, message: 'Payment not completed yet' });
    }
    const sessionSubId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    // Only skip apply when this exact subscription is already active (e.g. user refreshed success page)
    if (
      workspace.stripeSubscriptionId &&
      workspace.subscriptionStatus === 'active' &&
      sessionSubId === workspace.stripeSubscriptionId
    ) {
      return res.json({ success: true, alreadyActive: true });
    }

    const updated = await applyCheckoutCompleted(workspace, session);
    if (updated) {
      try {
        const userId = session.metadata?.userId;
        const organizationIdMeta = session.metadata?.organizationId;
        const priceIdMeta = session.metadata?.priceId;
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (userId && organizationIdMeta) {
          await upsertSubscription({
            userId: userId,
            organizationId: organizationIdMeta,
            priceId: priceIdMeta || undefined,
            stripeSubscriptionId: subId ?? null,
            stripePaymentIntentId: session.payment_intent ?? null,
            stripeCustomerId: session.customer ?? null,
          });
        }
      } catch (e) {
        console.error('[billing] upsertSubscription after confirm failed:', e.message);
      }
    }
    return res.json({ success: !!updated });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/billing/status
 */
export async function getBillingStatus(req, res, next) {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) throw new AppError('Authentication required', 401);

    const user = await User.findById(req.userId).populate('organizationId');
    if (!user || !user.organizationId) throw new AppError('Organization not found', 404);

    let workspace = await Workspace.findOne({ organizationId });
    if (!workspace) {
      workspace = await getOrCreateWorkspace(
        organizationId,
        req.userId,
        user.email,
        user.organizationId.name
      );
    }

    // When subscription is active, sync plan and period from Stripe and persist to DB (updateOne so DB always changes)
    const isActive =
      workspace.stripeSubscriptionId &&
      (workspace.subscriptionStatus === 'active' || workspace.subscriptionStatus === 'trialing');
    if (isActive && stripe) {
      try {
        const sub = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId, {
          expand: ['default_payment_method', 'items.data.price'],
        });
        let priceId = getPriceIdFromSubscription(sub);
        if (!priceId) priceId = await getPriceIdFromStripeSubscription(workspace.stripeSubscriptionId);
        const resolvedPlan = resolvePlanFromPriceId(priceId);
        const updateFields = {
          plan: resolvedPlan,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : workspace.currentPeriodEnd,
          currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : workspace.currentPeriodStart,
        };
        if (!workspace.paymentMethodLast4) {
          await syncPaymentMethodToWorkspace(workspace, sub);
          if (workspace.paymentMethodBrand) updateFields.paymentMethodBrand = workspace.paymentMethodBrand;
          if (workspace.paymentMethodLast4) updateFields.paymentMethodLast4 = workspace.paymentMethodLast4;
          if (workspace.paymentMethodExpMonth != null) updateFields.paymentMethodExpMonth = workspace.paymentMethodExpMonth;
          if (workspace.paymentMethodExpYear != null) updateFields.paymentMethodExpYear = workspace.paymentMethodExpYear;
          if (workspace.paymentMethodName) updateFields.paymentMethodName = workspace.paymentMethodName;
        }
        const result = await Workspace.updateOne({ _id: workspace._id }, { $set: updateFields });
        if (process.env.NODE_ENV !== 'production') {
          console.log('[billing] Sync workspace', workspace._id, 'plan:', resolvedPlan, 'priceId:', priceId, 'matched:', result.modifiedCount);
        }
        workspace.plan = updateFields.plan;
        workspace.currentPeriodEnd = updateFields.currentPeriodEnd;
        workspace.currentPeriodStart = updateFields.currentPeriodStart;
        if (updateFields.paymentMethodBrand != null) workspace.paymentMethodBrand = updateFields.paymentMethodBrand;
        if (updateFields.paymentMethodLast4 != null) workspace.paymentMethodLast4 = updateFields.paymentMethodLast4;
        if (updateFields.paymentMethodExpMonth != null) workspace.paymentMethodExpMonth = updateFields.paymentMethodExpMonth;
        if (updateFields.paymentMethodExpYear != null) workspace.paymentMethodExpYear = updateFields.paymentMethodExpYear;
        if (updateFields.paymentMethodName != null) workspace.paymentMethodName = updateFields.paymentMethodName;
      } catch (e) {
        console.error('[billing] Refresh subscription from Stripe failed:', e.message);
      }
    }

    const memberCount = await User.countDocuments({ organizationId });

    const recentPayments = await SubscriptionPayment.find({ workspaceId: workspace._id })
      .sort({ paidAt: -1 })
      .limit(12)
      .lean();

    return res.json({
      plan: workspace.plan,
      subscriptionStatus: workspace.subscriptionStatus,
      currentPeriodStart: workspace.currentPeriodStart,
      currentPeriodEnd: workspace.currentPeriodEnd,
      cancelAtPeriodEnd: workspace.cancelAtPeriodEnd,
      paymentMethodBrand: workspace.paymentMethodBrand,
      paymentMethodLast4: workspace.paymentMethodLast4,
      paymentMethodExpMonth: workspace.paymentMethodExpMonth,
      paymentMethodExpYear: workspace.paymentMethodExpYear,
      paymentMethodName: workspace.paymentMethodName,
      billingEmail: workspace.billingEmail,
      memberCount,
      memberLimit: PLAN_LIMITS[workspace.plan] ?? PLAN_LIMITS.single,
      recentPayments: recentPayments.map((p) => ({
        id: p._id.toString(),
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        description: p.description,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/billing/sync — force-sync plan and period from Stripe to DB (for debugging / fixing stuck single plan).
 */
export async function syncSubscriptionFromStripe(req, res, next) {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) throw new AppError('Authentication required', 401);
    if (!stripe) throw new AppError('Billing not configured', 503);

    const workspace = await Workspace.findOne({ organizationId });
    if (!workspace) throw new AppError('Workspace not found', 404);
    if (!workspace.stripeSubscriptionId) {
      return res.json({ ok: false, message: 'No subscription to sync' });
    }

    const subId = workspace.stripeSubscriptionId;
    const priceId = await getPriceIdFromStripeSubscription(subId);
    const plan = resolvePlanFromPriceId(priceId);

    const sub = await stripe.subscriptions.retrieve(subId, { expand: ['default_payment_method'] });
    const updateFields = {
      plan,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    };
    await syncPaymentMethodToWorkspace(workspace, sub);
    if (workspace.paymentMethodBrand) updateFields.paymentMethodBrand = workspace.paymentMethodBrand;
    if (workspace.paymentMethodLast4) updateFields.paymentMethodLast4 = workspace.paymentMethodLast4;
    if (workspace.paymentMethodExpMonth != null) updateFields.paymentMethodExpMonth = workspace.paymentMethodExpMonth;
    if (workspace.paymentMethodExpYear != null) updateFields.paymentMethodExpYear = workspace.paymentMethodExpYear;
    if (workspace.paymentMethodName) updateFields.paymentMethodName = workspace.paymentMethodName;
    const result = await Workspace.updateOne({ _id: workspace._id }, { $set: updateFields });

    return res.json({
      ok: true,
      plan,
      priceId: priceId || null,
      currentPeriodEnd: updateFields.currentPeriodEnd,
      currentPeriodStart: updateFields.currentPeriodStart,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/billing/cancel — set cancel_at_period_end (graceful). Owner only.
 */
export async function cancelSubscription(req, res, next) {
  try {
    const organizationId = req.organizationId;
    const workspace = await Workspace.findOne({ organizationId });
    if (!workspace) throw new AppError('Workspace not found', 404);
    if (workspace.ownerId.toString() !== req.userId) {
      throw new AppError('Only the workspace owner can cancel', 403);
    }
    if (!workspace.stripeSubscriptionId) {
      throw new AppError('No active subscription to cancel', 400);
    }

    await stripe.subscriptions.update(workspace.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    workspace.cancelAtPeriodEnd = true;
    await workspace.save();

    return res.json({
      message: 'Subscription will cancel at period end',
      currentPeriodEnd: workspace.currentPeriodEnd,
    });
  } catch (err) {
    next(err);
  }
}

export { resolvePlanFromPriceId };
