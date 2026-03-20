/**
 * Reports → Pipeline report — uses real data from GET /api/reports/pipeline (proposal aggregates).
 * Same UI: overview bars, sales velocity, velocity history chart, promo banner, status history stacked bars.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  DownOutlined,
  QuestionCircleOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TagOutlined,
  PlusOutlined,
  CloseOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Dropdown, Modal, Select, Input } from 'antd';
import { get, ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';
import './PipelineReport.css';

const ACCOUNT_OPTIONS = [
  { key: 'everyone', label: 'Everyone in your account' },
  { key: 'mine', label: 'My pages only' },
];

const HAS_CONTENT_OPTIONS = [
  { value: 'any', label: 'Any content' },
  { value: 'yes', label: 'Has content' },
  { value: 'no', label: 'No content' },
];

const SEGMENTS = ['Week', 'Month', 'Quarter', 'Year'];

const defaultData = {
  overview: {
    all: 0,
    live: 0,
    closed: 0,
    allPct: 0,
    livePct: 0,
    closedPct: 0,
    avgTimeLiveDays: 0,
    acceptRate: '0.00',
    salesVelocity: 0,
    avgPageValue: '00.0',
  },
  velocityHistory: [],
  statusHistory: [],
};

function PipelineReport() {
  const user = useAuthStore((s) => s.user);
  const [segment, setSegment] = useState('Month');
  const [pageMetric, setPageMetric] = useState('count');
  const [showBanner, setShowBanner] = useState(true);
  const [funnelTab, setFunnelTab] = useState('funnel');
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountFilter, setAccountFilter] = useState('everyone');
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false);
  const [savedFilterTemplate, setSavedFilterTemplate] = useState('');
  const [savedFilterTag, setSavedFilterTag] = useState('');
  const [savedFilterHasContent, setSavedFilterHasContent] = useState('any');
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberFilter, setMemberFilter] = useState('all');

  const adminOptions = useMemo(() => {
    const adminLike = teamMembers.filter(
      (m) => m?.id && (m.role === 'Admin' || m.role === 'Super_Admin')
    );
    return [
      { key: 'all', label: 'All admins' },
      ...adminLike.map((m) => ({
        key: m.id,
        label: `${m.name || m.email} (${m.role})`,
      })),
    ];
  }, [teamMembers]);

  useEffect(() => {
    let cancelled = false;
    get(ENDPOINTS.TEAM_MEMBERS)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setTeamMembers(list);
      })
      .catch(() => {
        if (!cancelled) setTeamMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    get(ENDPOINTS.REPORTS_PIPELINE, {
      params: {
        period: segment,
        scope: accountFilter,
        createdBy: memberFilter === 'all' ? undefined : memberFilter,
        activeOnly: true,
      },
    })
      .then((res) => {
        if (!cancelled) setData(res.data || defaultData);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err.response?.status === 404
            ? 'Report unavailable (404). Ensure the API server is running.'
            : err.message;
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [segment, accountFilter, memberFilter]);

  const o = data.overview || defaultData.overview;
  const maxBar = Math.max(o.all, 1);
  const liveHeight = Math.max((o.live / maxBar) * 100, 2);
  const closedHeight = Math.max((o.closed / maxBar) * 100, 2);

  const velocityHistory = data.velocityHistory || [];
  const statusHistory = data.statusHistory || [];
  const maxStack = Math.max(...statusHistory.map((s) => s.total), 1);
  const maxVelDays = Math.max(...velocityHistory.map((v) => v.avgDays), 1);

  if (loading) {
    return (
      <div className="pipeline-report">
        <div className="pipeline-report-loading">Loading pipeline report…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pipeline-report">
        <div className="pipeline-report-error">Unable to load report: {error}</div>
      </div>
    );
  }

  return (
    <div className="pipeline-report">
      <header className="pipeline-report-header">
        <h1 className="pipeline-report-title">Pipeline report</h1>
        {user?.organization?.name && (
          <p style={{ margin: '4px 0 0', color: '#637083', fontSize: 13 }}>
            Company: {user.organization.name} (active pages only)
          </p>
        )}
        <div className="pipeline-report-segments">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              className={`pipeline-report-segment ${segment === s ? 'active' : ''}`}
              onClick={() => setSegment(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="pipeline-report-filters">
          <Dropdown
            trigger={['click']}
            placement="bottomLeft"
            menu={{
              items: ACCOUNT_OPTIONS.map((opt) => ({
                key: opt.key,
                label: opt.label,
                onClick: () => setAccountFilter(opt.key),
              })),
              selectedKeys: [accountFilter],
            }}
          >
            <button type="button" className="pipeline-report-filter-btn">
              {ACCOUNT_OPTIONS.find((o) => o.key === accountFilter)?.label || 'Everyone in your account'} <DownOutlined />
            </button>
          </Dropdown>
          <button type="button" className="pipeline-report-filter-btn">
            <span className="pipeline-report-flag">USD</span> <DownOutlined />
          </button>
          <Dropdown
            trigger={['click']}
            placement="bottomLeft"
            menu={{
              items: adminOptions.map((opt) => ({
                key: opt.key,
                label: opt.label,
                onClick: () => setMemberFilter(opt.key),
              })),
              selectedKeys: [memberFilter],
            }}
          >
            <button type="button" className="pipeline-report-filter-btn">
              {adminOptions.find((o) => o.key === memberFilter)?.label || 'All admins'} <DownOutlined />
            </button>
          </Dropdown>
          <button
            type="button"
            className="pipeline-report-filter-btn"
            onClick={() => setSavedFiltersOpen(true)}
          >
            <TagOutlined /> Saved Filters
          </button>
          <button type="button" className="pipeline-report-filter-btn">
            <PlusOutlined /> Clean up
          </button>
        </div>
      </header>

      {/* Saved Filters modal — reference: "A Saved Filter is a group of Pages with filters for reporting." */}
      <Modal
        title="Saved Filters"
        open={savedFiltersOpen}
        onCancel={() => setSavedFiltersOpen(false)}
        footer={null}
        width={440}
        className="pipeline-report-saved-filters-modal"
      >
        <p className="pipeline-report-saved-filters-desc">
          A Saved Filter is a group of Pages with filters for reporting.
        </p>
        <div className="pipeline-report-saved-filters-section">
          <label className="pipeline-report-saved-filters-label">Select Saved Filter</label>
          <Select
            placeholder="Select an option"
            allowClear
            style={{ width: '100%' }}
            options={[{ value: 'default', label: 'Default view' }]}
          />
        </div>
        <div className="pipeline-report-saved-filters-section">
          <label className="pipeline-report-saved-filters-label">Page filters</label>
          <div className="pipeline-report-saved-filters-fields">
            <Input
              placeholder="Enter a template name"
              value={savedFilterTemplate}
              onChange={(e) => setSavedFilterTemplate(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <Input
              placeholder="Enter a tag"
              value={savedFilterTag}
              onChange={(e) => setSavedFilterTag(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <Select
              placeholder="Has content"
              style={{ width: '100%' }}
              value={savedFilterHasContent}
              onChange={setSavedFilterHasContent}
              options={HAS_CONTENT_OPTIONS}
            />
          </div>
        </div>
        <a
          href="#"
          className="pipeline-report-saved-filters-manage"
          onClick={(e) => { e.preventDefault(); setSavedFiltersOpen(false); }}
        >
          Create or manage Saved Filters
        </a>
      </Modal>

      {/* Pipeline Overview */}
      <section className="pipeline-report-card">
        <div className="pipeline-report-card-tabs">
          <button
            type="button"
            className={funnelTab === 'funnel' ? 'active' : ''}
            onClick={() => setFunnelTab('funnel')}
          >
            Funnel
          </button>
          <button
            type="button"
            className={funnelTab === 'status' ? 'active' : ''}
            onClick={() => setFunnelTab('status')}
          >
            Status
          </button>
        </div>
        <div className="pipeline-report-card-toggle">
          <button
            type="button"
            className={pageMetric === 'count' ? 'active' : ''}
            onClick={() => setPageMetric('count')}
          >
            Page count
          </button>
          <button
            type="button"
            className={pageMetric === 'value' ? 'active' : ''}
            onClick={() => setPageMetric('value')}
          >
            Page value
          </button>
        </div>
        <div className="pipeline-report-overview">
          <div className="pipeline-report-bars">
            <div className="pipeline-report-bar-item">
              <span className="pipeline-report-bar-pct" style={{ opacity: 0 }}>0%</span>
              <div className="pipeline-report-bar pipeline-report-bar-all" style={{ height: '100%' }} />
              <div className="pipeline-report-bar-label">ALL PAGES</div>
              <div className="pipeline-report-bar-value">{o.all}</div>
              <div className="pipeline-report-bar-meta"><span className="pipeline-report-dot" /> 0 DAYS</div>
            </div>
            <div className="pipeline-report-bar-item">
              <span className="pipeline-report-bar-pct">{o.livePct}%</span>
              <div className="pipeline-report-bar pipeline-report-bar-live" style={{ height: `${liveHeight}%` }} />
              <div className="pipeline-report-bar-label">LIVE</div>
              <div className="pipeline-report-bar-value">{o.live}</div>
              <div className="pipeline-report-bar-meta">
                <span className="pipeline-report-dot" /> {o.avgTimeLiveDays} DAYS
              </div>
            </div>
            <div className="pipeline-report-bar-item">
              <span className="pipeline-report-bar-pct">{o.closedPct}%</span>
              <div className="pipeline-report-bar pipeline-report-bar-closed" style={{ height: `${closedHeight}%` }} />
              <div className="pipeline-report-bar-label">CLOSED</div>
              <div className="pipeline-report-bar-value">{o.closed}</div>
              <div className="pipeline-report-bar-meta"><span className="pipeline-report-dot" /> —</div>
            </div>
          </div>
          <div className="pipeline-report-velocity">
            <h3 className="pipeline-report-velocity-title">
              Sales velocity <QuestionCircleOutlined className="pipeline-report-help-icon" />
            </h3>
            <div className="pipeline-report-velocity-value">{o.salesVelocity}</div>
            <div className="pipeline-report-velocity-metrics">
              <div><DollarOutlined /> Av. Page value <strong>{o.avgPageValue}</strong></div>
              <div><ClockCircleOutlined /> Av. Time live <strong>{o.avgTimeLiveDays} days</strong></div>
              <div><CheckCircleOutlined /> Accept rate <strong>{o.acceptRate}%</strong></div>
            </div>
          </div>
        </div>
        {/* <a href="#" className="pipeline-report-help-btn">? HELP</a> */}
      </section>

      {/* Sales velocity history */}
      <section className="pipeline-report-card">
        <div className="pipeline-report-card-title-row">
          <h3 className="pipeline-report-card-title">Sales velocity history</h3>
          <div className="pipeline-report-card-checkboxes">
            <label><input type="checkbox" defaultChecked /> Av. time live</label>
            <label><input type="checkbox" /> Av. page value</label>
            <label><input type="checkbox" /> Accept rate</label>
          </div>
        </div>
        <div className="pipeline-report-chart pipeline-report-chart-velocity">
          <div className="pipeline-report-chart-y">Sales velocity</div>
          <div className="pipeline-report-chart-body">
            <div className="pipeline-report-chart-bars-inline">
              {velocityHistory.length
                ? velocityHistory.map((v, i) => (
                    <div key={i} className="pipeline-report-inline-group">
                      <span className="pipeline-report-velocity-line">0</span>
                      <div
                        className="pipeline-report-orange-bar"
                        style={{
                          height: `${Math.min((v.avgDays / maxVelDays) * 80, 80)}px`,
                          minHeight: '4px',
                        }}
                        title={`${v.avgDays}d`}
                      />
                    </div>
                  ))
                : [0, 0, 0, 0, 0, 0].map((_, i) => (
                    <div key={i} className="pipeline-report-inline-group">
                      <span className="pipeline-report-velocity-line">0</span>
                      <div className="pipeline-report-orange-bar" style={{ height: '4px' }} />
                    </div>
                  ))}
            </div>
            <div className="pipeline-report-chart-x">
              {(velocityHistory.length ? velocityHistory : [{ month: '' }, { month: '' }, { month: '' }, { month: '' }, { month: '' }, { month: '' }]).map((v, i) => (
                <span key={i}>{v.month}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="pipeline-report-legend">SALES VELOCITY</div>
        {/* <a href="#" className="pipeline-report-help-btn">? HELP</a> */}
      </section>

      {/* Promo banner */}
      {showBanner && (
        <section className="pipeline-report-promo">
          <button type="button" className="pipeline-report-promo-close" onClick={() => setShowBanner(false)} aria-label="Close">
            <CloseOutlined />
          </button>
          <div className="pipeline-report-promo-left">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=280&fit=crop"
              alt=""
              className="pipeline-report-promo-img"
            />
          </div>
          <div className="pipeline-report-promo-right">
            <h3 className="pipeline-report-promo-title">Get access to everything</h3>
            <p className="pipeline-report-promo-desc">Upgrade now to get more than four months of historical data.</p>
            <button type="button" className="pipeline-report-promo-btn">
              <RightOutlined /> Explore upgrade
            </button>
          </div>
        </section>
      )}

      {/* Pipeline status history */}
      <section className="pipeline-report-card">
        <div className="pipeline-report-card-title-row">
          <h3 className="pipeline-report-card-title">Pipeline status history</h3>
          <div className="pipeline-report-card-toggle">
            <button type="button" className="active">Page count</button>
            <button type="button">Page value</button>
          </div>
        </div>
        <div className="pipeline-report-chart pipeline-report-chart-stacked">
          <div className="pipeline-report-chart-y">Page count</div>
          <div className="pipeline-report-chart-body">
            <div className="pipeline-report-stacked-bars">
              {(statusHistory.length ? statusHistory : Array(6).fill({ total: 0, draft: 0, published: 0, accepted: 0, declined: 0, month: '' })).map((s, i) => {
                const total = s.total || 0;
                const h = maxStack > 0 ? (total / maxStack) * 160 : 0;
                const d = total ? (s.draft / total) * 100 : 0;
                const p = total ? (s.published / total) * 100 : 0;
                const a = total ? (s.accepted / total) * 100 : 0;
                const dec = total ? (s.declined / total) * 100 : 0;
                return (
                  <div key={i} className="pipeline-report-stacked-bar" style={{ height: `${Math.max(h, 4)}px` }}>
                    <span className="stack-draft" style={{ height: `${d}%` }} />
                    <span className="stack-live" style={{ height: `${p}%` }} />
                    <span className="stack-accepted" style={{ height: `${a}%` }} />
                    <span className="stack-declined" style={{ height: `${dec}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="pipeline-report-chart-x">
              {(statusHistory.length ? statusHistory : Array(6).fill({ month: '' })).map((s, i) => (
                <span key={i}>{s.month}</span>
              ))}
            </div>
          </div>
        </div>
        {/* <a href="#" className="pipeline-report-help-btn">? HELP</a> */}
      </section>
    </div>
  );
}

export default PipelineReport;
