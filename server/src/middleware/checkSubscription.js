import Workspace from '../models/Workspace.js';

const VALID_STATUSES = ['active', 'trialing'];

/**
 * Ensures the current user's workspace has an active (or trialing) subscription.
 * Optionally requires a specific plan (e.g. "team" for team-only features).
 * Attaches req.workspace for downstream use.
 * Use after authenticate so req.organizationId is set.
 */
export function checkSubscription(requiredPlan = null) {
  return async (req, res, next) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const workspace = await Workspace.findOne({ organizationId });
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (!VALID_STATUSES.includes(workspace.subscriptionStatus)) {
      return res.status(403).json({
        message: 'Subscription inactive or past due',
      });
    }

    if (requiredPlan === 'team' && workspace.plan !== 'team') {
      return res.status(403).json({
        message: 'This feature requires the Team plan',
      });
    }

    req.workspace = workspace;
    next();
  };
}
