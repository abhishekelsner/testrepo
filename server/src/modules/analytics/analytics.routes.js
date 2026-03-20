/**
 * Analytics routes — proposal analytics.
 */
import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as analyticsService from './analytics.service.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/analytics/proposals/:id
 * Returns analytics for a proposal (views, timeline, viewsByDay, sessions, sessionsByDay).
 * Query: range=1w|1m|1y to filter events by date.
 */
router.get('/proposals/:id', async (req, res, next) => {
  try {
    const range = ['1w', '1m', '1y'].includes(req.query.range) ? req.query.range : undefined;
    const data = await analyticsService.getProposalAnalytics(
      req.organizationId,
      req.params.id,
      { range }
    );
    if (!data) return res.status(404).json({ error: 'Proposal not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
