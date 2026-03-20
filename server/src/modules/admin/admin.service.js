/**
 * Super Admin dashboard: platform-wide stats, users, subscriptions, activity.
 * All queries are cross-organization (no organizationId filter).
 */
import User from '../users/user.model.js';
import Workspace from '../../models/Workspace.js';
import SubscriptionPayment from '../../models/SubscriptionPayment.js';
import AuditLog from '../auth/auditLog.model.js';
import Organization from '../organizations/organization.model.js';

/** Dashboard stats: total users, active subs count, total revenue, new signups 7d */
export async function getDashboardStats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeSubscriptions,
    revenueResult,
    newSignups7d,
  ] = await Promise.all([
    User.countDocuments(),
    Workspace.countDocuments({
      subscriptionStatus: { $in: ['active', 'trialing'] },
    }),
    SubscriptionPayment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then((r) => (r[0]?.total ?? 0)),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
  ]);

  return {
    totalUsers,
    activeSubscriptions,
    totalRevenue: revenueResult,
    newSignups7d,
    /** Revenue is from paying subscribers; same count as active subs for context */
    revenueFromSubscribingUsers: revenueResult,
    subscribingUsersCount: activeSubscriptions,
  };
}

/** List users with org name, role, createdAt. For dashboard table. */
export async function getDashboardUsers(options = {}) {
  const limit = Math.min(parseInt(options.limit, 10) || 50, 200);
  const skip = parseInt(options.skip, 10) || 0;
  const search = (options.search || '').trim().toLowerCase();

  const match = {};
  if (search) {
    match.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(match)
      .populate('organizationId', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(match),
  ]);

  const workspaceByOrg = await Workspace.find({
    organizationId: { $in: users.map((u) => u.organizationId?._id).filter(Boolean) },
  })
    .lean()
    .then((list) => {
      const map = {};
      list.forEach((w) => { map[w.organizationId.toString()] = w; });
      return map;
    });

  const items = users.map((u) => {
    const orgId = u.organizationId?._id?.toString();
    const ws = orgId ? workspaceByOrg[orgId] : null;
    return {
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      organizationName: u.organizationId?.name ?? '—',
      organizationSlug: u.organizationId?.slug ?? null,
      plan: ws?.plan ?? 'single',
      subscriptionStatus: ws?.subscriptionStatus ?? 'inactive',
    };
  });
  return { items, total };
}

/** List workspaces (subscriptions) with org, plan, period, status. */
export async function getDashboardSubscriptions(options = {}) {
  const limit = Math.min(parseInt(options.limit, 10) || 50, 200);
  const skip = parseInt(options.skip, 10) || 0;
  const statusFilter = options.status; // 'active' | 'inactive' | 'trialing' | 'past_due' | 'all'

  const match = {};
  if (statusFilter && statusFilter !== 'All' && statusFilter !== 'all') {
    match.subscriptionStatus = statusFilter;
  }

  const workspaces = await Workspace.find(match)
    .populate('organizationId', 'name slug')
    .populate('ownerId', 'name email')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return workspaces.map((w) => ({
    id: w._id.toString(),
    organizationName: w.organizationId?.name ?? '—',
    organizationSlug: w.organizationId?.slug ?? null,
    ownerName: w.ownerId?.name ?? '—',
    ownerEmail: w.ownerId?.email ?? null,
    plan: w.plan,
    subscriptionStatus: w.subscriptionStatus,
    currentPeriodStart: w.currentPeriodStart,
    currentPeriodEnd: w.currentPeriodEnd,
    cancelAtPeriodEnd: w.cancelAtPeriodEnd ?? false,
    billingEmail: w.billingEmail ?? w.ownerId?.email ?? null,
  }));
}

/** List all subscription payments with user/workspace details for admin. */
export async function getDashboardPayments(options = {}) {
  const limit = Math.min(parseInt(options.limit, 10) || 100, 500);
  const skip = parseInt(options.skip, 10) || 0;

  const payments = await SubscriptionPayment.find({})
    .sort({ paidAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'workspaceId',
      populate: [
        { path: 'ownerId', select: 'name email' },
        { path: 'organizationId', select: 'name slug' },
      ],
    })
    .lean();

  const total = await SubscriptionPayment.countDocuments();

  const items = payments.map((p) => {
    const ws = p.workspaceId || {};
    const owner = ws.ownerId || {};
    const org = ws.organizationId || {};
    const paidBy = ws.billingEmail || owner.email || owner.name || org.name || '—';
    const paidByName = owner.name ? `${owner.name} (${paidBy})` : paidBy;
    return {
      id: p._id.toString(),
      amount: p.amount,
      currency: (p.currency || 'usd').toUpperCase(),
      status: p.status,
      paidAt: p.paidAt,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      stripeInvoiceId: p.stripeInvoiceId,
      description: p.description,
      paidBy,
      paidByName,
      organizationName: org.name ?? '—',
      workspaceName: ws.name ?? '—',
    };
  });

  return { items, total };
}

/** Recent activity from audit log + recent payments. */
export async function getDashboardActivity(limit = 20) {
  const cap = Math.min(parseInt(limit, 10) || 20, 100);

  const [logs, recentPayments] = await Promise.all([
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(cap)
      .populate('userId', 'name email')
      .lean(),
    SubscriptionPayment.find({ status: 'paid' })
      .sort({ paidAt: -1 })
      .limit(10)
      .populate('workspaceId')
      .lean(),
  ]);

  const byDate = [];
  logs.forEach((l) => {
    const user = l.userId;
    let type = 'other';
    let meta = l.event;
    if (l.event === 'register') type = 'new_user';
    else if (l.event === 'login') type = 'login';
    else if (l.event === 'invite_accepted') type = 'new_user';
    else if (l.event === 'role_changed') type = 'role_changed';
    byDate.push({
      type,
      actor: user?.name || l.email || '—',
      meta,
      time: l.createdAt,
      avatar: user?.name ? user.name.slice(0, 2).toUpperCase() : (l.email || '—').slice(0, 2).toUpperCase(),
    });
  });

  recentPayments.forEach((p) => {
    const ws = p.workspaceId;
    byDate.push({
      type: 'payment',
      actor: ws?.billingEmail || 'Customer',
      meta: `Payment $${(p.amount || 0).toFixed(2)} (${p.currency || 'usd'})`,
      time: p.paidAt,
      avatar: (ws?.billingEmail || 'P').slice(0, 2).toUpperCase(),
    });
  });

  byDate.sort((a, b) => new Date(b.time) - new Date(a.time));
  return byDate.slice(0, cap);
}

/** Chart data: last 12 months — users count, subscriptions count, revenue. */
export async function getDashboardChartData() {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }

  const result = await Promise.all(
    months.map(async (m) => {
      const [users, paymentStats, revenue] = await Promise.all([
        User.countDocuments({
          createdAt: { $gte: m.start, $lte: m.end },
        }),
        SubscriptionPayment.countDocuments({
          status: 'paid',
          paidAt: { $gte: m.start, $lte: m.end },
        }),
        SubscriptionPayment.aggregate([
          {
            $match: {
              status: 'paid',
              paidAt: { $gte: m.start, $lte: m.end },
            },
          },
          { $group: { _id: null, sum: { $sum: '$amount' } } },
        ]).then((r) => (r[0]?.sum ?? 0)),
      ]);

      return {
        month: m.month,
        users,
        subs: paymentStats,
        revenue: Math.round(revenue * 100) / 100,
      };
    })
  );

  return result;
}
