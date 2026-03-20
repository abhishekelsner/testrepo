import { Router } from 'express';
import { authenticate } from '../modules/auth/auth.middleware.js';
import * as billingController from '../controllers/billingController.js';

const router = Router();

/**
 * All routes require JWT. Use req.organizationId (set by authenticate) to resolve workspace.
 * Webhook is registered separately in app.js with express.raw() so body is not parsed as JSON.
 */
router.post('/create-checkout-session', authenticate, billingController.createCheckoutSession);
router.post('/confirm-session', authenticate, billingController.confirmCheckoutSession);
router.get('/status', authenticate, billingController.getBillingStatus);
router.post('/sync', authenticate, billingController.syncSubscriptionFromStripe);
router.post('/cancel', authenticate, billingController.cancelSubscription);

export default router;
