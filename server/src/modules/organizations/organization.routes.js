import { Router } from 'express';
import * as orgService from './organization.service.js';
import * as inviteService from './invite.service.js';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import { logEvent } from '../auth/audit.service.js';

const router = Router();

router.use(authenticate);

router.get('/current', async (req, res, next) => {
  try {
    const org = await orgService.getCurrent(req.organizationId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

router.put('/current', requireRole('Admin'), async (req, res, next) => {
  try {
    const org = await orgService.updateCurrent(req.organizationId, req.body);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

router.get('/current/members', async (req, res, next) => {
  try {
    const members = await orgService.getMembers(req.organizationId);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.put('/current/members/:userId/role', requireRole('Admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role: newRole } = req.body;
    if (!newRole) return res.status(400).json({ error: 'role is required' });
    const member = await orgService.updateMemberRole(
      req.organizationId,
      userId,
      newRole,
      req.user
    );
    logEvent({
      event: 'role_changed',
      userId: req.userId,
      organizationId: req.organizationId,
      req,
      metadata: { targetUserId: userId, newRole },
    });
    res.json(member);
  } catch (err) {
    next(err);
  }
});

// Invite endpoints — Admin only
router.post('/current/invites', requireRole('Admin'), async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const validRoles = ['Admin', 'Creator'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
    }
    const invite = await inviteService.createInvite({
      organizationId: req.organizationId,
      email,
      role: role || 'Creator',
      invitedBy: req.userId,
    });
    logEvent({
      event: 'invite_sent',
      userId: req.userId,
      organizationId: req.organizationId,
      email: invite.email,
      req,
      metadata: { role: invite.role },
    });
    res.status(201).json(invite);
  } catch (err) {
    next(err);
  }
});

router.get('/current/invites', requireRole('Admin'), async (req, res, next) => {
  try {
    const invites = await inviteService.listInvites(req.organizationId);
    res.json(invites);
  } catch (err) {
    next(err);
  }
});

export default router;
