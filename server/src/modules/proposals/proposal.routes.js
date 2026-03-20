import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import * as proposalService from './proposal.service.js';

const router = Router();

// All proposal routes require authentication
router.use(authenticate);

/**
 * GET /api/proposals/deleted
 * List soft-deleted proposals. Query: skip, limit (default limit 20, max 100).
 */
router.get(
  '/deleted',
  async (req, res, next) => {
    try {
      const skip = parseInt(req.query.skip, 10);
      const limit = parseInt(req.query.limit, 10);
      const result = await proposalService.listDeletedProposals(req.organizationId, {
        skip: Number.isFinite(skip) ? skip : 0,
        limit: Number.isFinite(limit) ? limit : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/proposals/:id/restore
 * Restore a soft-deleted proposal.
 */
router.post(
  '/:id/restore',
  requireRole('Admin', 'Owner', 'Creator'),
  async (req, res, next) => {
    try {
      const proposal = await proposalService.restoreProposal(req.organizationId, req.params.id);
      res.json(proposal);
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * GET /api/proposals
 * List all proposals for the authenticated user's org.
 * Query: folderId (optional) — 'pages' or 'custom-<id>' to filter by folder.
 */
router.get('/', async (req, res, next) => {
  try {
    const folderId = req.query.folderId;
    const proposals = await proposalService.listProposals(req.organizationId, {
      folderId,
      userId: req.userId,
      role: req.role,
      email: req.user?.email,
    });
    res.json(proposals);
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message });
    if (err.status === 403) return res.status(403).json({ error: err.message });
    next(err);
  }
});

/**
 * GET /api/proposals/shared-with-me
 * List proposals shared with the authenticated user's email.
 */
router.get('/shared-with-me', async (req, res, next) => {
  try {
    const list = await proposalService.listSharedWithMe(req.user?.email);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/proposals
 * Create a new proposal — Creator, Admin, Owner only.
 * Body: { title?, templateId?, cloneFromId? }
 */
router.post(
  '/',
  requireRole('Creator', 'Admin', 'Owner'),
  async (req, res, next) => {
    try {
      const { title, templateId, cloneFromId, folderId } = req.body;
      const proposal = await proposalService.createProposal(req.organizationId, req.userId, {
        title,
        templateId,
        cloneFromId,
        folderId,
      });
      res.status(201).json(proposal);
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: err.message });
      if (err.status === 400) return res.status(400).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * GET /api/proposals/:id
 * Get a single proposal by id.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const proposal = await proposalService.getProposal(req.organizationId, req.params.id, {
      userId: req.userId,
      role: req.role,
      email: req.user?.email,
    });
    res.json(proposal);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    if (err.status === 403) return res.status(403).json({ error: err.message });
    next(err);
  }
});

/**
 * PUT /api/proposals/:id
 * Update proposal title, blocks, or variables — Creator, Admin, Owner only.
 * Body: { title?, blocks?, variables?, status? }
 */
router.put(
  '/:id',
  requireRole('Creator', 'Admin', 'Owner'),
  async (req, res, next) => {
    try {
      const { title, blocks, variables, folderId, starred, tags, engagement, status } = req.body;
      const proposal = await proposalService.updateProposal(req.organizationId, req.userId, req.params.id, {
        title,
        blocks,
        variables,
        status,
        actorRole: req.role,
        actorEmail: req.user?.email,
        folderId,
        starred,
        tags,
        engagement,
      });
      res.json(proposal);
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      if (err.status === 403) return res.status(403).json({ error: err.message });
      if (err.status === 400) return res.status(400).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * GET /api/proposals/:id/collaborators
 * List collaborators for a proposal.
 */
router.get('/:id/collaborators', async (req, res, next) => {
  try {
    const data = await proposalService.listCollaborators(req.organizationId, req.params.id, {
      userId: req.userId,
      role: req.role,
      email: req.user?.email,
    });
    res.json(data);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    if (err.status === 403) return res.status(403).json({ error: err.message });
    next(err);
  }
});

/**
 * POST /api/proposals/:id/collaborators
 * Add collaborator by email to a proposal.
 */
router.post(
  '/:id/collaborators',
  requireRole('Creator', 'Admin', 'Owner', 'Super_Admin'),
  async (req, res, next) => {
    try {
      const data = await proposalService.addCollaborator(req.organizationId, req.params.id, req.body?.email, {
        userId: req.userId,
        role: req.role,
      });
      res.json(data);
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      if (err.status === 403) return res.status(403).json({ error: err.message });
      if (err.status === 400) return res.status(400).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * DELETE /api/proposals/:id/collaborators
 * Remove collaborator by email from a proposal.
 */
router.delete(
  '/:id/collaborators',
  requireRole('Creator', 'Admin', 'Owner', 'Super_Admin'),
  async (req, res, next) => {
    try {
      const email = req.body?.email || req.query?.email;
      const data = await proposalService.removeCollaborator(req.organizationId, req.params.id, email, {
        userId: req.userId,
        role: req.role,
      });
      res.json(data);
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      if (err.status === 403) return res.status(403).json({ error: err.message });
      if (err.status === 400) return res.status(400).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * POST /api/proposals/:id/publish
 * Publish a proposal — sets status to published and generates slug.
 */
router.post(
  '/:id/publish',
  requireRole('Creator', 'Admin', 'Owner'),
  async (req, res, next) => {
    try {
      const proposal = await proposalService.publishProposal(req.organizationId, req.params.id, {
        userId: req.userId,
        role: req.role,
        email: req.user?.email,
      });
      res.json(proposal);
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      if (err.status === 403) return res.status(403).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * POST /api/proposals/:id/send-email
 * Send proposal link to an email address. Proposal must be published.
 * Body: { to: string, message?: string }
 */
router.post(
  '/:id/send-email',
  requireRole('Creator', 'Admin', 'Owner'),
  async (req, res, next) => {
    try {
      const { to, message } = req.body;
      await proposalService.sendProposalEmail(
        req.organizationId,
        req.params.id,
        { to, message },
        {
          userId: req.userId,
          role: req.role,
          email: req.user?.email,
        }
      );
      res.json({ message: 'Email sent' });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      if (err.status === 403) return res.status(403).json({ error: err.message });
      if (err.status === 400) return res.status(400).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * DELETE /api/proposals/:id
 * Delete a proposal — Admin, Owner only.
 */
router.delete(
  '/:id',
  requireRole('Admin', 'Owner'),
  async (req, res, next) => {
    try {
      await proposalService.deleteProposal(req.organizationId, req.params.id);
      res.status(204).send();
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      next(err);
    }
  }
);

export default router;
