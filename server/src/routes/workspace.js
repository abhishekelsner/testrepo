import { Router } from 'express';
import { authenticate } from '../modules/auth/auth.middleware.js';
import { getOrCreateWorkspace } from '../controllers/billingController.js';
import User from '../modules/users/user.model.js';

const router = Router();

/**
 * POST /api/workspace — Create workspace for current user's organization (idempotent).
 * Creates Stripe customer using owner email; does not block on Stripe failure.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.userId).populate('organizationId');
    if (!user || !user.organizationId) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const workspace = await getOrCreateWorkspace(
      organizationId,
      req.userId,
      user.email,
      user.organizationId.name
    );

    return res.status(201).json({
      id: workspace._id.toString(),
      name: workspace.name,
      plan: workspace.plan,
      subscriptionStatus: workspace.subscriptionStatus,
      stripeCustomerId: workspace.stripeCustomerId ? true : false,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workspace — Get current workspace (create if missing).
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(req.userId).populate('organizationId');
    if (!user || !user.organizationId) return res.status(404).json({ message: 'Organization not found' });

    const workspace = await getOrCreateWorkspace(
      organizationId,
      req.userId,
      user.email,
      user.organizationId.name
    );

    const memberCount = await User.countDocuments({ organizationId });

    return res.json({
      id: workspace._id.toString(),
      name: workspace.name,
      plan: workspace.plan,
      subscriptionStatus: workspace.subscriptionStatus,
      currentPeriodEnd: workspace.currentPeriodEnd,
      cancelAtPeriodEnd: workspace.cancelAtPeriodEnd,
      memberCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
