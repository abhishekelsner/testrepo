import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import AuditLog from '../auth/auditLog.model.js';
import Subscription from '../../models/Subscription.js';
import SubscriptionPayment from '../../models/SubscriptionPayment.js';
import User from '../users/user.model.js';
import { syncExpiredSubscriptions } from '../../utils/subscriptionHelper.js';
import * as adminService from './admin.service.js';

const router = Router();

/** GET /api/admin/dashboard-stats — totalRevenue = sum of ALL subscription payments (lifetime) */
router.get('/dashboard-stats', async (req, res, next) => {
  try {
    await syncExpiredSubscriptions();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      totalSubscriptions,
      activeSubscriptions,
      lifetimeRevenueAgg,
      recentSignups,
      monthlyData,
    ] = await Promise.all([
      User.countDocuments(),
      Subscription.countDocuments(),
      Subscription.countDocuments({ paymentStatus: 'active' }),
      // Lifetime revenue = sum of every subscription payment ever (SubscriptionPayment table)
      SubscriptionPayment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Subscription.aggregate([
        {
          $group: {
            _id: { year: { $year: '$startDate' }, month: { $month: '$startDate' } },
            count: { $sum: 1 },
            revenue: { $sum: '$amountPaid' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
    ]);

    res.json({
      success: true,
      totalUsers,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue: lifetimeRevenueAgg[0]?.total ?? 0,
      recentSignups,
      monthlyData,
    });
  } catch (err) {
    console.error('[GET /admin/dashboard-stats]', err.message);
    next(err);
  }
});

/** GET /api/admin/subscriptions — Subscription list with user/org populated (spec) */
router.get('/subscriptions', async (req, res, next) => {
  try {
    await syncExpiredSubscriptions();
    const status = req.query.status;
    const plan = req.query.plan;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (status && status !== 'All') filter.paymentStatus = status.toLowerCase();
    if (plan && plan !== 'All') filter.planType = plan;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate('userId', 'name email')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    const data = subscriptions.map((sub) => ({
      id: sub._id.toString(),
      subscriptionId: sub.stripeSubscriptionId ?? sub.stripePaymentIntentId ?? sub._id.toString(),
      userName: sub.userId?.name ?? 'Unknown',
      email: sub.userId?.email ?? 'Unknown',
      organizationName: sub.organizationId?.name ?? '—',
      planType: sub.planType,
      amountPaid: `$${Number(sub.amountPaid).toFixed(2)}`,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: sub.paymentStatus,
      currency: sub.currency,
    }));

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data,
    });
  } catch (err) {
    console.error('[GET /admin/subscriptions]', err.message);
    next(err);
  }
});

/** Dashboard routes: public so admin panel (no auth) can show real DB data */
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard/users', async (req, res, next) => {
  try {
    const { items, total } = await adminService.getDashboardUsers({
      search: req.query.search,
      limit: req.query.limit,
      skip: req.query.skip,
    });
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard/subscriptions', async (req, res, next) => {
  try {
    const list = await adminService.getDashboardSubscriptions({
      status: req.query.status,
      limit: req.query.limit,
      skip: req.query.skip,
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard/activity', async (req, res, next) => {
  try {
    const activity = await adminService.getDashboardActivity(req.query.limit);
    res.json(activity);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard/chart', async (req, res, next) => {
  try {
    const data = await adminService.getDashboardChartData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard/payments', async (req, res, next) => {
  try {
    const result = await adminService.getDashboardPayments({
      limit: req.query.limit,
      skip: req.query.skip,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** Audit logs: protected (Super_Admin only) */
router.get('/audit-logs', authenticate, requireRole('Super_Admin'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;
    const event = req.query.event || null;

    const filter = {};
    if (event) filter.event = event;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ items: logs, total, skip, limit });
  } catch (err) {
    next(err);
  }
});

export default router;
