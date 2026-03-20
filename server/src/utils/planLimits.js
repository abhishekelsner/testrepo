import { AppError } from './AppError.js';

/**
 * Plan-based member limits. Used at invite time to block over-seat usage.
 * single = 1 user (owner only); team = 10 users.
 */
export const PLAN_LIMITS = { single: 1, team: 10 };

/**
 * Throws AppError(403) if workspace has reached its member limit.
 * @param {object} workspace - Workspace doc (or plain object with plan)
 * @param {number} memberCount - Current number of members (e.g. User.countDocuments)
 */
export function enforceUserLimit(workspace, memberCount) {
  const limit = PLAN_LIMITS[workspace.plan] ?? PLAN_LIMITS.single;
  if (memberCount >= limit) {
    const msg =
      workspace.plan === 'single'
        ? 'Single plan allows only 1 user. Upgrade to Team.'
        : 'Team plan limit of 10 users reached.';
    throw new AppError(msg, 403);
  }
}
