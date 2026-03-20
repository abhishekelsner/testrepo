/**
 * Deleted — lists soft-deleted proposals with restore action (paginated / infinite scroll).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Spin, message } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { get, post } from '../../api/service';
import { ENDPOINTS } from '../../api/endpoints';
import './Dashboard.css';

const PAGE_SIZE = 10;

function Deleted() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(async (skip) => {
    const { data } = await get(ENDPOINTS.PROPOSALS_DELETED, {
      params: { skip, limit: PAGE_SIZE },
    });
    return {
      items: data?.proposals ?? [],
      total: typeof data?.total === 'number' ? data.total : 0,
      hasMore: Boolean(data?.hasMore),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { items, total: t, hasMore: more } = await fetchPage(0);
        if (!cancelled) {
          setProposals(items);
          setTotal(t);
          setHasMore(more);
        }
      } catch {
        if (!cancelled) {
          setProposals([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const { items, hasMore: more } = await fetchPage(proposals.length);
      setProposals((prev) => [...prev, ...items]);
      setHasMore(more);
    } catch {
      message.error('Could not load more');
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [fetchPage, hasMore, proposals.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '120px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, loadMore, proposals.length]);

  async function handleRestore(proposal) {
    setRestoring(proposal.id);
    try {
      await post(ENDPOINTS.PROPOSAL_RESTORE(proposal.id));
      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      setTotal((t) => Math.max(0, t - 1));
      message.success('Restored');
      navigate(`/${orgSlug}/dashboard`);
    } catch {
      message.error('Failed to restore');
    } finally {
      setRestoring(null);
    }
  }

  const canRestore = ['Admin', 'Owner', 'Creator'].includes(useAuthStore.getState()?.user?.role);

  return (
    <div className="dashboard-ref">
      <div className="dashboard-ref-header">
        <div className="dashboard-ref-folder-head">
          <FolderOutlined className="dashboard-ref-folder-icon" />
          <div>
            <h1 className="dashboard-ref-folder-title">Deleted</h1>
            <p className="dashboard-ref-folder-sub">
              {total} deleted page{total !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-ref-loading">
        {loading ? (
          <Spin size="large" />
        ) : proposals.length === 0 ? (
          <div className="dashboard-ref-empty">
            <p className="dashboard-ref-empty-text">No deleted pages.</p>
            <p className="dashboard-ref-empty-sub">
              Deleted proposals will appear here. You can restore them for 30 days.
            </p>
            <Button type="primary" onClick={() => navigate(`/${orgSlug}/dashboard`)}>
              Back to Pages
            </Button>
          </div>
        ) : (
          <div className="dashboard-ref-page-list">
            {proposals.map((p) => (
              <div
                key={p.id}
                className="dashboard-ref-page-row dashboard-ref-page-row-deleted"
              >
                <div className="dashboard-ref-page-body">
                  <span className="dashboard-ref-page-title">
                    {p.title || 'Untitled Proposal'}
                  </span>
                  <span className="dashboard-ref-page-tag">
                    {p.templateName || 'proposal'}
                  </span>
                  <span className="dashboard-ref-page-last-edited">
                    Deleted {p.deletedAt
                      ? new Date(p.deletedAt).toLocaleDateString()
                      : ''}
                  </span>
                </div>
                <div className="dashboard-ref-page-meta">
                  {canRestore && (
                    <Button
                      type="link"
                      size="small"
                      icon={<UndoOutlined />}
                      loading={restoring === p.id}
                      onClick={() => handleRestore(p)}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="dashboard-ref-deleted-sentinel"
                aria-hidden
              />
            )}
            {loadingMore && (
              <div className="dashboard-ref-deleted-load-more">
                <Spin size="small" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Deleted;
