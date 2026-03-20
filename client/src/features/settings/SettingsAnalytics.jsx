/**
 * Settings → Analytics & Reporting
 * Sections: Account Timezone, Default Currency, Engagement, Saved Filters, Default Clean Up
 */
import { useState, useEffect, useRef } from 'react';
import { Select, Switch, Button, Input, message } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  RiseOutlined,
  FilterOutlined,
  ClearOutlined,
  PlusOutlined,
  EditOutlined,
  DownOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { get, put, ENDPOINTS } from '../../api';
import './SettingsAnalytics.css';

const TIMEZONES = [
  'Etc/UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
  'Pacific/Auckland',
];

// countryCode = ISO 3166-1 alpha-2 for flagcdn.com
const CURRENCIES = [
  { value: 'USD', label: 'USD', countryCode: 'us', example: '$1,000.12' },
  { value: 'GBP', label: 'GBP', countryCode: 'gb', example: '£1,000.12' },
  { value: 'AUD', label: 'AUD', countryCode: 'au', example: '$1,000.12' },
  { value: 'EUR', label: 'EUR', countryCode: 'eu', example: '1 000,12 €' },
  { value: 'JPY', label: 'JPY', countryCode: 'jp', example: '¥1,000' },
  { value: 'INR', label: 'INR', countryCode: 'in', example: '₹1,000.12' },
  { value: 'CAD', label: 'CAD', countryCode: 'ca', example: '$1,000.12' },
  { value: 'CNY', label: 'CNY', countryCode: 'cn', example: '¥1,000.12' },
  { value: 'AED', label: 'AED', countryCode: 'ae', example: 'د.إ1,000.12' },
  { value: 'SGD', label: 'SGD', countryCode: 'sg', example: '$1,000.12' },
];

function FlagImg({ countryCode, size = 24 }) {
  // flagcdn.com provides flag images; EU flag via a special path
  const src = countryCode === 'eu'
    ? 'https://flagcdn.com/w40/eu.png'
    : `https://flagcdn.com/w40/${countryCode}.png`;
  return (
    <img
      src={src}
      alt={countryCode}
      className="sa-currency-flag-img"
      style={{ width: size, height: 'auto' }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

function CurrencyDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);

  const selected = CURRENCIES.find((c) => c.value === value) || CURRENCIES[0];
  const filtered = CURRENCIES.filter(
    (c) => c.value.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="sa-currency-wrap" ref={wrapRef}>
      {/* Trigger */}
      <button
        type="button"
        className="sa-currency-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <FlagImg countryCode={selected.countryCode} />
        <span className="sa-currency-trigger-code">{selected.value}</span>
        <DownOutlined className={`sa-currency-trigger-caret${open ? ' sa-currency-trigger-caret--open' : ''}`} />
      </button>

      {open && (
        <div className="sa-currency-dropdown">
          {/* Search */}
          <div className="sa-currency-search">
            <span className="sa-currency-search-icon">🔍</span>
            <input
              autoFocus
              className="sa-currency-search-input"
              placeholder="Find currency"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* List */}
          <ul className="sa-currency-list">
            {filtered.map((c) => (
              <li
                key={c.value}
                className={`sa-currency-item${c.value === value ? ' sa-currency-item--active' : ''}`}
                onMouseDown={() => { onChange(c.value); setOpen(false); setSearch(''); }}
              >
                <FlagImg countryCode={c.countryCode} size={28} />
                <span className="sa-currency-item-code">{c.label}</span>
                <span className="sa-currency-item-example">{c.example}</span>
                {c.value === value && <CheckOutlined className="sa-currency-item-check" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SettingsAnalytics() {
  const [org, setOrg] = useState(null);

  // Timezone
  const [timezone, setTimezone] = useState('Etc/UTC');
  const [savingTz, setSavingTz] = useState(false);

  // Currency
  const [currency, setCurrency] = useState('USD');
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Engagement
  const [engagementEnabled, setEngagementEnabled] = useState(false);
  const [savingEngagement, setSavingEngagement] = useState(false);

  // Saved Filters
  const [savedFilters, setSavedFilters] = useState([{ name: 'Proposals', createdBy: 'QWILR' }]);
  const [newFilterName, setNewFilterName] = useState('');
  const [addingFilter, setAddingFilter] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState(null);

  // Default Clean Up
  const [enableLastEdited, setEnableLastEdited] = useState(false);
  const [savingCleanup, setSavingCleanup] = useState(false);

  useEffect(() => { loadOrg(); }, []);

  const loadOrg = async () => {
    try {
      const { data } = await get(ENDPOINTS.ORG_CURRENT);
      setOrg(data);
      const a = data.analyticsSettings || {};
      setTimezone(a.timezone || 'Etc/UTC');
      setCurrency(a.currency || 'USD');
      setEngagementEnabled(a.engagementEnabled || false);
      setSavedFilters(a.savedFilters?.length ? a.savedFilters : [{ name: 'Proposals', createdBy: 'QWILR' }]);
      setEnableLastEdited(a.enableLastEdited || false);
    } catch {
      // keep defaults
    }
  };

  const saveAnalytics = async (patch) => {
    const { data } = await put(ENDPOINTS.ORG_CURRENT, { analyticsSettings: patch });
    setOrg(data);
    return data;
  };

  const handleUpdateTimezone = async () => {
    setSavingTz(true);
    try {
      await saveAnalytics({ timezone });
      message.success('Timezone updated');
    } catch {
      message.error('Failed to update timezone');
    } finally { setSavingTz(false); }
  };

  const handleUpdateCurrency = async () => {
    setSavingCurrency(true);
    try {
      await saveAnalytics({ currency });
      message.success('Currency updated');
    } catch {
      message.error('Failed to update currency');
    } finally { setSavingCurrency(false); }
  };

  const handleUpdateEngagement = async () => {
    setSavingEngagement(true);
    try {
      await saveAnalytics({ engagementEnabled });
      message.success('Engagement permissions updated');
    } catch {
      message.error('Failed to update engagement settings');
    } finally { setSavingEngagement(false); }
  };

  const handleAddFilter = async () => {
    if (!newFilterName.trim()) return;
    const updated = [...savedFilters, { name: newFilterName.trim(), createdBy: org?.name?.toUpperCase() || 'USER' }];
    setSavedFilters(updated);
    setNewFilterName('');
    setAddingFilter(false);
    try {
      await saveAnalytics({ savedFilters: updated });
      message.success('Saved filter added');
    } catch {
      message.error('Failed to save filter');
    }
  };

  const handleToggleLastEdited = async (checked) => {
    setEnableLastEdited(checked);
    setSavingCleanup(true);
    try {
      await saveAnalytics({ enableLastEdited: checked });
      message.success(checked ? 'Last edited enabled' : 'Last edited disabled');
    } catch {
      setEnableLastEdited(!checked);
      message.error('Failed to update clean up settings');
    } finally { setSavingCleanup(false); }
  };

  return (
    <div className="sa-page">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="sa-hero">
        <div className="sa-hero-icon">
          <BarChartOutlined />
        </div>
        <h1 className="sa-hero-title">ANALYTICS &amp; REPORTING</h1>
        <p className="sa-hero-sub">Manage settings for Analytics and Reports</p>
      </div>

      <div className="sa-divider" />

      {/* ── Account Timezone ──────────────────────────────────────── */}
      <div className="sa-section">
        <h2 className="sa-section-title">Account time zone</h2>
        <div className="sa-field">
          <Select
            value={timezone}
            onChange={setTimezone}
            className="sa-select"
            size="large"
            showSearch
            filterOption={(input, opt) =>
              opt.value.toLowerCase().includes(input.toLowerCase())
            }
            options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
          />
        </div>
        <Button
          className="sa-btn-secondary"
          size="large"
          onClick={handleUpdateTimezone}
          loading={savingTz}
          disabled={savingTz}
        >
          Update timezone
        </Button>
      </div>

      <div className="sa-divider" />

      {/* ── Default Currency Filter ───────────────────────────────── */}
      <div className="sa-section">
        <div className="sa-section-hero">
          <div className="sa-section-icon"><DollarOutlined /></div>
          <h2 className="sa-section-title-center">DEFAULT CURRENCY FILTER</h2>
          <p className="sa-section-sub">Manage the default currency for Analytics and Reports</p>
        </div>
        <p className="sa-field-label">DEFAULT CURRENCY</p>
        <div className="sa-field">
          <CurrencyDropdown value={currency} onChange={setCurrency} />
        </div>
        <Button
          className="sa-btn-secondary"
          size="large"
          onClick={handleUpdateCurrency}
          loading={savingCurrency}
          disabled={savingCurrency}
        >
          Update default currency
        </Button>
      </div>

      <div className="sa-divider" />

      {/* ── Engagement ────────────────────────────────────────────── */}
      <div className="sa-section">
        <div className="sa-section-hero">
          <div className="sa-section-icon"><RiseOutlined /></div>
          <h2 className="sa-section-title-center">ENGAGEMENT</h2>
          <p className="sa-section-sub">Manage how engagement algorithms can be set on pages</p>
        </div>
        <div className="sa-toggle-row">
          <span className="sa-toggle-label">Allow creators to set engagement algorithms on pages</span>
          <Switch checked={engagementEnabled} onChange={setEngagementEnabled} />
        </div>
        <Button
          className="sa-btn-secondary"
          size="large"
          onClick={handleUpdateEngagement}
          loading={savingEngagement}
          disabled={savingEngagement}
        >
          Update engagement permissions
        </Button>
      </div>

      <div className="sa-divider" />

      {/* ── Saved Filters ─────────────────────────────────────────── */}
      <div className="sa-section">
        <div className="sa-section-hero">
          <div className="sa-section-icon"><FilterOutlined /></div>
          <h2 className="sa-section-title-center">SAVED FILTERS</h2>
          <p className="sa-section-sub">
            A Saved Filter is a group of Pages with filters for reporting.{' '}
            <a href="#" className="sa-link">Learn more about Saved Filters.</a>
          </p>
        </div>

        <div className="sa-filters-list">
          {savedFilters.map((filter, idx) => (
            <div key={idx} className="sa-filter-item">
              <div
                className="sa-filter-row"
                onClick={() => setExpandedFilter(expandedFilter === idx ? null : idx)}
              >
                <div className="sa-filter-left">
                  <span className="sa-filter-name">{filter.name}</span>
                  <EditOutlined className="sa-filter-edit-icon" />
                </div>
                <div className="sa-filter-right">
                  <span className="sa-filter-created">CREATED BY {filter.createdBy}</span>
                  <DownOutlined
                    className={`sa-filter-caret${expandedFilter === idx ? ' sa-filter-caret--open' : ''}`}
                  />
                </div>
              </div>
              {expandedFilter === idx && (
                <div className="sa-filter-body">
                  <p className="sa-filter-empty">No filter conditions set.</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {addingFilter ? (
          <div className="sa-add-filter-form">
            <Input
              autoFocus
              placeholder="Filter name"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              onPressEnter={handleAddFilter}
              className="sa-add-filter-input"
              size="large"
            />
            <Button type="primary" size="large" onClick={handleAddFilter} className="sa-add-filter-btn">
              Add
            </Button>
            <Button size="large" onClick={() => { setAddingFilter(false); setNewFilterName(''); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <button className="sa-add-filter-row" onClick={() => setAddingFilter(true)}>
            <PlusOutlined className="sa-add-filter-plus" />
            <span>Add a new Saved Filter</span>
          </button>
        )}
      </div>

      <div className="sa-divider" />

      {/* ── Default Clean Up ──────────────────────────────────────── */}
      <div className="sa-section">
        <div className="sa-section-hero">
          <div className="sa-section-icon"><ClearOutlined /></div>
          <h2 className="sa-section-title-center">DEFAULT CLEAN UP</h2>
          <p className="sa-section-sub">
            Manage Clean up default quick filters and values to show in the reports
          </p>
        </div>
        <div className="sa-toggle-row">
          <EditOutlined className="sa-cleanup-icon" />
          <span className="sa-toggle-label">Enable last edited</span>
          <Switch
            checked={enableLastEdited}
            onChange={handleToggleLastEdited}
            loading={savingCleanup}
          />
        </div>
      </div>

    </div>
  );
}
