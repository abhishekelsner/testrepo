import { Router } from 'express';
import { authenticate, requireRole } from '../modules/auth/auth.middleware.js';
import * as inviteController from '../controllers/inviteController.js';

const router = Router();

router.use(authenticate);

router.post('/invite', requireRole('Admin', 'Super_Admin'), inviteController.inviteTeamMember);
// Any org member can see who is on the team; invite/remove stay admin-only.
router.get('/members', inviteController.getTeamMembers);
router.delete('/members/:userId', requireRole('Admin', 'Super_Admin'), inviteController.removeTeamMember);

export default router;
