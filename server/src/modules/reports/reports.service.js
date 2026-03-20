/**
 * Pipeline report — aggregate proposal data for the org (excludes soft-deleted).
 */
import mongoose from 'mongoose';
import Proposal from '../proposals/proposal.model.js';
import Payment from '../payments/payment.model.js';
import User from '../users/user.model.js';

function toObjectId(id) {
  if (!id) return null;
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

/** Active (non-deleted) proposals for this org; supports scope + specific member/admin filter. */
function buildProposalQuery(organizationId, scope, userId, createdById, activeOnly = true) {
  const oid = toObjectId(organizationId);
  const q = {
    organizationId: oid,
  };
  if (activeOnly) {
    q.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];
  }
  if (scope === 'mine' && userId) {
    q.createdBy = toObjectId(userId);
  }
  if (createdById) {
    q.createdBy = toObjectId(createdById);
  }
  return q;
}

function formatMonthShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase().replace(' ', ', ');
}

function parseDealValueDollars(variables) {
  if (!variables || typeof variables !== 'object') return null;
  const raw =
    variables['Deal Value'] ??
    variables['deal value'] ??
    variables.dealValue ??
    null;
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function ts(d) {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Six chart buckets for the selected period (oldest → newest).
 * @param {'Week'|'Month'|'Quarter'|'Year'} period
 */
function getPeriodBuckets(period) {
  const now = new Date();
  const buckets = [];

  if (period === 'Week') {
    for (let i = 5; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      buckets.push({
        label: `${start.getMonth() + 1}/${String(start.getDate()).padStart(2, '0')}`,
        start: start.getTime(),
        end: end.getTime(),
      });
    }
    return buckets;
  }

  if (period === 'Year') {
    const y0 = now.getFullYear();
    for (let i = 5; i >= 0; i--) {
      const year = y0 - i;
      buckets.push({
        label: String(year),
        start: new Date(year, 0, 1).getTime(),
        end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
      });
    }
    return buckets;
  }

  if (period === 'Quarter') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const q = Math.floor(d.getMonth() / 3);
      const y = d.getFullYear();
      const startMonth = q * 3;
      buckets.push({
        label: `Q${q + 1} ${y}`,
        start: new Date(y, startMonth, 1).getTime(),
        end: new Date(y, startMonth + 3, 0, 23, 59, 59, 999).getTime(),
      });
    }
    return buckets;
  }

  // Month (default)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: formatMonthShort(d),
      start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime(),
    });
  }
  return buckets;
}

/**
 * @param {string} organizationId
 * @param {{ period?: string, scope?: string, userId?: string, createdBy?: string, activeOnly?: boolean|string }} [options]
 */
export async function getPipelineReport(organizationId, options = {}) {
  const periodRaw = options.period || 'Month';
  const period = ['Week', 'Month', 'Quarter', 'Year'].includes(periodRaw) ? periodRaw : 'Month';
  const scope = options.scope === 'mine' ? 'mine' : 'everyone';
  const userId = options.userId || null;
  const activeOnly = String(options.activeOnly ?? 'true') !== 'false';
  const requestedCreatedBy = options.createdBy || null;
  let createdBy = null;
  if (requestedCreatedBy && mongoose.isValidObjectId(requestedCreatedBy)) {
    // Guard against cross-org leakage when filtering by a specific member.
    const member = await User.findOne({
      _id: requestedCreatedBy,
      organizationId: toObjectId(organizationId),
    })
      .select('_id')
      .lean();
    if (member?._id) {
      createdBy = member._id.toString();
    }
  }

  const query = buildProposalQuery(organizationId, scope, userId, createdBy, activeOnly);
  const proposals = await Proposal.find(query).lean();
  const oidOrg = toObjectId(organizationId);

  const all = proposals.length;
  const draft = proposals.filter((p) => p.status === 'draft').length;
  const published = proposals.filter((p) => p.status === 'published').length;
  const accepted = proposals.filter((p) => p.status === 'accepted').length;
  const declined = proposals.filter((p) => p.status === 'declined').length;
  const closed = accepted + declined;

  const liveCount = published;
  const allPct = all ? 100 : 0;
  const livePct = all ? Math.round((liveCount / all) * 100) : 0;
  const closedPct = all ? Math.round((closed / all) * 100) : 0;

  const nowMs = Date.now();
  const withLiveTime = proposals.filter((p) => p.status !== 'draft');
  let avgTimeLiveDays = 0;
  if (withLiveTime.length > 0) {
    const totalDays = withLiveTime.reduce((sum, p) => {
      const end = p.updatedAt ? ts(p.updatedAt) : nowMs;
      const start = ts(p.createdAt);
      return sum + Math.max(0, end - start) / (1000 * 60 * 60 * 24);
    }, 0);
    avgTimeLiveDays = Math.round(totalDays / withLiveTime.length);
  }

  const closedTotal = accepted + declined;
  const acceptRate = closedTotal > 0 ? ((accepted / closedTotal) * 100).toFixed(2) : '0.00';

  const buckets = getPeriodBuckets(period);

  /** Accepted proposals whose updatedAt falls in bucket (approx. close period) */
  const acceptsPerBucket = buckets.map((b) =>
    proposals.filter(
      (p) =>
        p.status === 'accepted' &&
        ts(p.updatedAt) >= b.start &&
        ts(p.updatedAt) <= b.end
    ).length
  );
  const salesVelocity =
    acceptsPerBucket.length > 0
      ? (acceptsPerBucket.reduce((a, b) => a + b, 0) / acceptsPerBucket.length).toFixed(1)
      : '0.0';

  const statusHistory = buckets.map((b) => {
    const inMonth = proposals.filter((p) => {
      const t = ts(p.createdAt);
      return t >= b.start && t <= b.end;
    });
    return {
      month: b.label,
      draft: inMonth.filter((p) => p.status === 'draft').length,
      published: inMonth.filter((p) => p.status === 'published').length,
      accepted: inMonth.filter((p) => p.status === 'accepted').length,
      declined: inMonth.filter((p) => p.status === 'declined').length,
      total: inMonth.length,
    };
  });

  const velocityHistory = buckets.map((b) => {
    const inMonth = proposals.filter((p) => {
      const t = ts(p.createdAt);
      return t >= b.start && t <= b.end && p.status !== 'draft';
    });
    if (inMonth.length === 0) return { month: b.label, avgDays: 0 };
    const totalDays = inMonth.reduce((sum, p) => {
      const endT = p.updatedAt ? ts(p.updatedAt) : nowMs;
      return sum + Math.max(0, endT - ts(p.createdAt)) / (1000 * 60 * 60 * 24);
    }, 0);
    return { month: b.label, avgDays: Math.round(totalDays / inMonth.length) };
  });

  /** Avg paid revenue per proposal that has ≥1 paid payment (USD); else avg Deal Value from variables */
  let avgPageValue = '0.0';
  const proposalIds = proposals.map((p) => p._id);
  if (proposalIds.length > 0) {
    const paidAgg = await Payment.aggregate([
      {
        $match: {
          organizationId: oidOrg,
          proposalId: { $in: proposalIds },
          status: 'paid',
        },
      },
      { $group: { _id: '$proposalId', totalCents: { $sum: '$amount' } } },
    ]);
    if (paidAgg.length > 0) {
      const sumCents = paidAgg.reduce((s, x) => s + x.totalCents, 0);
      avgPageValue = (sumCents / paidAgg.length / 100).toFixed(1);
    } else {
      const dealVals = proposals.map((p) => parseDealValueDollars(p.variables)).filter((v) => v != null);
      if (dealVals.length > 0) {
        avgPageValue = (dealVals.reduce((a, b) => a + b, 0) / dealVals.length).toFixed(1);
      }
    }
  }

  return {
    overview: {
      all,
      live: liveCount,
      closed,
      draft,
      published,
      accepted,
      declined,
      allPct,
      livePct,
      closedPct,
      avgTimeLiveDays,
      acceptRate,
      salesVelocity: Number(salesVelocity),
      avgPageValue,
    },
    velocityHistory,
    statusHistory,
    meta: {
      period,
      scope,
      createdBy: createdBy || null,
      activeOnly,
      generatedAt: new Date().toISOString(),
      proposalCount: all,
    },
  };
}
