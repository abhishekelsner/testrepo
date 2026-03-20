import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import * as templateService from './template.service.js';

const router = Router();

// All template routes require authentication
router.use(authenticate);

/**
 * GET /api/templates
 * List templates for the current user only (same org + createdBy).
 */
router.get('/', async (req, res, next) => {
  try {
    if (!req.organizationId || !req.userId) {
      return res.status(403).json({ error: 'Organization and user context required' });
    }
    const { type, folderId } = req.query;
    const templates = await templateService.listTemplates(req.organizationId, req.userId, { type, folderId });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/templates
 * Create a template — Creator, Admin, Owner only.
 */
router.post(
  '/',
  requireRole('Creator', 'Admin', 'Owner'),
  async (req, res, next) => {
    try {
      if (!req.organizationId || !req.userId) {
        return res.status(403).json({ error: 'Organization and user context required' });
      }
      const { name, type, blocks, variables, folderId } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });
      const template = await templateService.createTemplate(req.organizationId, req.userId, {
        name,
        type,
        blocks,
        variables,
        folderId,
      });
      res.status(201).json(template);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/templates/:id
 * Get a single template by id (only owner).
 */
router.get('/:id', async (req, res, next) => {
  try {
    if (!req.organizationId || !req.userId) {
      return res.status(403).json({ error: 'Organization and user context required' });
    }
    const template = await templateService.getTemplate(req.organizationId, req.userId, req.params.id);
    res.json(template);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
});

/**
 * PUT /api/templates/:id
 * Update a template — Creator, Admin, Owner only.
 */
router.put(
  '/:id',
  requireRole('Creator', 'Admin', 'Owner'),
  async (req, res, next) => {
    try {
      if (!req.organizationId || !req.userId) {
        return res.status(403).json({ error: 'Organization and user context required' });
      }
      const { name, blocks, variables, folderId } = req.body;
      const template = await templateService.updateTemplate(req.organizationId, req.userId, req.params.id, {
        name,
        blocks,
        variables,
        folderId,
      });
      res.json(template);
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      next(err);
    }
  }
);

/**
 * DELETE /api/templates/:id
 * Delete a template — Admin, Owner only.
 */
router.delete(
  '/:id',
  requireRole('Admin', 'Owner'),
  async (req, res, next) => {
    try {
      if (!req.organizationId || !req.userId) {
        return res.status(403).json({ error: 'Organization and user context required' });
      }
      await templateService.deleteTemplate(req.organizationId, req.userId, req.params.id);
      res.status(204).send();
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ error: err.message });
      next(err);
    }
  }
);

export default router;
