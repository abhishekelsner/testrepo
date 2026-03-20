import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as savedBlockService from './saved-block.service.js';

const router = Router();

// All saved-block routes require authentication
router.use(authenticate);

/**
 * GET /api/saved-blocks
 * List saved blocks for the current user only.
 */
router.get('/', async (req, res, next) => {
  try {
    const blocks = await savedBlockService.listSavedBlocks(req.userId, req.organizationId);
    res.json(blocks);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/saved-blocks
 * Save a block to the library.
 * Body: { name, type, content, background? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, type, content, background } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
    const block = await savedBlockService.createSavedBlock(
      req.userId, req.organizationId,
      { name, type, content, background }
    );
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/saved-blocks/:id
 * Rename a saved block (owner only).
 * Body: { name }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const block = await savedBlockService.updateSavedBlock(
      req.userId, req.organizationId,
      req.params.id, { name }
    );
    res.json(block);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
});

/**
 * DELETE /api/saved-blocks/:id
 * Delete a saved block (owner only).
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await savedBlockService.deleteSavedBlock(req.userId, req.organizationId, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
});

export default router;
