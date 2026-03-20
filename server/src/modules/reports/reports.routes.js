import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as reportsService from './reports.service.js';

const router = Router();

/**
 * GET /api/reports — health check (no auth) so we can confirm the reports module is mounted.
 */
router.get('/', (req, res) => {
  res.json({ module: 'reports', pipeline: '/api/reports/pipeline' });
});

router.use(authenticate);

/**
 * GET /api/reports/pipeline
 * Pipeline report data for the current org (proposal counts, accept rate, time series).
 */
router.get('/pipeline', async (req, res, next) => {
  try {
    const data = await reportsService.getPipelineReport(req.organizationId, {
      period: req.query.period,
      scope: req.query.scope,
      createdBy: req.query.createdBy,
      activeOnly: req.query.activeOnly,
      userId: req.userId,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
