/**
 * Dashboard — folder header, Convert a PDF / Create new, filter bar, page list with Eye/Star/Analytics icons.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FolderOutlined,
  UploadOutlined,
  DownOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  EyeOutlined,
  StarOutlined,
  StarFilled,
  BarChartOutlined,
  EllipsisOutlined,
  ShareAltOutlined,
  CopyOutlined,
  DeleteOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import { Button, Spin, message, Dropdown, Tooltip, Modal, Popover, Checkbox, Input, Select } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { useSearch } from '../../context/SearchContext';
import { get, post, put, del } from '../../api/service';
import { ENDPOINTS } from '../../api/endpoints';
import AnalyticsPopup from './AnalyticsPopup';
import EngagementGaugeIcon from '../../components/EngagementGaugeIcon';
import { PROPOSAL_MOVED_EVENT } from '../../context/FolderMoveContext';
import { decodeUrlOpaque, encodeUrlOpaque } from '../../utils/urlQueryOpaque';
import './Dashboard.css';

const FOLDER_NAME = 'Pages';

/** Resolve folder key from URL: ?folder=<opaque folder Mongo id> → custom-<id>, else Pages */
function getCurrentFolderKey(searchParams) {
  const raw = searchParams.get('folder');
  if (!raw) return 'pages';
  const decoded = decodeUrlOpaque(raw);
  if (decoded && /^[a-f0-9]{24}$/i.test(decoded)) {
    return `custom-${decoded}`;
  }
  return 'pages';
}

/**
 * Creates a small drag preview element for setDragImage (HTML5 Drag and Drop API).
 * The preview is a compact block with icon + page title, rendered off-screen so the
 * browser can capture it as the drag image without flashing on screen.
 * Caller must append to document.body, then setDragImage(preview, offsetX, offsetY),
 * and remove the node after drag starts (e.g. in requestAnimationFrame).
 */
function createPageDragPreviewElement(title) {
  const el = document.createElement('div');
  el.className = 'dashboard-ref-drag-preview';
  el.setAttribute('aria-hidden', 'true');
  const icon = document.createElement('span');
  icon.className = 'dashboard-ref-drag-preview-icon';
  icon.textContent = '\uD83D\uDCC4'; /* 📄 document emoji */
  const label = document.createElement('span');
  label.className = 'dashboard-ref-drag-preview-title';
  label.textContent = (title || 'Untitled').slice(0, 14);
  if ((title || '').length > 14) label.textContent += '…';
  el.appendChild(icon);
  el.appendChild(label);
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  el.style.top = '0';
  return el;
}

/** Use small custom drag preview (sidebar-item size); false = browser default full row */
const USE_CUSTOM_DRAG_IMAGE = true;

const SORT_OPTIONS = [
  { label: 'Last edited', value: 'updatedAt' },
  { label: 'Date created', value: 'createdAt' },
  { label: 'Alphabetical', value: 'title' },
  { label: 'Last viewed', value: 'lastViewed' },
  { label: 'Page views', value: 'views' },
];

function sortTime(value) {
  if (value == null) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** DD-MM-YYYY — matches “newest first” date reading (e.g. 20-03-2026 before 20-02-2026). */
function formatCreatedDashDate(iso) {
  if (iso == null) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Subtitle under title: created date when sorting by createdAt, else last edited. */
function pageRowSecondaryMeta(p, sortBy) {
  if (sortBy === 'createdAt') {
    const created = formatCreatedDashDate(p.createdAt);
    return created ? ` Created: ${created}` : '';
  }
  return p.updatedAt ? ` Last edited: ${new Date(p.updatedAt).toLocaleString()}` : '';
}

/**
 * Sort proposals by the active sort key. Date-based sorts are newest-first (descending).
 */
function compareProposalsBySort(a, b, sortBy) {
  if (sortBy === 'title') {
    return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
  }
  if (sortBy === 'views') {
    const vb = Number(b.viewCount) || 0;
    const va = Number(a.viewCount) || 0;
    if (vb !== va) return vb - va;
    return (b.sentTo?.length || 0) - (a.sentTo?.length || 0);
  }
  if (sortBy === 'createdAt') {
    return sortTime(b.createdAt) - sortTime(a.createdAt);
  }
  if (sortBy === 'lastViewed') {
    const tb = sortTime(b.lastViewedAt);
    const ta = sortTime(a.lastViewedAt);
    if (tb !== ta) return tb - ta;
    return sortTime(b.updatedAt) - sortTime(a.updatedAt);
  }
  return sortTime(b.updatedAt) - sortTime(a.updatedAt);
}

/** Non-empty variables map — “Value” / has content filter */
function hasValueVariables(variables) {
  if (!variables || typeof variables !== 'object') return false;
  return Object.values(variables).some((val) => {
    if (val == null) return false;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return String(val).trim() !== '';
  });
}

/** Engagement checkboxes use analytics + status; OR semantics across selected keys */
function proposalMatchesEngagementFilters(p, keys) {
  if (!keys?.length) return true;
  const viewCount = Number(p.viewCount) || 0;
  const clickCount = Number(p.clickCount) || 0;
  const status = String(p.status || '').toLowerCase();
  return keys.some((key) => {
    switch (key) {
      case 'viewed':
        return viewCount > 0;
      case 'not_viewed':
        return viewCount === 0;
      case 'interacted':
        return clickCount >= 1;
      case 'no_interaction':
        return clickCount === 0;
      case 'signed':
        return status === 'accepted';
      case 'not_signed':
        return status !== 'accepted';
      default:
        return Array.isArray(p.engagement) && p.engagement.includes(key);
    }
  });
}

function Dashboard() {
  const { user } = useAuthStore();
  const { searchQuery } = useSearch();
  const navigate = useNavigate();
  const { orgSlug } = useParams();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    templateName: '',
    tag: [],
    engagement: [],
    people: '',
    value: false,
  });
  const [sortBy, setSortBy] = useState('updatedAt');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [analyticsProposal, setAnalyticsProposal] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, proposal: null });
  const [shareModal, setShareModal] = useState({ open: false, proposal: null });
  const [unmonitoredModal, setUnmonitoredModal] = useState({ open: false, proposal: null });
  const [draggingProposalId, setDraggingProposalId] = useState(null);
  const isDraggingRef = useRef(false);
  const dragPreviewRef = useRef(null);
  const selectAllCheckboxRef = useRef(null);
  const [searchParams] = useSearchParams();
  const currentFolderKey = getCurrentFolderKey(searchParams);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState({ open: false });
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Fetch proposals for the current folder (backend filters by folderId)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    get(ENDPOINTS.PROPOSALS, { params: { folderId: currentFolderKey } })
      .then(({ data }) => {
        if (!cancelled) setProposals(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setProposals([]);
          const status = err.response?.status;
          if (status === 403) {
            message.error(err.response?.data?.error || 'You do not have access to this folder');
            navigate(`/${orgSlug}/dashboard`, { replace: true });
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentFolderKey, orgSlug, navigate]);

  // Clean up drag preview element if component unmounts during drag
  useEffect(() => () => {
    if (dragPreviewRef.current?.parentNode) {
      dragPreviewRef.current.remove();
      dragPreviewRef.current = null;
    }
  }, []);

  // Listen for drag-drop move: remove from list if moved out, refetch if moved in
  useEffect(() => {
    const handler = (e) => {
      const { proposalId, fromFolderKey, toFolderKey } = e.detail || {};
      if (fromFolderKey === currentFolderKey) {
        setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      }
      if (toFolderKey === currentFolderKey && fromFolderKey !== currentFolderKey) {
        get(ENDPOINTS.PROPOSALS, { params: { folderId: currentFolderKey } })
          .then(({ data }) => setProposals(Array.isArray(data) ? data : []))
          .catch(() => {});
      }
    };
    window.addEventListener(PROPOSAL_MOVED_EVENT, handler);
    return () => window.removeEventListener(PROPOSAL_MOVED_EVENT, handler);
  }, [currentFolderKey]);

  const filteredAndSorted = useMemo(() => {
    let list = [...proposals];
    if (filters.status?.length) {
      const wanted = new Set(filters.status.map((s) => String(s).toLowerCase()));
      list = list.filter((p) => wanted.has(String(p.status || '').toLowerCase()));
    }
    if (filters.templateName?.trim()) {
      const q = filters.templateName.trim().toLowerCase();
      list = list.filter((p) => (p.templateName || '').toLowerCase().includes(q));
    }
    if (filters.tag?.length) {
      const wanted = new Set(filters.tag.map((t) => String(t).toLowerCase()));
      list = list.filter((p) =>
        (p.tags || []).some((t) => wanted.has(String(t).toLowerCase()))
      );
    }
    if (filters.engagement?.length) {
      list = list.filter((p) => proposalMatchesEngagementFilters(p, filters.engagement));
    }
    if (filters.people?.trim()) {
      const q = filters.people.trim().toLowerCase();
      list = list.filter((p) =>
        (p.sentTo || []).some((s) => (s.email || '').toLowerCase().includes(q))
      );
    }
    if (filters.value) {
      list = list.filter((p) => hasValueVariables(p.variables));
    }

    list.sort((a, b) => compareProposalsBySort(a, b, sortBy));
    return list;
  }, [proposals, filters, sortBy]);

  const displayList = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return filteredAndSorted;
    return [...filteredAndSorted].sort((a, b) => {
      const aMatch = (a.title || '').toLowerCase().includes(q) || (a.slug || '').toLowerCase().includes(q);
      const bMatch = (b.title || '').toLowerCase().includes(q) || (b.slug || '').toLowerCase().includes(q);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return compareProposalsBySort(a, b, sortBy);
    });
  }, [filteredAndSorted, searchQuery, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy, pageSize]);

  const totalCount = displayList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedList = displayList.slice(startIdx, startIdx + pageSize);
  const viewStart = totalCount === 0 ? 0 : startIdx + 1;
  const viewEnd = Math.min(startIdx + pageSize, totalCount);

  const allDisplayIds = useMemo(() => displayList.map((p) => p.id), [displayList]);
  const selectAllChecked = allDisplayIds.length > 0 && selectedIds.length === allDisplayIds.length;
  const selectAllIndeterminate = selectedIds.length > 0 && selectedIds.length < allDisplayIds.length;

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = !!selectAllIndeterminate;
  }, [selectAllIndeterminate]);

  function handleSelectAllChange(checked) {
    if (checked) setSelectedIds([...allDisplayIds]);
    else setSelectedIds([]);
  }

  function handleRowSelectChange(proposalId, checked) {
    if (checked) setSelectedIds((prev) => (prev.includes(proposalId) ? prev : [...prev, proposalId]));
    else setSelectedIds((prev) => prev.filter((id) => id !== proposalId));
  }

  function openBulkDeleteModal() {
    setBulkDeleteModal({ open: true });
  }

  function closeBulkDeleteModal() {
    setBulkDeleteModal({ open: false });
  }

  async function confirmBulkDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    closeBulkDeleteModal();
    setSelectedIds([]);
    let failed = 0;
    for (const id of ids) {
      try {
        await del(ENDPOINTS.PROPOSAL_BY_ID(id));
        setProposals((prev) => prev.filter((p) => p.id !== id));
      } catch {
        failed += 1;
      }
    }
    if (failed) message.error(`Failed to delete ${failed} page(s)`);
    else if (ids.length) message.success(`Deleted ${ids.length} page(s)`);
  }

  async function createNew() {
    try {
      const { data } = await post(ENDPOINTS.PROPOSALS, {
        title: 'New Proposal',
        folderId: currentFolderKey === 'pages' ? null : currentFolderKey,
      });
      navigate(`/${orgSlug}/proposals/${encodeUrlOpaque(data.id)}/edit`);
    } catch {
      message.error('Failed to create proposal');
    }
  }

  function handlePreview(e, proposal) {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    // Open public view page with ?id= (proposal must be published to load)
    const url = `${window.location.origin}/view/?id=${encodeURIComponent(encodeUrlOpaque(proposal.id))}`;
    window.open(url, '_blank');
  }

  async function handleToggleStar(e, proposal) {
    e?.stopPropagation?.();
    try {
      await put(ENDPOINTS.PROPOSAL_BY_ID(proposal.id), {
        starred: !proposal.starred,
      });
      setProposals((prev) =>
        prev.map((p) => (p.id === proposal.id ? { ...p, starred: !p.starred } : p))
      );
    } catch {
      message.error('Failed to update');
    }
  }

  function openAnalytics(e, proposal) {
    e?.stopPropagation?.();
    setAnalyticsProposal(proposal);
  }

  function closeAnalytics() {
    setAnalyticsProposal(null);
  }

  function showDeleteModal(proposal) {
    setDeleteModal({ open: true, proposal });
  }

  function closeDeleteModal() {
    setDeleteModal({ open: false, proposal: null });
  }

  function openShareModal(e, proposal) {
    e?.stopPropagation?.();
    setShareModal({ open: true, proposal });
  }

  function closeShareModal() {
    setShareModal({ open: false, proposal: null });
  }

  function openUnmonitoredModal(e, proposal) {
    e?.stopPropagation?.();
    setUnmonitoredModal({ open: true, proposal });
  }

  function closeUnmonitoredModal() {
    setUnmonitoredModal({ open: false, proposal: null });
  }

  async function handleDuplicate(e, proposal) {
    e?.stopPropagation?.();
    try {
      const { data } = await post(ENDPOINTS.PROPOSALS, {
        title: `${proposal.title || 'Untitled'} (Copy)`,
        cloneFromId: proposal.id,
      });
      setProposals((prev) => [data, ...prev]);
      message.success('Duplicated');
      navigate(`/${orgSlug}/proposals/${encodeUrlOpaque(data.id)}/edit`);
    } catch {
      message.error('Failed to duplicate');
    }
  }

  async function confirmDelete() {
    const { proposal } = deleteModal;
    if (!proposal) return;
    try {
      await del(ENDPOINTS.PROPOSAL_BY_ID(proposal.id));
      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      closeDeleteModal();
      message.success('Deleted');
    } catch {
      message.error('Failed to delete');
    }
  }

  const canDelete = ['Admin', 'Owner'].includes(user?.role);

  function handlePageSizeChange(size) {
    setPageSize(size);
    setCurrentPage(1);
  }

  function goToPrevPage() {
    setCurrentPage((p) => Math.max(1, p - 1));
  }

  function goToNextPage() {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }

  const filtersContent = (
    <div className="dashboard-ref-filters-popover" style={{ maxHeight: 420, overflowY: 'auto', width: 320 }}>
      <div className="dashboard-ref-filter-section">
        <div className="dashboard-ref-filter-section-title">STATUS</div>
        <Checkbox.Group
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={[
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Accepted', value: 'accepted' },
            { label: 'Declined', value: 'declined' },
          ]}
        />
      </div>
      <div className="dashboard-ref-filter-section">
        <div className="dashboard-ref-filter-section-title">PAGE FILTERS</div>
        <div className="dashboard-ref-filter-field">
          <label>Template name</label>
          <input
            type="text"
            placeholder="Filter by template"
            value={filters.templateName}
            onChange={(e) => setFilters((f) => ({ ...f, templateName: e.target.value }))}
            className="dashboard-ref-filter-input"
          />
        </div>
        <div className="dashboard-ref-filter-field">
          <label>Tag (checkbox)</label>
          <Checkbox.Group
            value={filters.tag}
            onChange={(v) => setFilters((f) => ({ ...f, tag: v }))}
            options={[
              { label: 'Sales', value: 'sales' },
              { label: 'Marketing', value: 'marketing' },
              { label: 'Proposal', value: 'proposal' },
            ]}
          />
        </div>
      </div>
      <div className="dashboard-ref-filter-section">
        <div className="dashboard-ref-filter-section-title">HAS CONTENT</div>
        <div className="dashboard-ref-filter-field">
          <Checkbox
            checked={filters.value}
            onChange={(e) => setFilters((f) => ({ ...f, value: e.target.checked }))}
          >
            Value
          </Checkbox>
        </div>
      </div>
      <div className="dashboard-ref-filter-section">
        <div className="dashboard-ref-filter-section-title">Engagement</div>
        <div className="dashboard-ref-engagement-grid">
          <div className="dashboard-ref-engagement-row">
            <Checkbox.Group
              value={filters.engagement}
              onChange={(v) => setFilters((f) => ({ ...f, engagement: v }))}
              options={[
                { label: 'Viewed', value: 'viewed' },
                { label: 'Interacted', value: 'interacted' },
                { label: 'Signed', value: 'signed' },
              ]}
            />
          </div>
          <div className="dashboard-ref-engagement-row">
            <Checkbox.Group
              value={filters.engagement}
              onChange={(v) => setFilters((f) => ({ ...f, engagement: v }))}
              options={[
                { label: 'Not viewed', value: 'not_viewed' },
                { label: 'No interaction', value: 'no_interaction' },
                { label: 'Not signed', value: 'not_signed' },
              ]}
            />
          </div>
        </div>
      </div>
      <div className="dashboard-ref-filter-section">
        <div className="dashboard-ref-filter-section-title">People</div>
        <div className="dashboard-ref-filter-field">
          <input
            type="text"
            placeholder="Filter by people"
            value={filters.people}
            onChange={(e) => setFilters((f) => ({ ...f, people: e.target.value }))}
            className="dashboard-ref-filter-input"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-ref">
      <div className="dashboard-ref-header">
        <div className="dashboard-ref-folder-head">
          <FolderOutlined className="dashboard-ref-folder-icon" />
          <div>
            <h1 className="dashboard-ref-folder-title">{FOLDER_NAME}</h1>
            <p className="dashboard-ref-folder-sub">
              {totalCount} page{totalCount !== 1 ? 's' : ''} inside this folder.
            </p>
          </div>
        </div>
        <div className="dashboard-ref-actions">
          {/* <Button size="large" icon={<UploadOutlined />} className="dashboard-ref-btn-secondary">
            Convert a PDF
          </Button> */}
          {['Owner', 'Admin', 'Creator'].includes(user?.role) && (
            <Button
              type="primary"
              size="large"
              icon={<DownOutlined />}
              className="dashboard-ref-btn-primary"
              onClick={createNew}
            >
              Create new
              <DownOutlined className="dashboard-ref-btn-create-arrow" />
            </Button>
          )}
        </div>
      </div>

      <div className="dashboard-ref-list-bar">
        <label className="dashboard-ref-select-all">
          <input
            ref={selectAllCheckboxRef}
            type="checkbox"
            checked={selectAllChecked}
            onChange={(e) => handleSelectAllChange(e.target.checked)}
          />{' '}
          Select all
        </label>
        {selectedIds.length > 0 && canDelete && (
          <Tooltip title="Delete selected">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              className="dashboard-ref-bulk-delete"
              onClick={(e) => {
                e.stopPropagation();
                openBulkDeleteModal();
              }}
            >
              Delete all
            </Button>
          </Tooltip>
        )}
        <div className="dashboard-ref-filters">
          <Popover
            content={filtersContent}
            trigger="click"
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
          >
            <span
              className="dashboard-ref-filter-item"
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setFiltersOpen((v) => !v)}
            >
              <FilterOutlined /> Filters
            </span>
          </Popover>
          <Dropdown
            menu={{
              className: 'dashboard-ref-sort-menu',
              selectedKeys: [sortBy],
              items: SORT_OPTIONS.map((opt) => ({
                key: opt.value,
                label: opt.label,
                onClick: () => setSortBy(opt.value),
              })),
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <span
              className="dashboard-ref-sort dashboard-ref-sort-trigger"
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
            >
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Last modified'}
              <SortAscendingOutlined className="dashboard-ref-sort-icon" />
            </span>
          </Dropdown>
        </div>
      </div>

      <div className="dashboard-ref-loading">
        {loading ? (
          <Spin size="large" />
        ) : (
          <div className="dashboard-ref-page-list">
            {totalCount === 0 ? (
              <div className="dashboard-ref-empty">
                <p className="dashboard-ref-empty-text">No pages yet.</p>
                <p className="dashboard-ref-empty-sub">
                  Create a new proposal or browse templates to get started.
                </p>
                <Button type="primary" onClick={createNew}>
                  Create new
                </Button>
              </div>
            ) : (
              paginatedList.map((p) => (
                <div
                  key={p.id}
                  className={`dashboard-ref-page-row dashboard-ref-page-row-clickable dashboard-ref-page-row-draggable${draggingProposalId === p.id ? ' dashboard-ref-page-row-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    isDraggingRef.current = true;
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({ proposalId: p.id, sourceFolderKey: currentFolderKey })
                    );
                    e.dataTransfer.effectAllowed = 'move';
                    if (USE_CUSTOM_DRAG_IMAGE) {
                      let preview = null;
                      try {
                        preview = createPageDragPreviewElement(p.title);
                        document.body.appendChild(preview);
                        dragPreviewRef.current = preview;
                        void preview.offsetHeight;
                        e.dataTransfer.setDragImage(preview, 12, 14);
                      } catch {
                        if (preview?.parentNode) preview.remove();
                        dragPreviewRef.current = null;
                      }
                    }
                    requestAnimationFrame(() => setDraggingProposalId(p.id));
                  }}
                  onDragEnd={() => {
                    if (dragPreviewRef.current?.parentNode) {
                      dragPreviewRef.current.remove();
                      dragPreviewRef.current = null;
                    }
                    isDraggingRef.current = false;
                    setDraggingProposalId(null);
                  }}
                  onClick={() => {
                    if (isDraggingRef.current) return;
                    navigate(`/${orgSlug}/proposals/${encodeUrlOpaque(p.id)}/edit`);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && !isDraggingRef.current && navigate(`/${orgSlug}/proposals/${encodeUrlOpaque(p.id)}/edit`)
                  }
                >
                  <input
                    type="checkbox"
                    className="dashboard-ref-page-check"
                    checked={selectedSet.has(p.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRowSelectChange(p.id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="dashboard-ref-page-body">
                    <span className="dashboard-ref-page-title">
                      {p.title || 'Untitled Proposal'}
                    </span>
                    <span className="dashboard-ref-page-meta-line">
                      <CaretRightOutlined className="dashboard-ref-page-meta-arrow" />
                      {(p.tags?.length ? p.tags.join(', ') : 'NO TAGS')}
                      {pageRowSecondaryMeta(p, sortBy)}
                    </span>
                  </div>
                  <div className="dashboard-ref-page-meta">
                    <span
                      className={`dashboard-ref-page-status ${
                        p.status === 'published'
                          ? 'live'
                          : p.status === 'accepted'
                            ? 'accepted'
                            : p.status === 'declined'
                              ? 'declined'
                              : p.status === 'pending'
                                ? 'live'
                                : 'draft'
                      }`}
                    >
                      {p.status === 'published'
                        ? 'LIVE'
                        : p.status === 'accepted'
                          ? 'SIGNED'
                          : p.status === 'declined'
                            ? 'DECLINED'
                            : p.status === 'pending'
                              ? 'PENDING'
                              : 'DRAFT'}
                    </span>
                    <span className="dashboard-ref-page-views">
                      {(p.sentTo?.length || 0) > 0
                        ? `${p.sentTo.length} VIEW${(p.sentTo?.length || 0) === 1 ? '' : 'S'}`
                        : 'NO VIEWS'}
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      className="dashboard-ref-share-hover-only dashboard-ref-share-btn-inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openShareModal(e, p);
                      }}
                      icon={<ShareAltOutlined />}
                    >
                      Share
                    </Button>
                    <span
                      className="dashboard-ref-page-hover-only"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handlePreview(e, p);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          handlePreview(e, p);
                        }
                      }}
                    >
                      <Tooltip title="Preview">
                        <EyeOutlined className="dashboard-ref-page-icon" />
                      </Tooltip>
                    </span>
                    <span className="dashboard-ref-page-hover-only" onClick={(e) => handleToggleStar(e, p)}>
                      <Tooltip title="Star">
                        {p.starred ? (
                          <StarFilled
                            className="dashboard-ref-page-icon"
                            style={{ color: '#fadb14' }}
                          />
                        ) : (
                          <StarOutlined className="dashboard-ref-page-icon" />
                        )}
                      </Tooltip>
                    </span>
                    <Popover
                      content={
                        <div className="dashboard-ref-unmonitored-content">
                          <div className="dashboard-ref-unmonitored-header">
                            <EngagementGaugeIcon level={p.engagementLevel} size={24} />
                            <span>
                              {p.engagementLevel === 'unmonitored' ? 'UNMONITORED' : p.engagementLevel === 'high' ? 'HIGH ENGAGEMENT' : p.engagementLevel === 'medium' ? 'MEDIUM ENGAGEMENT' : 'LOW ENGAGEMENT'}
                            </span>
                          </div>
                          <p className="dashboard-ref-unmonitored-text">
                            {p.engagementLevel === 'unmonitored'
                              ? "No viewer data yet. Share this page so viewers can open it; engagement is based on time spent and interactions."
                              : p.engagementLevel === 'high'
                                ? 'Viewers are spending time and interacting with this page.'
                                : p.engagementLevel === 'medium'
                                  ? 'Viewers have viewed and interacted with some sections.'
                                  : 'Opened but little interaction so far.'}
                          </p>
                        </div>
                      }
                      trigger="click"
                      placement="bottomLeft"
                      arrow={false}
                      align={{ offset: [0, 4] }}
                      open={unmonitoredModal.open && unmonitoredModal.proposal?.id === p.id}
                      onOpenChange={(open) => {
                        if (open) setUnmonitoredModal({ open: true, proposal: p });
                        else closeUnmonitoredModal();
                      }}
                      overlayStyle={{ width: 280 }}
                      overlayClassName="dashboard-ref-unmonitored-popover"
                    >
                      <span
                        className="dashboard-ref-share-hover-only"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EngagementGaugeIcon level={p.engagementLevel || 'unmonitored'} size={20} className="dashboard-ref-page-icon" />
                      </span>
                    </Popover>
                    <span className="dashboard-ref-page-hover-only" onClick={(e) => openAnalytics(e, p)}>
                      <Tooltip title="Analytics">
                        <BarChartOutlined className="dashboard-ref-page-icon" />
                      </Tooltip>
                    </span>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'share',
                            label: 'Share',
                            icon: <ShareAltOutlined />,
                            onClick: (info) => {
                              info.domEvent?.stopPropagation?.();
                              openShareModal(info.domEvent, p);
                            },
                          },
                          {
                            key: 'duplicate',
                            label: 'Duplicate',
                            icon: <CopyOutlined />,
                            onClick: (info) => {
                              info.domEvent?.stopPropagation?.();
                              handleDuplicate(info.domEvent, p);
                            },
                          },
                          { type: 'divider' },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: <DeleteOutlined />,
                            danger: true,
                            disabled: !canDelete,
                            onClick: (e) => {
                              e.domEvent?.stopPropagation?.();
                              showDeleteModal(p);
                            },
                          },
                        ],
                      }}
                      trigger={['click']}
                    >
                      <span className="dashboard-ref-page-hover-only" onClick={(e) => e.stopPropagation()}>
                        <EllipsisOutlined
                          className="dashboard-ref-page-icon dashboard-ref-page-more-action"
                        />
                      </span>
                    </Dropdown>
                  </div>
                </div>
              ))
            )}
            <div
              className="dashboard-ref-page-row dashboard-ref-page-row-placeholder"
              onClick={() => navigate(`/${orgSlug}/templates`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/${orgSlug}/templates`)}
            >
              <input type="checkbox" className="dashboard-ref-page-check" disabled />
              <div className="dashboard-ref-page-body">
                <span className="dashboard-ref-page-title">
                  Browse templates or create a new proposal
                </span>
                <span className="dashboard-ref-page-tag">templates</span>
              </div>
              <div className="dashboard-ref-page-meta">
                <Link to={`/${orgSlug}/templates`} onClick={(e) => e.stopPropagation()}>
                  Templates
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-ref-pagination">
        <span className="dashboard-ref-pagination-info">
          Viewing {viewStart}–{viewEnd} of {totalCount}
        </span>
        <span className="dashboard-ref-pagination-show">
          <Select
            value={pageSize}
            onChange={handlePageSizeChange}
            options={[
              { value: 10, label: 'Show 10 at a time' },
              { value: 25, label: 'Show 25 at a time' },
              { value: 50, label: 'Show 50 at a time' },
            ]}
            className="dashboard-ref-pagination-page-size-select"
            popupClassName="dashboard-ref-pagination-page-size-popup"
            aria-label="Rows per page"
          />
        </span>
        <span className="dashboard-ref-pagination-nav">
          <button
            type="button"
            className="dashboard-ref-pagination-arrow"
            aria-label="Previous page"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            &lt;
          </button>
          <span className="dashboard-ref-pagination-page">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="dashboard-ref-pagination-arrow"
            aria-label="Next page"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            &gt;
          </button>
        </span>
      </div>

      <Modal
        title="Delete proposal"
        open={deleteModal.open}
        onCancel={closeDeleteModal}
        onOk={confirmDelete}
        okText="Delete"
        okButtonProps={{ danger: true }}
        footer={[
          <Button key="cancel" onClick={closeDeleteModal}>
            Cancel
          </Button>,
          <Button key="delete" danger onClick={confirmDelete}>
            Delete
          </Button>,
        ]}
      >
        {deleteModal.proposal && (
          <p>
            Are you sure you want to delete &apos;{deleteModal.proposal.title || 'Untitled Proposal'}
            &apos;?
          </p>
        )}
      </Modal>

      <Modal
        title="Delete selected pages"
        open={bulkDeleteModal.open}
        onCancel={closeBulkDeleteModal}
        onOk={confirmBulkDelete}
        okText="Delete all"
        okButtonProps={{ danger: true }}
        footer={[
          <Button key="cancel" onClick={closeBulkDeleteModal}>
            Cancel
          </Button>,
          <Button key="delete" danger onClick={confirmBulkDelete}>
            Delete {selectedIds.length} page{selectedIds.length !== 1 ? 's' : ''}
          </Button>,
        ]}
      >
        <p>
          Are you sure you want to delete {selectedIds.length} page{selectedIds.length !== 1 ? 's' : ''}? This cannot be undone.
        </p>
      </Modal>

      <Modal
        title="Share proposal"
        open={shareModal.open}
        onCancel={closeShareModal}
        footer={null}
        destroyOnHidden
      >
        {shareModal.proposal && (
          <ShareModalContent
            proposal={shareModal.proposal}
            orgSlug={orgSlug}
            onClose={closeShareModal}
            onSent={(sentEmail) => {
              setProposals((prev) =>
                prev.map((p) =>
                  p.id === shareModal.proposal?.id
                    ? { ...p, sentTo: [...(p.sentTo || []), { email: sentEmail, sentAt: new Date() }] }
                    : p
                )
              );
              closeShareModal();
            }}
          />
        )}
      </Modal>

      <AnalyticsPopup
        open={!!analyticsProposal}
        onClose={closeAnalytics}
        proposal={analyticsProposal}
        orgSlug={orgSlug}
      />
    </div>
  );
}

function ShareModalContent({ proposal, orgSlug, onClose, onSent }) {
  const [email, setEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sending, setSending] = useState(false);
  const isPublished = proposal?.status === 'published' && proposal?.slug;
  const publicUrl = isPublished
    ? `${window.location.origin}/view/${proposal.slug}`
    : null;

  async function handleSend() {
    const to = email.trim().toLowerCase();
    if (!to) {
      message.error('Enter an email address');
      return;
    }
    if (!isPublished) {
      message.error('Publish the proposal before sharing');
      return;
    }
    setSending(true);
    try {
      await post(ENDPOINTS.PROPOSAL_SEND_EMAIL(proposal.id), { to, message: shareMessage.trim() || undefined });
      message.success('Shared successfully! The recipient will receive the full proposal link by email.');
      onSent(to);
    } catch (e) {
      message.error(e?.response?.data?.error || 'Failed to share');
    } finally {
      setSending(false);
    }
  }

  function handleCopyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      message.success('Link copied to clipboard!');
    }).catch(() => {
      message.error('Could not copy link');
    });
  }

  return (
    <div className="dashboard-ref-share-modal">
      <p className="dashboard-ref-share-title">{proposal?.title || 'Untitled Proposal'}</p>

      {!isPublished ? (
        <p className="dashboard-ref-share-warn">
          ⚠️ Publish this proposal first to share it via link.
        </p>
      ) : (
        <div className="dashboard-ref-share-link-row">
          <Input
            readOnly
            value={publicUrl}
            className="dashboard-ref-share-link-input"
          />
          <Tooltip title="Copy link">
            <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
              Copy Link
            </Button>
          </Tooltip>
        </div>
      )}

      <div className="dashboard-ref-share-divider">
        <span>Or send via email</span>
      </div>

      <div className="dashboard-ref-share-field">
        <label>Email address</label>
        <Input
          type="email"
          placeholder="Enter recipient email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!isPublished}
          onPressEnter={handleSend}
        />
      </div>
      <div className="dashboard-ref-share-field">
        <label>Message (optional)</label>
        <Input.TextArea
          rows={3}
          placeholder="Add a personal message to include in the email…"
          value={shareMessage}
          onChange={(e) => setShareMessage(e.target.value)}
          disabled={!isPublished}
        />
      </div>
      <div className="dashboard-ref-share-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="primary"
          loading={sending}
          onClick={handleSend}
          disabled={!isPublished}
          icon={<ShareAltOutlined />}
        >
          Send Email
        </Button>
      </div>
    </div>
  );
}

export default Dashboard;

