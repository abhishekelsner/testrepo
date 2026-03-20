/**
 * Analytics service — returns proposal analytics from proposal + optional events.
 * When AnalyticsEvents exist: views = open count, avgTimeSec from close.durationMs, interactions = click count.
 * Optional range (1w|1m|1y) filters events by date. Returns viewsByDay, sessions, sessionsByDay for charts and viewers.
 * Public proposal view sends open/close/click via createEvent (POST public/proposals/:slug/events).
 */
import Proposal from '../proposals/proposal.model.js';
import AnalyticsEvent from './analyticsEvent.model.js';

/**
 * Create a single analytics event (public view — no auth). Called from POST /api/public/proposals/:slug/events.
 * @param {string} organizationId
 * @param {string} proposalId - proposal ObjectId string
 * @param {string} [proposalSlug]
 * @param {string} event - 'open' | 'close' | 'click'
 * @param {object} [payload] - e.g. { sessionId, durationMs, visitorId, device, browser, country, region, userId, email }
 */
export async function createEvent(organizationId, proposalId, proposalSlug, event, payload = {}) {
  if (!['open', 'close', 'click', 'block_view', 'section_view'].includes(event)) {
    throw new Error('Invalid event type');
  }
  const mongoose = (await import('mongoose')).default;
  await AnalyticsEvent.create({
    organizationId: new mongoose.Types.ObjectId(organizationId),
    proposalId: new mongoose.Types.ObjectId(proposalId),
    proposalSlug: proposalSlug || undefined,
    event,
    payload: payload && typeof payload === 'object' ? payload : {},
  });
}

function getRangeDates(range) {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  if (range === '1w') from.setDate(from.getDate() - 7);
  else if (range === '1m') from.setMonth(from.getMonth() - 1);
  else if (range === '1y') from.setFullYear(from.getFullYear() - 1);
  return { from, to };
}

function toDateKey(d) {
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

function normalizeLocationFields(payload = {}) {
  return {
    city: payload.city || payload.city_name || null,
    region: payload.region || payload.state || payload.region_name || null,
    country: payload.country || payload.country_name || null,
  };
}

export async function getProposalAnalytics(organizationId, proposalId, options = {}) {
  const { range } = options;
  const proposal = await Proposal.findOne({
    _id: proposalId,
    organizationId,
  }).lean();

  if (!proposal) return null;

  const sentTo = proposal.sentTo || [];
  const proposalIdObj = proposal._id;

  const query = { organizationId, proposalId: proposalIdObj };
  if (range) {
    const { from, to } = getRangeDates(range);
    query.createdAt = { $gte: from, $lte: to };
  }

  const events = await AnalyticsEvent.find(query)
    .sort({ createdAt: -1 })
    .lean();

  const openEvents = events.filter((e) => e.event === 'open');
  const closeEvents = events.filter((e) => e.event === 'close');
  const clickEvents = events.filter((e) => e.event === 'click');
  const blockViewEvents = events.filter((e) => e.event === 'block_view');
  const sectionViewEvents = events.filter((e) => e.event === 'section_view');

  const views = openEvents.length > 0 ? openEvents.length : sentTo.length;
  let avgTimeSec = 0;
  if (closeEvents.length > 0) {
    const totalMs = closeEvents.reduce((sum, e) => sum + (e.payload?.durationMs || 0), 0);
    avgTimeSec = Math.round(totalMs / closeEvents.length / 1000);
  }
  const interactions = clickEvents.length;

  // interactionsByTarget: for Interactions tab table + donut (target/type from click payload)
  const targetCounts = {};
  clickEvents.forEach((e) => {
    const target = e.payload?.target ?? 'page';
    const type = e.payload?.type ?? 'click';
    const key = `${target}\t${type}`;
    targetCounts[key] = (targetCounts[key] || 0) + 1;
  });
  const interactionsByTarget = Object.entries(targetCounts).map(([key, count]) => {
    const [target, type] = key.split('\t');
    return { target, type, count };
  }).sort((a, b) => b.count - a.count);

  // timeByBlock: for Time spent tab table + donut (from block_view events)
  const blockTimeMs = {};
  blockViewEvents.forEach((e) => {
    const blockId = e.payload?.blockId ?? 'unknown';
    blockTimeMs[blockId] = (blockTimeMs[blockId] || 0) + (e.payload?.durationMs || 0);
  });
  const blocksMap = (proposal.blocks || []).reduce((acc, b) => {
    if (b.id) acc[b.id] = { type: b.type || 'block', title: b.content?.text || b.type || b.id };
    return acc;
  }, {});
  const timeByBlock = Object.entries(blockTimeMs).map(([blockId, totalMs]) => ({
    blockId,
    totalMs,
    blockTitle: blocksMap[blockId]?.title || blockId,
    type: blocksMap[blockId]?.type || 'block',
  })).sort((a, b) => b.totalMs - a.totalMs);

  // timeBySection: section-wise reading time from section_view events
  const sectionMap = {};
  sectionViewEvents.forEach((e) => {
    const p = e.payload || {};
    const sid = p.sectionId || p.section_id || 'section';
    if (!sectionMap[sid]) {
      sectionMap[sid] = {
        sectionId: sid,
        sectionName: p.sectionName || p.section_name || sid,
        order: Number.isFinite(p.order) ? p.order : Number.MAX_SAFE_INTEGER,
        totalMs: 0,
      };
    }
    sectionMap[sid].totalMs += Number(p.durationMs) || 0;
  });
  const timeBySection = Object.values(sectionMap)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      totalMs: s.totalMs,
    }));

  const timeline = [];
  if (proposal.createdAt) {
    timeline.push({
      date: proposal.createdAt,
      label: 'Page created',
      detail: proposal.title || 'Untitled',
    });
  }
  if (proposal.status === 'published' && proposal.updatedAt) {
    timeline.push({
      date: proposal.updatedAt,
      label: 'Page set to live',
      detail: `${proposal.title || 'Untitled'} (sent to ${sentTo.length} viewer${sentTo.length !== 1 ? 's' : ''})`,
    });
  }
  sentTo.forEach((entry) => {
    if (entry.sentAt) {
      timeline.push({
        date: entry.sentAt,
        label: 'Shared',
        detail: entry.email,
      });
    }
  });
  openEvents.slice(0, 10).forEach((e) => {
    const closeEv = closeEvents.find((c) => c.payload?.sessionId === e.payload?.sessionId);
    const durationMs = closeEv?.payload?.durationMs;
    const durationLabel = durationMs != null && durationMs >= 1000
      ? `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
      : '—';
    timeline.push({
      date: e.createdAt,
      label: 'Viewed',
      detail: durationLabel !== '—' ? `Page opened (${durationLabel} on page)` : 'Page opened',
    });
  });
  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  // viewsByDay: for line chart (views per day)
  const viewsByDayMap = {};
  openEvents.forEach((e) => {
    const key = toDateKey(e.createdAt);
    viewsByDayMap[key] = (viewsByDayMap[key] || 0) + 1;
  });
  const viewsByDay = Object.entries(viewsByDayMap)
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // sessions: open + close by sessionId (for Viewers tab). Include visitorId, device, browser, country, region, email for GA-style data.
  const sessions = [];
  const closeBySession = closeEvents.reduce((acc, e) => {
    const sid = e.payload?.sessionId;
    if (sid) acc[sid] = e;
    return acc;
  }, {});
  openEvents.forEach((e) => {
    const sessionId = e.payload?.sessionId;
    const closeEv = sessionId ? closeBySession[sessionId] : null;
    const durationMs = closeEv?.payload?.durationMs ?? Math.max(0, Date.now() - new Date(e.createdAt).getTime());
    const p = e.payload || {};
    const loc = normalizeLocationFields(p);
    sessions.push({
      sessionId: sessionId || e._id.toString(),
      createdAt: e.createdAt,
      durationMs,
      userId: p.userId || null,
      email: p.email || null,
      visitorId: p.visitorId || null,
      device: p.device || null,
      browser: p.browser || null,
      country: loc.country,
      region: loc.region,
      city: loc.city,
      name: p.name || null,
      avatar: p.avatar || null,
      locationUnavailable: !!p.locationUnavailable || !(loc.city || loc.region || loc.country),
    });
  });
  sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // sessionCount per visitorId (for "Returning visitor" / "X sessions")
  const visitorCounts = {};
  sessions.forEach((s) => {
    const vid = s.visitorId || s.sessionId;
    visitorCounts[vid] = (visitorCounts[vid] || 0) + 1;
  });
  sessions.forEach((s) => {
    const vid = s.visitorId || s.sessionId;
    s.sessionCount = visitorCounts[vid] || 1;
  });

  // sessionsByDay: for "Show Details" popover (per-day breakdown)
  const sessionsByDay = {};
  sessions.forEach((s) => {
    const key = toDateKey(s.createdAt);
    if (!sessionsByDay[key]) sessionsByDay[key] = [];
    sessionsByDay[key].push({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      durationMs: s.durationMs,
      userId: s.userId,
      email: s.email,
      visitorId: s.visitorId,
      device: s.device,
      browser: s.browser,
      country: s.country,
      region: s.region,
      city: s.city,
      sessionCount: s.sessionCount,
      name: s.name,
      avatar: s.avatar,
      locationUnavailable: s.locationUnavailable,
    });
  });

  return {
    proposalId: proposal._id.toString(),
    views,
    avgTimeSec,
    interactions,
    timeline,
    viewsByDay,
    sessions,
    sessionsByDay,
    interactionsByTarget,
    timeByBlock,
    timeBySection,
  };
}

/**
 * Engagement level from viewer activity (time spent + interactions).
 * Used for dashboard gauge: Unmonitored | Neutral (low/medium) | Highly engaged.
 *
 * RULES (when the label is shown):
 * - Unmonitored: No one has opened the page (open events = 0).
 * - Low (shown as "Neutral"): Page was opened but avg time < 30s AND clicks < 2.
 * - Medium (shown as "Neutral"): Avg time on page >= 30s OR clicks >= 2 (and below high).
 * - High (shown as "Highly engaged"): Avg time >= 2 min OR clicks >= 6.
 *
 * Data source: AnalyticsEvent (open, close with durationMs, click) per proposal.
 */
function computeEngagementLevel(openCount, avgTimeSec, clickCount) {
  if (!openCount || openCount === 0) return 'unmonitored';
  if (avgTimeSec >= 120 || clickCount >= 6) return 'high';
  if (avgTimeSec >= 30 || clickCount >= 2) return 'medium';
  return 'low';
}

/**
 * Per-proposal metrics for dashboard list: level, view/click counts, last open time (for filters + sort).
 * @returns {Promise<Record<string, { engagementLevel: string, viewCount: number, clickCount: number, lastViewedAt: Date|null }>>}
 */
export async function getEngagementMetricsForProposals(organizationId, proposalIds) {
  if (!proposalIds?.length) return {};
  const mongoose = (await import('mongoose')).default;
  const oidOrg = new mongoose.Types.ObjectId(organizationId);
  const ids = proposalIds.map((id) => new mongoose.Types.ObjectId(id));

  const [openGroups, closeStats, clickCounts] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { organizationId: oidOrg, proposalId: { $in: ids }, event: 'open' } },
      { $group: { _id: '$proposalId', viewCount: { $sum: 1 }, lastViewedAt: { $max: '$createdAt' } } },
    ]).then((list) => list.reduce((acc, x) => {
      acc[x._id.toString()] = { viewCount: x.viewCount, lastViewedAt: x.lastViewedAt || null };
      return acc;
    }, {})),
    AnalyticsEvent.aggregate([
      { $match: { organizationId: oidOrg, proposalId: { $in: ids }, event: 'close' } },
      { $group: { _id: '$proposalId', totalMs: { $sum: { $ifNull: ['$payload.durationMs', 0] } }, count: { $sum: 1 } } },
    ]).then((list) => list.reduce((acc, x) => {
      acc[x._id.toString()] = { totalMs: x.totalMs, count: x.count };
      return acc;
    }, {})),
    AnalyticsEvent.aggregate([
      { $match: { organizationId: oidOrg, proposalId: { $in: ids }, event: 'click' } },
      { $group: { _id: '$proposalId', clickCount: { $sum: 1 } } },
    ]).then((list) => list.reduce((acc, x) => {
      acc[x._id.toString()] = x.clickCount;
      return acc;
    }, {})),
  ]);

  const result = {};
  for (const id of proposalIds) {
    const open = openGroups[id] || { viewCount: 0, lastViewedAt: null };
    const viewCount = open.viewCount || 0;
    const lastViewedAt = open.lastViewedAt || null;
    const close = closeStats[id];
    const avgTimeSec = close?.count > 0 ? Math.round(close.totalMs / close.count / 1000) : 0;
    const clickCount = clickCounts[id] || 0;
    result[id] = {
      engagementLevel: computeEngagementLevel(viewCount, avgTimeSec, clickCount),
      viewCount,
      clickCount,
      lastViewedAt,
    };
  }
  return result;
}
