import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import * as settingsService from './settings.service.js';

const router = Router();

router.use(authenticate, requireRole('Admin'));

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const updated = await settingsService.setStripeSettings(req.body);
    res.json(updated);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

export default router;
