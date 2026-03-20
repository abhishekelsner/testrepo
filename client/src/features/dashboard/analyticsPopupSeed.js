/**
 * Realistic demo/seed analytics for the Analytics popup when the API returns no events.
 * Produces deterministic values from proposal id so the same proposal always shows the same numbers.
 */

function hash(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Returns realistic analytics for a proposal (views, avg time, interactions, timeline).
 * @param {object} proposal - { id, title, createdAt, updatedAt, status, sentTo }
 * @returns {{ views: number, avgTimeSec: number, interactions: number, timeline: Array<{date, label, detail}> }}
 */
export function getRealisticAnalytics(proposal) {
  if (!proposal) return { views: 0, avgTimeSec: 0, interactions: 0, timeline: [], viewsByDay: [], sessions: [], sessionsByDay: {} };

  const id = proposal.id || proposal._id?.toString() || '';
  const sentTo = proposal.sentTo || [];
  const h = hash(id);

  // Views: tie the total views to the number of synthetic sessions we create
  // so that:
  // - The big "Views" metric matches the line chart total
  // - The day-detail and viewers list can account for every view
  const minViews = Math.max(sentTo.length || 1, 1);
  const extraViews = h % 5; // 0–4 extra re-opens
  const views = minViews + extraViews;

  // Average time on page: 55s – 4 min (deterministic)
  const avgTimeSec = 55 + (h % 186);

  // Interactions (clicks, scrolls): 3 – 22
  const interactions = 3 + (h % 20);

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
      detail: `${proposal.title || 'Untitled'} (sent to ${sentTo.length || 0} viewer${(sentTo.length || 0) !== 1 ? 's' : ''})`,
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

  // Add realistic "Viewed" / "Page opened" events after the last activity
  const baseDate = proposal.updatedAt || proposal.createdAt || new Date();
  const base = new Date(baseDate).getTime();
  const viewedCount = views;
  for (let i = 0; i < viewedCount; i++) {
    const offsetMs = (i + 1) * (3600000 + (h % 5) * 900000); // 1–5.25h after base
    const viewedAt = new Date(base + offsetMs);
    const durationSec = 30 + (h % 150) + i * 20;
    const durationLabel = durationSec >= 60 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : `${durationSec}s`;
    timeline.push({
      date: viewedAt.toISOString(),
      label: 'Viewed',
      detail: `Page opened (${durationLabel} on page)`,
    });
  }

  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Fake locations for demo (deterministic from proposal id)
  const locations = [
    { city: 'San Francisco', region: 'CA', country: 'US' },
    { city: 'New York', region: 'NY', country: 'US' },
    { city: 'London', region: 'England', country: 'GB' },
    { city: 'Berlin', region: 'Berlin', country: 'DE' },
    { city: 'Mumbai', region: 'MH', country: 'IN' },
  ];
  // viewsByDay, sessions, sessionsByDay for chart and viewers (deterministic)
  const sessions = [];
  const viewsByDayMap = {};
  for (let i = 0; i < viewedCount; i++) {
    const offsetMs = (i + 1) * (3600000 + (h % 5) * 900000);
    const viewedAt = new Date(base + offsetMs);
    const durationSec = 30 + (h % 150) + i * 20;
    const durationMs = durationSec * 1000;
    const dateKey = viewedAt.toISOString().slice(0, 10);
    const loc = locations[(h + i) % locations.length];
    sessions.push({
      sessionId: `seed-${id}-${i}`,
      createdAt: viewedAt.toISOString(),
      durationMs,
      userId: null,
      country: loc.country,
      region: loc.region,
      city: loc.city,
    });
    viewsByDayMap[dateKey] = (viewsByDayMap[dateKey] || 0) + 1;
  }
  const viewsByDay = Object.entries(viewsByDayMap)
    .map(([date, v]) => ({ date, views: v }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const sessionsByDay = {};
  sessions.forEach((s) => {
    s.sessionCount = 1;
    const key = s.createdAt.slice(0, 10);
    if (!sessionsByDay[key]) sessionsByDay[key] = [];
    sessionsByDay[key].push({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      durationMs: s.durationMs,
      userId: s.userId,
      country: s.country,
      region: s.region,
      city: s.city,
      sessionCount: 1,
    });
  });

  return {
    views,
    avgTimeSec,
    interactions,
    timeline,
    viewsByDay,
    sessions,
    sessionsByDay,
  };
}

/**
 * Returns a list of "view" entries for the Views list (mix of sent + viewed).
 * When using seed data, we show sentTo plus synthetic "Viewed at ..." rows.
 * @param {object} proposal
 * @param {number} viewCount - total views from getRealisticAnalytics
 */
export function getRealisticViewList(proposal, viewCount) {
  const sentTo = proposal.sentTo || [];
  const id = proposal.id || proposal._id?.toString() || '';
  const h = hash(id);

  const items = sentTo.map((e, i) => ({
    type: 'shared',
    email: e.email,
    sentAt: e.sentAt,
    label: `Shared to ${e.email}`,
  }));

  const extraViews = Math.max(0, viewCount - sentTo.length);
  const base = new Date(proposal.updatedAt || proposal.createdAt || Date.now()).getTime();
  for (let i = 0; i < extraViews; i++) {
    const offsetMs = (i + 1) * (3600000 + (h % 4) * 600000);
    items.push({
      type: 'viewed',
      email: null,
      sentAt: new Date(base + offsetMs),
      label: `Page view ${sentTo.length + i + 1}`,
    });
  }

  items.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  return items;
}
