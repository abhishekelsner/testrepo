import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './modules/auth/auth.routes.js';
import imageRoutes from './modules/images/image.routes.js';
import savedBlockRoutes from './modules/saved-blocks/saved-block.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import organizationRoutes from './modules/organizations/organization.routes.js';
import templateRoutes from './modules/templates/template.routes.js';
import proposalRoutes from './modules/proposals/proposal.routes.js';
import folderRoutes from './modules/folders/folder.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import billingRoutes from './routes/billing.js';
import workspaceRoutes from './routes/workspace.js';
import teamRoutes from './routes/team.js';
import { authenticate } from './modules/auth/auth.middleware.js';
import * as reportsService from './modules/reports/reports.service.js';
import { handleStripeWebhook } from './webhooks/stripeWebhook.js';
import zohoRoutes, { handleWebhook as handleZohoWebhook } from './routes/zohoRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireDb } from './middleware/requireDb.js';
import { requestLogger } from './middleware/requestLogger.js';
import { syncExpiredSubscriptions } from './utils/subscriptionHelper.js';

const app = express();

// Optional: run expiry sync every hour
setInterval(async () => {
  try {
    const count = await syncExpiredSubscriptions();
    if (count > 0) console.log(`[Cron] Marked ${count} subscription(s) as expired`);
  } catch (e) {
    console.error('[Cron] syncExpiredSubscriptions:', e.message);
  }
}, 60 * 60 * 1000);

const allowedOrigins = [
  process.env.WEB_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Dashboard'],
};

app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors());
app.use(requestLogger);

// Webhooks need raw body — register before express.json()
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);
app.post(
  '/api/zoho/webhook',
  requireDb,
  express.raw({ type: 'application/json' }),
  handleZohoWebhook
);

// Allow larger JSON payloads for e.g. base64 PDFs (Zoho send-document)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',          requireDb, authRoutes);
app.use('/api/images',        requireDb, imageRoutes);
app.use('/api/saved-blocks',  requireDb, savedBlockRoutes);
app.use('/api/organizations', requireDb, organizationRoutes);
app.use('/api/templates',     requireDb, templateRoutes);
app.use('/api/folders',       requireDb, folderRoutes);
app.use('/api/proposals',     requireDb, proposalRoutes);
app.use('/api/public',        requireDb, publicRoutes);

// Pipeline report: registered here so it's always available (same as reports router)
app.get('/api/reports/pipeline', requireDb, authenticate, async (req, res, next) => {
  try {
    const data = await reportsService.getPipelineReport(req.organizationId, {
      period: req.query.period,
      scope: req.query.scope,
      userId: req.userId,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});
app.use('/api/reports',       requireDb, reportsRoutes);

app.use('/api/analytics',     requireDb, analyticsRoutes);

app.use('/api/admin',         requireDb, adminRoutes);
app.use('/api/billing',       requireDb, billingRoutes);
app.use('/api/workspace',     requireDb, workspaceRoutes);
app.use('/api/team',          requireDb, teamRoutes);
app.use('/api/zoho',          requireDb, authenticate, zohoRoutes);

// 404 for any unmatched /api/* so the client gets JSON
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.method + ' ' + req.path });
});

app.use(errorHandler);

export default app;
