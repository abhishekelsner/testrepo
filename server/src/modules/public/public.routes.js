import { Router } from 'express';
import geoip from 'geoip-lite';
import * as proposalService from '../proposals/proposal.service.js';
import * as analyticsService from '../analytics/analytics.service.js';
import Proposal from '../proposals/proposal.model.js';

const router = Router();

/** Get visitor location from request IP (like Google Analytics). Returns { country, region, city } or null. */
function getLocationFromRequest(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;
  if (!ip || ip === '::1' || ip === '127.0.0.1') return null;
  const geo = geoip.lookup(ip);
  if (!geo) return null;
  return {
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
  };
}

/**
 * GET /api/public/proposals/by-id/:id/viewer-status?email=xxx
 * Check if email is allowed to view/accept and if they already accepted.
 */
router.get('/proposals/by-id/:id/viewer-status', async (req, res, next) => {
  try {
    const email = (req.query.email || '').trim();
    const result = await proposalService.getViewerStatus(req.params.id, email, { byId: true });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/proposals/by-id/:id/accept-agreement
 * Body: { email, fullName?, organization?, signatureDataUrl? }. Only sentTo recipients can accept.
 */
router.post('/proposals/by-id/:id/accept-agreement', async (req, res, next) => {
  try {
    const result = await proposalService.acceptAgreement(req.params.id, req.body || {}, { byId: true });
    res.json(result);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    if (err.status === 403) return res.status(403).json({ error: err.message });
    if (err.status === 404) return res.status(404).json({ error: 'Proposal not found' });
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

/**
 * GET /api/public/proposals/by-id/:id
 * Public view by proposal id — no auth. Returns proposal + blocks (only if published).
 */
router.get('/proposals/by-id/:id', async (req, res, next) => {
  try {
    const proposal = await proposalService.getProposalByIdForPublic(req.params.id);
    res.json(proposal);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Proposal not found' });
    next(err);
  }
});

/**
 * GET /api/public/proposals/:slug/viewer-status?email=xxx
 * Check if email is allowed to view/accept and if they already accepted.
 */
router.get('/proposals/:slug/viewer-status', async (req, res, next) => {
  try {
    const email = (req.query.email || '').trim();
    const result = await proposalService.getViewerStatus(req.params.slug, email, { byId: false });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/proposals/:slug/accept-agreement
 * Body: { email, fullName?, organization?, signatureDataUrl? }. Only sentTo recipients can accept.
 */
router.post('/proposals/:slug/accept-agreement', async (req, res, next) => {
  try {
    const result = await proposalService.acceptAgreement(req.params.slug, req.body || {}, { byId: false });
    res.json(result);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    if (err.status === 403) return res.status(403).json({ error: err.message });
    if (err.status === 404) return res.status(404).json({ error: 'Proposal not found' });
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

/**
 * GET /api/public/proposals/:slug
 * Public view — no auth. Returns proposal + blocks for the given slug (only if published).
 */
router.get('/proposals/:slug', async (req, res, next) => {
  try {
    const proposal = await proposalService.getProposalBySlug(req.params.slug);
    res.json(proposal);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Proposal not found' });
    next(err);
  }
});

/**
 * POST /api/public/proposals/:slug/events
 * Track analytics events from public view (no auth). Body: { event: 'open'|'close'|'click'|'section_view', payload: { sessionId, durationMs?, visitorId?, device?, browser?, ... } }.
 */
router.post('/proposals/:slug/events', async (req, res, next) => {
  try {
    const slug = (req.params.slug || '').toLowerCase().trim();
    const doc = await Proposal.findOne({ slug, status: 'published' }).select('organizationId _id').lean();
    if (!doc) return res.status(404).json({ error: 'Proposal not found' });
    const { event, payload } = req.body || {};
    if (!event || !['open', 'close', 'click', 'block_view', 'section_view'].includes(event)) {
      return res.status(400).json({ error: 'Invalid or missing event (open|close|click|block_view|section_view)' });
    }
    let finalPayload = payload && typeof payload === 'object' ? { ...payload } : {};
    if (event === 'open') {
      const location = getLocationFromRequest(req);
      if (location) {
        if (location.country) finalPayload.country = location.country;
        if (location.region) finalPayload.region = location.region;
        if (location.city) finalPayload.city = location.city;
      }
    }
    await analyticsService.createEvent(
      doc.organizationId.toString(),
      doc._id.toString(),
      slug,
      event,
      finalPayload
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
