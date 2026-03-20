/**
 * Analytics popup — page views (line chart), timeline (load more/less), viewers, time spent, interactions.
 * Shown when clicking the Analytics icon on a proposal row.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChartOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Modal, Button, Segmented } from 'antd';
import { get } from '../../api/service';
import { ENDPOINTS } from '../../api/endpoints';
import { getRealisticAnalytics, getRealisticViewList } from './analyticsPopupSeed';
import { encodeUrlOpaque } from '../../utils/urlQueryOpaque';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './AnalyticsPopup.css';

function formatTimelineDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTimeSpent(seconds) {
  if (!seconds || seconds === 0) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getSessionDurationMs(session) {
  if (!session) return 0;
  if (session.durationMs != null) return Math.max(0, Number(session.durationMs) || 0);
  const created = new Date(session.createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Date.now() - created);
}

function getDaysForRange(range) {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  if (range === '1w') from.setDate(from.getDate() - 6);
  else if (range === '1m') from.setMonth(from.getMonth() - 1);
  else if (range === '1y') from.setFullYear(from.getFullYear() - 1);
  const days = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(0, 0, 0, 0);
  while (d <= toDate) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function fillChartData(viewsByDay, range) {
  const days = getDaysForRange(range || '1m');
  const byDate = (viewsByDay || []).reduce((acc, x) => { acc[x.date] = x.views; return acc; }, {});
  return days.map((date) => ({ date, views: byDate[date] || 0 }));
}

function getRangeDateLabel(range) {
  const days = getDaysForRange(range || '1m');
  if (days.length === 0) return '—';
  const from = new Date(days[0]);
  const to = new Date(days[days.length - 1]);
  return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function getEngagementBadgeLabel(level) {
  if (level === 'high') return 'HIGHLY ENGAGED';
  if (level === 'medium' || level === 'low') return 'NEUTRAL';
  return 'UNMONITORED'; // unmonitored or undefined
}

const TIMELINE_INITIAL = 5;
const TIMELINE_LOAD_MORE = 10;

export default function AnalyticsPopup({ open, onClose, proposal, orgSlug }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState('1m');
  const [selectedDay, setSelectedDay] = useState(null);
  const [timelineTab, setTimelineTab] = useState('timeline');
  const [timeInteractionsTab, setTimeInteractionsTab] = useState('time');
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(TIMELINE_INITIAL);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const leaveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!open || !proposal?.id) {
      setAnalytics(null);
      setSelectedDay(null);
      setSelectedSession(null);
      setTimelineVisibleCount(TIMELINE_INITIAL);
      setHoveredPoint(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    get(ENDPOINTS.ANALYTICS_PROPOSAL(proposal.id), { params: { range } })
      .then(({ data }) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, [open, proposal?.id, range]);

  // Data source: API returns real data when AnalyticsEvents exist (open/close/click from public view).
  // Use seed (demo) data only when API has no engagement (no views, no time, no interactions).
  const seedData = getRealisticAnalytics(proposal);
  const apiHasEngagement = analytics && (analytics.views > 0 || analytics.avgTimeSec > 0 || analytics.interactions > 0);
  const effective = apiHasEngagement ? analytics : seedData;
  const viewsByDay = effective?.viewsByDay ?? seedData?.viewsByDay ?? [];
  const chartData = useMemo(() => fillChartData(viewsByDay, range), [viewsByDay, range]);

  if (!proposal) return null;

  const sessions = effective?.sessions ?? seedData?.sessions ?? [];
  const sessionsByDay = effective?.sessionsByDay ?? seedData?.sessionsByDay ?? {};

  const viewCount = effective?.views ?? proposal.sentTo?.length ?? 0;
  const avgTimeSec = effective?.avgTimeSec ?? 0;
  const interactions = effective?.interactions ?? 0;
  const interactionsByTarget = effective?.interactionsByTarget ?? [];
  const timeByBlock = effective?.timeByBlock ?? [];
  const timeBySection = effective?.timeBySection ?? [];
  const timeRows = timeBySection.length > 0
    ? timeBySection.map((r) => ({ ...r, label: r.sectionName || r.sectionId, kind: 'section' }))
    : timeByBlock.map((r) => ({ ...r, label: r.blockTitle || r.blockId, kind: 'block' }));
  const totalTimeMs = timeRows.reduce((s, r) => s + (r.totalMs || 0), 0);
  const timelineEvents = (effective?.timeline?.length
    ? effective.timeline
    : seedData.timeline || []
  ).map((e) => ({ date: e.date, label: e.label, detail: e.detail }));

  const viewListItems = apiHasEngagement
    ? (proposal.sentTo || []).map((v, i) => ({ type: 'shared', label: `Page view ${i + 1} — ${v.email}`, sentAt: v.sentAt }))
    : getRealisticViewList(proposal, viewCount);

  const viewPageUrl = proposal.slug
    ? `${window.location.origin}/view/${proposal.slug}`
    : `${window.location.origin}/${orgSlug}/proposals/${encodeUrlOpaque(proposal.id)}/edit`;

  const dayDetail = selectedDay ? (sessionsByDay[selectedDay] || []) : [];
  const dayViews = selectedDay ? (dayDetail.length) : 0;
  const dayAvgMs = dayDetail.length
    ? dayDetail.reduce((s, x) => s + (x.durationMs || 0), 0) / dayDetail.length
    : 0;

  const timelineVisible = timelineEvents.slice(0, timelineVisibleCount);
  const hasMoreTimeline = timelineVisibleCount < timelineEvents.length;
  const canLoadLess = timelineVisibleCount > TIMELINE_INITIAL;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      className="analytics-popup-modal"
      styles={{
        body: {
          padding: 0,
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        },
        wrapper: {
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2vh 2vw',
          boxSizing: 'border-box',
        },
        content: {
          width: '96vw',
          maxWidth: '96vw',
          height: '96vh',
          maxHeight: '96vh',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        },
      }}
    >
      <div className="analytics-popup">
        <div className="analytics-popup-header">
          <div className="analytics-popup-header-left">
            <BarChartOutlined className="analytics-popup-header-icon" />
            <span className="analytics-popup-header-title">Analytics</span>
            <span className="analytics-popup-header-pagename">
              {proposal.title || 'Untitled Proposal'}
            </span>
          </div>
          <div className="analytics-popup-header-right">
            <span
              className={`analytics-popup-badge ${
                proposal.engagementLevel === 'high'
                  ? 'analytics-popup-badge-engaged'
                  : proposal.engagementLevel === 'medium' || proposal.engagementLevel === 'low'
                    ? 'analytics-popup-badge-neutral'
                    : 'analytics-popup-badge-unmonitored' // unmonitored or undefined
              }`}
            >
              {getEngagementBadgeLabel(proposal.engagementLevel)}
            </span>
            {proposal.status === 'published' && (
              <span className="analytics-popup-badge analytics-popup-badge-live">
                <span className="analytics-popup-badge-dot" /> LIVE
              </span>
            )}
            <Button
              type="link"
              size="small"
              href={viewPageUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View page
            </Button>
            <CloseOutlined className="analytics-popup-close" onClick={onClose} />
          </div>
        </div>

        <div className="analytics-popup-body">
          <div className="analytics-popup-content">
            <div className="analytics-popup-card">
              <h3 className="analytics-popup-section-title">Page analytics</h3>
              <div className="analytics-popup-datebar">
                <CalendarOutlined className="analytics-popup-calendar" />
                <span className="analytics-popup-daterange">{getRangeDateLabel(range)}</span>
                <Segmented
                  size="small"
                  options={[
                    { label: '1w', value: '1w' },
                    { label: '1m', value: '1m' },
                    { label: '1y', value: '1y' },
                  ]}
                  value={range}
                  onChange={setRange}
                  className="analytics-popup-segmented"
                />
              </div>
              <div className="analytics-popup-metrics">
                <div className="analytics-popup-metric">
                  <EyeOutlined />
                  <span>
                    {viewCount} view{viewCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="analytics-popup-metric">
                  <ClockCircleOutlined />
                  <span>{formatTimeSpent(avgTimeSec)}</span>
                  <small>Average time spent viewing</small>
                </div>
                <div className="analytics-popup-metric">
                  <span className="analytics-popup-metric-icon">💬</span>
                  <span>{interactions}</span>
                  <small>Interactions</small>
                </div>
              </div>
            </div>

            <div className="analytics-popup-card">
              <h4 className="analytics-popup-subtitle">Views</h4>
              {viewCount === 0 ? (
                <div className="analytics-popup-empty">
                  <BarChartOutlined className="analytics-popup-empty-icon" />
                  <p>No views yet</p>
                  <p className="analytics-popup-empty-hint">Share this page to start seeing data.</p>
                  <Button type="primary" href={viewPageUrl} target="_blank">
                    Share
                  </Button>
                </div>
              ) : (
                <div className="analytics-popup-chart-wrap">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="var(--analytics-primary, #1890ff)"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          return (
                            <circle
                              r={4}
                              cx={cx}
                              cy={cy}
                              fill="var(--analytics-primary, #1890ff)"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => {
                                if (leaveTimeoutRef.current) {
                                  clearTimeout(leaveTimeoutRef.current);
                                  leaveTimeoutRef.current = null;
                                }
                                const rect = e.target.getBoundingClientRect();
                                setHoveredPoint({
                                  date: payload.date,
                                  views: payload.views,
                                  left: rect.left + rect.width / 2,
                                  top: rect.top,
                                });
                              }}
                              onMouseLeave={() => {
                                leaveTimeoutRef.current = setTimeout(() => setHoveredPoint(null), 150);
                              }}
                              onClick={() => payload?.date && setSelectedDay(payload.date)}
                            />
                          );
                        }}
                        activeDot={(props) => {
                          const { cx, cy, payload } = props;
                          return (
                            <circle
                              r={6}
                              cx={cx}
                              cy={cy}
                              fill="var(--analytics-primary, #1890ff)"
                              stroke="#fff"
                              strokeWidth={2}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={(e) => {
                                if (leaveTimeoutRef.current) {
                                  clearTimeout(leaveTimeoutRef.current);
                                  leaveTimeoutRef.current = null;
                                }
                                const rect = e.target.getBoundingClientRect();
                                setHoveredPoint({
                                  date: payload.date,
                                  views: payload.views,
                                  left: rect.left + rect.width / 2,
                                  top: rect.top,
                                });
                              }}
                              onMouseLeave={() => {
                                leaveTimeoutRef.current = setTimeout(() => setHoveredPoint(null), 150);
                              }}
                              onClick={() => payload?.date && setSelectedDay(payload.date)}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  {hoveredPoint && (
                    <div
                      className="analytics-popup-point-popover"
                      style={{
                        position: 'fixed',
                        left: hoveredPoint.left,
                        top: hoveredPoint.top - 8,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 1050,
                      }}
                      onMouseEnter={() => {
                        if (leaveTimeoutRef.current) {
                          clearTimeout(leaveTimeoutRef.current);
                          leaveTimeoutRef.current = null;
                        }
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <div className="analytics-popup-chart-tooltip">
                        <div className="analytics-popup-chart-tooltip-date">
                          {new Date(hoveredPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="analytics-popup-chart-tooltip-metric">
                          <EyeOutlined /> {hoveredPoint.views} view{hoveredPoint.views !== 1 ? 's' : ''}
                        </div>
                        <Button
                          type="default"
                          size="small"
                          className="analytics-popup-chart-tooltip-btn"
                          onClick={() => {
                            setSelectedDay(hoveredPoint.date);
                            setHoveredPoint(null);
                          }}
                        >
                          Show details
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedDay && (
                    <div className="analytics-popup-day-detail">
                      <div className="analytics-popup-day-detail-header">
                        <span>{new Date(selectedDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setSelectedDay(null)} />
                      </div>
                      <div className="analytics-popup-day-detail-metrics">
                        <span><ClockCircleOutlined /> {formatTimeSpent(Math.round(dayAvgMs / 1000))} avg. time spent</span>
                        <span><EyeOutlined /> {dayViews} view{dayViews !== 1 ? 's' : ''}</span>
                      </div>
                      <ul className="analytics-popup-day-detail-list">
                        {dayDetail.map((s, i) => (
                          <li key={i}>
                            <UserOutlined /> {s.email || (s.visitorId ? `Visitor #${String(s.visitorId).slice(-6)}` : 'Anonymous')}
                            <span>{formatTimeSpent(Math.round(getSessionDurationMs(s) / 1000))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="analytics-popup-card">
              <div className="analytics-popup-tabs">
                <span
                  className={`analytics-popup-tab ${timelineTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setTimelineTab('timeline')}
                >
                  Timeline
                </span>
                <span
                  className={`analytics-popup-tab ${timelineTab === 'viewers' ? 'active' : ''}`}
                  onClick={() => setTimelineTab('viewers')}
                >
                  Viewers
                </span>
              </div>
              {timelineTab === 'timeline' && (
                <>
                  <div className="analytics-popup-sortbar">
                    <span>Most recent</span>
                    <span>All events</span>
                  </div>
                  <div className="analytics-popup-timeline">
                    {timelineVisible.map((ev, i) => (
                      <div key={i} className="analytics-popup-timeline-item">
                        <div className="analytics-popup-timeline-date">{formatTimelineDate(ev.date)}</div>
                        <div className="analytics-popup-timeline-content">
                          <span className="analytics-popup-timeline-label">{ev.label}</span>
                          <span className="analytics-popup-timeline-user">{ev.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="analytics-popup-timeline-actions">
                    {hasMoreTimeline && (
                      <Button type="link" size="small" onClick={() => setTimelineVisibleCount((c) => c + TIMELINE_LOAD_MORE)}>
                        Load more
                      </Button>
                    )}
                    {canLoadLess && (
                      <Button type="link" size="small" onClick={() => setTimelineVisibleCount(TIMELINE_INITIAL)}>
                        Load less
                      </Button>
                    )}
                  </div>
                </>
              )}
              {timelineTab === 'viewers' && (
                <>
                  <div className="analytics-popup-viewers-toolbar">
                    <span>All viewers</span>
                  </div>
                  <div className="analytics-popup-viewers-list">
                  {sessions.length === 0 ? (
                    <p className="analytics-popup-viewers-empty">No viewer sessions yet.</p>
                  ) : (
                    sessions.map((s, i) => (
                      <div
                        key={i}
                        className="analytics-popup-viewer-item analytics-popup-viewer-item-clickable"
                        onClick={() => setSelectedSession(s)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedSession(s)}
                      >
                        <div className="analytics-popup-viewer-avatar">
                          {s.avatar ? (
                            <img src={s.avatar} alt={s.name || s.email || 'Viewer'} className="analytics-popup-viewer-avatar-img" />
                          ) : (
                            <UserOutlined className="analytics-popup-viewer-icon" />
                          )}
                        </div>
                        <div className="analytics-popup-viewer-body">
                          <span className="analytics-popup-viewer-name">
                            {s.name || s.email || (s.visitorId ? `Visitor #${String(s.visitorId).slice(-6)}` : 'Anonymous')}
                            {s.sessionCount > 1 && <span className="analytics-popup-viewer-returning"> · Returning</span>}
                          </span>
                          <span className="analytics-popup-viewer-meta-line">✉ {s.email || '—'}</span>
                          <span className="analytics-popup-viewer-meta-line">
                            📍 {(s.city || s.region || s.country) ? [s.city, s.region, s.country].filter(Boolean).join(', ') : (s.locationUnavailable ? 'Location unavailable' : '—')}
                          </span>
                          <span className="analytics-popup-viewer-meta-line">🗓 {formatTimelineDate(s.createdAt)}</span>
                          <span className="analytics-popup-viewer-meta-line">⏱ {formatTimeSpent(Math.round(getSessionDurationMs(s) / 1000))}</span>
                          <span className="analytics-popup-viewer-meta-line">👁 {s.sessionCount != null ? `${s.sessionCount} session${s.sessionCount !== 1 ? 's' : ''}` : '1 session'}</span>
                        </div>
                      </div>
                    ))
                  )}
                  </div>
                </>
              )}
            </div>

            <div className="analytics-popup-card">
              <div className="analytics-popup-tabs">
                <span
                  className={`analytics-popup-tab ${timeInteractionsTab === 'time' ? 'active' : ''}`}
                  onClick={() => setTimeInteractionsTab('time')}
                >
                  Time spent
                </span>
                <span
                  className={`analytics-popup-tab ${timeInteractionsTab === 'interactions' ? 'active' : ''}`}
                  onClick={() => setTimeInteractionsTab('interactions')}
                >
                  Interactions
                </span>
              </div>
              {viewCount === 0 ? (
                <div className="analytics-popup-empty">
                  <BarChartOutlined className="analytics-popup-empty-icon" />
                  <p>No views yet</p>
                  <p className="analytics-popup-empty-hint">Share this page to start seeing data.</p>
                  <Button type="primary" href={viewPageUrl} target="_blank">
                    Share
                  </Button>
                </div>
              ) : timeInteractionsTab === 'time' ? (
                (avgTimeSec > 0 || timeRows.length > 0 ? (
                  <>
                    <div className="analytics-popup-donut-row">
                      <div className="analytics-popup-donut-wrap">
                        <ResponsiveContainer width={120} height={120}>
                          <PieChart>
                            <Pie
                              data={timeByBlock.length > 0
                                ? timeRows.map((r) => ({ name: r.label, value: r.totalMs }))
                                : [{ name: 'Time', value: 100 }]}
                              cx="50%"
                              cy="50%"
                              innerRadius={36}
                              outerRadius={48}
                              dataKey="value"
                              stroke="none"
                            >
                              {timeRows.length > 0
                                ? timeRows.map((_, i) => <Cell key={i} fill={['var(--analytics-primary)', '#52c41a', '#faad14', '#722ed1'][i % 4]} />)
                                : <Cell fill="var(--analytics-primary, #1890ff)" />}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <span className="analytics-popup-donut-center">{formatTimeSpent(avgTimeSec)}</span>
                      </div>
                      <div className="analytics-popup-donut-label">
                        <ClockCircleOutlined /> Average time on page
                      </div>
                    </div>
                    {timeRows.length > 0 && (
                      <div className="analytics-popup-interactions-table-wrap">
                        <table className="analytics-popup-interactions-table">
                          <thead>
                            <tr><th>{timeBySection.length > 0 ? 'Section' : 'Block'}</th><th>{timeBySection.length > 0 ? 'Order' : 'Type'}</th><th>Time</th><th>%</th></tr>
                          </thead>
                          <tbody>
                            {timeRows.map((r, i) => (
                              <tr key={i}>
                                <td>{r.label}</td>
                                <td>{timeBySection.length > 0 ? i + 1 : (r.type || '—')}</td>
                                <td>{formatTimeSpent(Math.round((r.totalMs || 0) / 1000))}</td>
                                <td>{totalTimeMs ? Math.round((r.totalMs / totalTimeMs) * 100) : 0}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="analytics-popup-empty analytics-popup-empty-small">
                    <p>No time spent data yet</p>
                    <p className="analytics-popup-empty-hint">Engagement will appear when viewers spend time on the page.</p>
                  </div>
                ))
              ) : (
                (interactions > 0 ? (
                  <>
                    <div className="analytics-popup-donut-row">
                      <div className="analytics-popup-donut-wrap">
                        <ResponsiveContainer width={120} height={120}>
                          <PieChart>
                            <Pie
                              data={interactionsByTarget.length > 0
                                ? interactionsByTarget.map((r) => ({ name: r.target || r.type || 'Click', value: r.count }))
                                : [{ name: 'Interactions', value: 100 }]}
                              cx="50%"
                              cy="50%"
                              innerRadius={36}
                              outerRadius={48}
                              dataKey="value"
                              stroke="none"
                            >
                              {interactionsByTarget.length > 0
                                ? interactionsByTarget.map((_, i) => <Cell key={i} fill={['var(--analytics-primary)', '#52c41a', '#faad14', '#722ed1'][i % 4]} />)
                                : <Cell fill="var(--analytics-primary, #1890ff)" />}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <span className="analytics-popup-donut-center">{interactions}</span>
                      </div>
                      <div className="analytics-popup-donut-label">
                        <span className="analytics-popup-metric-icon">💬</span> Total interactions
                      </div>
                    </div>
                    {interactionsByTarget.length > 0 && (
                      <div className="analytics-popup-interactions-table-wrap">
                        <table className="analytics-popup-interactions-table">
                          <thead>
                            <tr><th>Target</th><th>Type</th><th>Count</th><th>%</th></tr>
                          </thead>
                          <tbody>
                            {interactionsByTarget.map((r, i) => (
                              <tr key={i}>
                                <td>{r.target || '—'}</td>
                                <td>{r.type || '—'}</td>
                                <td>{r.count}</td>
                                <td>{interactions ? Math.round((r.count / interactions) * 100) : 0}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="analytics-popup-empty analytics-popup-empty-small">
                    <p>No interactions yet</p>
                    <p className="analytics-popup-empty-hint">Clicks and other interactions will appear here.</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="View session"
        open={!!selectedSession}
        onCancel={() => setSelectedSession(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedSession(null)}>Close</Button>,
          <Button
            key="day"
            type="primary"
            onClick={() => {
              if (selectedSession?.createdAt) {
                const day = selectedSession.createdAt.toString().slice(0, 10);
                setSelectedDay(day);
              }
              setSelectedSession(null);
            }}
          >
            View day
          </Button>,
        ]}
        width={400}
        destroyOnClose
      >
        {selectedSession && (
          <div className="analytics-popup-session-detail">
            <p><UserOutlined /> {selectedSession.name || selectedSession.email || 'Anonymous'}</p>
            <p><strong>Date:</strong> {formatTimelineDate(selectedSession.createdAt)}</p>
            <p><strong>Duration:</strong> {formatTimeSpent(Math.round(getSessionDurationMs(selectedSession) / 1000))}</p>
            <p><strong>Location:</strong> {(selectedSession.city || selectedSession.region || selectedSession.country) ? [selectedSession.city, selectedSession.region, selectedSession.country].filter(Boolean).join(', ') : (selectedSession.locationUnavailable ? 'Location unavailable' : '—')}</p>
            <p><strong>Total sessions:</strong> {selectedSession.sessionCount != null ? selectedSession.sessionCount : 1}</p>
            {(selectedSession.device || selectedSession.browser) && (
              <p><strong>Device:</strong> {[selectedSession.device, selectedSession.browser].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        )}
      </Modal>
    </Modal>
  );
}
