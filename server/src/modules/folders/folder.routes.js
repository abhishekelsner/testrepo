import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import * as folderService from './folder.service.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/folders
 * List folders for the logged-in user (current org).
 */
router.get('/', async (req, res, next) => {
  try {
    const folders = await folderService.listFolders(req.organizationId, req.userId);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/folders
 * Body: { name: string }
 */
router.post('/', async (req, res, next) => {
  try {
    const folder = await folderService.createFolder(req.organizationId, req.userId, req.body?.name);
    res.status(201).json(folder);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

/**
 * PUT /api/folders/:id
 * Body: { name: string }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const folder = await folderService.updateFolder(req.organizationId, req.userId, req.params.id, {
      name: req.body?.name,
    });
    res.json(folder);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    if (err.status === 404) return res.status(404).json({ error: err.message });
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

/**
 * DELETE /api/folders/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await folderService.deleteFolder(req.organizationId, req.userId, req.params.id);
    res.json(result);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
});

export default router;
