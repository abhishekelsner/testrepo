/**
 * Public view for a published proposal — no auth required.
 * Routes: /view?id=xxx or /view/:slug
 * Layout: sticky navbar, TOC sidebar (toggle), scrollable content.
 * Provides pageCaptureRef for PDF export (agreement modal captures this content first, then agreement).
 * Sends analytics open/close events to the API so admin dashboard shows real view counts and time spent.
 */
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Typography, Spin } from 'antd';
import { LockOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { get, post, ENDPOINTS } from '../../api';
import { BLOCK_COMPONENTS } from './blockRegistry';
import Logo from '../../components/Logo';
import AgreementModal from './blocks/AgreementModal';
import { extractTocItems } from './TOCSidebar';
import { ProposalViewContext } from './ProposalViewContext';
import { decodeUrlOpaque } from '../../utils/urlQueryOpaque';
import './PublicProposalView.css';

const VISITOR_ID_KEY = 'proposal_visitor_id';
const SESSION_STORAGE_PREFIX = 'proposal_view_session_';
const SESSION_GEO_PREFIX = 'proposal_geo_';
const SESSION_VIEWER_PREFIX = 'proposal_viewer_';

/** One view per browser (tab) session: use sessionStorage so refresh/revisit in same tab does not count again. */
function getStoredSession(slug) {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_PREFIX + slug);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function setStoredSession(slug, data) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_PREFIX + slug, JSON.stringify(data));
  } catch (_) {}
}

function getOrCreateVisitorId() {
  let id = typeof localStorage !== 'undefined' ? localStorage.getItem(VISITOR_ID_KEY) : null;
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    try { localStorage.setItem(VISITOR_ID_KEY, id); } catch (_) {}
  }
  return id;
}

function getEventsUrl(slug) {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const path = `public/proposals/${encodeURIComponent(slug)}/events`;
  return base.startsWith('http') ? `${base}/${path}` : `${window.location.origin}${base}/${path}`;
}

function getSessionGeo(sessionId) {
  if (typeof sessionStorage === 'undefined' || !sessionId) return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_GEO_PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSessionGeo(sessionId, data) {
  if (typeof sessionStorage === 'undefined' || !sessionId) return;
  try {
    sessionStorage.setItem(`${SESSION_GEO_PREFIX}${sessionId}`, JSON.stringify(data || {}));
  } catch {}
}

async function fetchGeoOncePerSession(sessionId) {
  const cached = getSessionGeo(sessionId);
  if (cached) return cached;
  const fallback = { locationUnavailable: true, city: null, region: null, country: null };
  const sources = [
    {
      url: 'https://ipapi.co/json/',
      map: (d) => ({ city: d?.city || null, region: d?.region || null, country: d?.country_name || null }),
    },
    {
      url: 'https://ipwho.is/',
      map: (d) => ({ city: d?.city || null, region: d?.region || null, country: d?.country || null }),
    },
    {
      url: 'https://ip-api.com/json/?fields=status,country,regionName,city',
      map: (d) => ({ city: d?.city || null, region: d?.regionName || null, country: d?.country || null }),
    },
  ];
  for (const src of sources) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1900);
      const res = await fetch(src.url, { signal: ctrl.signal });
      clearTimeout(timer);
      const data = await res.json();
      const mapped = src.map(data || {});
      if (mapped.city || mapped.region || mapped.country) {
        const geo = { ...mapped, locationUnavailable: false };
        setSessionGeo(sessionId, geo);
        return geo;
      }
    } catch {
      // try next provider
    }
  }
  setSessionGeo(sessionId, fallback);
  return fallback;
}

function getSessionViewerIdentity(sessionId) {
  if (typeof sessionStorage === 'undefined' || !sessionId) return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_VIEWER_PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSessionViewerIdentity(sessionId, data) {
  if (typeof sessionStorage === 'undefined' || !sessionId) return;
  try {
    sessionStorage.setItem(`${SESSION_VIEWER_PREFIX}${sessionId}`, JSON.stringify(data || {}));
  } catch {}
}

const { Title } = Typography;

function PublicProposalView() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const idFromQuery = searchParams.get('id');
  const decodedQueryId = useMemo(() => {
    const q = idFromQuery?.trim();
    if (!q) return '';
    return decodeUrlOpaque(q);
  }, [idFromQuery]);
  const emailFromUrl = searchParams.get('email')?.trim()?.toLowerCase() || '';
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [viewerEmail, setViewerEmail] = useState('');
  const [viewerStatus, setViewerStatus] = useState(null);
  const [viewerStatusLoading, setViewerStatusLoading] = useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);

  const pageCaptureRef = useRef(null);
  const analyticsSessionIdRef = useRef(null);
  const analyticsOpenTimeRef = useRef(null);
  const analyticsCloseSentRef = useRef(false);
  const sectionDurationsRef = useRef({});
  const activeSectionIdRef = useRef(null);
  const activeSectionStartedAtRef = useRef(0);
  const sectionTrackingEnabledRef = useRef(true);
  const sectionMetaRef = useRef({});

  const contentRef = useRef(null);
  const blockRefs = useRef({});

  const byId = !!decodedQueryId;
  const slugOrId = byId ? decodedQueryId : (slug || '').trim();

  useEffect(() => {
    if (emailFromUrl) setViewerEmail(emailFromUrl);
  }, [emailFromUrl]);

  const refetchViewerStatus = useCallback(() => {
    if (!slugOrId || !viewerEmail) return Promise.resolve();
    setViewerStatusLoading(true);
    const url = `${ENDPOINTS.PUBLIC_VIEWER_STATUS(slugOrId, byId)}?email=${encodeURIComponent(viewerEmail)}`;
    return get(url)
      .then(({ data }) => setViewerStatus(data))
      .catch(() => setViewerStatus({ allowed: false, alreadyAccepted: false }))
      .finally(() => setViewerStatusLoading(false));
  }, [slugOrId, viewerEmail, byId]);

  useEffect(() => {
    if (!proposal || !viewerEmail) {
      if (viewerEmail && proposal) setViewerStatus(null);
      return;
    }
    let cancelled = false;
    setViewerStatusLoading(true);
    const url = `${ENDPOINTS.PUBLIC_VIEWER_STATUS(slugOrId, byId)}?email=${encodeURIComponent(viewerEmail)}`;
    get(url)
      .then(({ data }) => { if (!cancelled) setViewerStatus(data); })
      .catch(() => { if (!cancelled) setViewerStatus({ allowed: false, alreadyAccepted: false }); })
      .finally(() => { if (!cancelled) setViewerStatusLoading(false); });
    return () => { cancelled = true; };
  }, [proposal, viewerEmail, slugOrId, byId]);

  const onAgreementAccepted = useCallback((accepterEmail, fullName) => {
    const email = (accepterEmail || '').trim().toLowerCase();
    if (email) setViewerEmail(email);
    setViewerStatus({ allowed: true, alreadyAccepted: true, acceptance: { fullName: fullName || '', acceptedAt: new Date() } });
  }, []);

  useEffect(() => {
    const byIdQ = decodedQueryId;
    const bySlug = slug?.trim();
    if (!byIdQ && !bySlug) {
      setLoading(false);
      setError('Missing proposal (use ?id= or /view/:slug)');
      return;
    }
    let cancelled = false;
    const url = byIdQ
      ? ENDPOINTS.PUBLIC_PROPOSAL_BY_ID(byIdQ)
      : ENDPOINTS.PUBLIC_PROPOSAL(bySlug);
    get(url)
      .then(({ data }) => {
        if (!cancelled) {
          setProposal(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Proposal not found');
          setProposal(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [decodedQueryId, slug]);

  const sendCloseEvent = useCallback((eventSlug, sessionId, durationMs, sectionTimes = {}) => {
    if (analyticsCloseSentRef.current || !eventSlug || !sessionId) return;
    analyticsCloseSentRef.current = true;
    const payload = { sessionId, durationMs: durationMs || 0, sectionTimes };
    const body = JSON.stringify({ event: 'close', payload });
    const url = getEventsUrl(eventSlug);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!proposal?.slug) return;
    const eventSlug = proposal.slug;
    const stored = getStoredSession(eventSlug);
    const isSameTabSession = stored && !stored.closed;

    let sessionId;
    let openedAt;

    if (isSameTabSession) {
      sessionId = stored.sessionId;
      openedAt = stored.openedAt || Date.now();
      analyticsSessionIdRef.current = sessionId;
      analyticsOpenTimeRef.current = openedAt;
      // Do not send another open — one view per browser (tab) session
    } else {
      sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      openedAt = Date.now();
      analyticsSessionIdRef.current = sessionId;
      analyticsOpenTimeRef.current = openedAt;
      setStoredSession(eventSlug, { sessionId, openedAt });

      const visitorId = getOrCreateVisitorId();
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const device = typeof navigator !== 'undefined' && navigator.userAgentData?.mobile ? 'mobile' : 'desktop';
      (async () => {
        let identity = getSessionViewerIdentity(sessionId);
        if (!identity) {
          identity = { name: 'Anonymous', avatar: null, email: viewerEmail || null };
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
          if (token) {
            try {
              const { data } = await get(ENDPOINTS.AUTH_ME);
              identity = {
                name: data?.name || 'Anonymous',
                avatar: data?.avatar || null,
                email: data?.email || viewerEmail || null,
              };
            } catch {}
          }
          setSessionViewerIdentity(sessionId, identity);
        }
        const geo = await fetchGeoOncePerSession(sessionId);
        post(ENDPOINTS.PUBLIC_PROPOSAL_EVENTS(eventSlug), {
          event: 'open',
          payload: {
            sessionId,
            visitorId,
            device,
            browser: ua,
            name: identity?.name || 'Anonymous',
            avatar: identity?.avatar || null,
            email: identity?.email || viewerEmail || null,
            city: geo?.city || null,
            region: geo?.region || null,
            country: geo?.country || null,
            locationUnavailable: !!geo?.locationUnavailable,
          },
        }).catch(() => {});
      })();
    }

    analyticsCloseSentRef.current = false;

    const flushSectionTimer = () => {
      const activeId = activeSectionIdRef.current;
      const startedAt = activeSectionStartedAtRef.current;
      if (!activeId || !startedAt) return;
      const delta = Math.max(0, Date.now() - startedAt);
      sectionDurationsRef.current[activeId] = (sectionDurationsRef.current[activeId] || 0) + delta;
      activeSectionStartedAtRef.current = 0;
    };

    const onLeave = () => {
      const storedNow = getStoredSession(eventSlug);
      if (storedNow?.closed) return;
      const sid = analyticsSessionIdRef.current || storedNow?.sessionId;
      flushSectionTimer();
      const sectionTimes = { ...sectionDurationsRef.current };
      const sectionTotalMs = Object.values(sectionTimes).reduce((s, v) => s + (Number(v) || 0), 0);
      const start = analyticsOpenTimeRef.current ?? storedNow?.openedAt ?? Date.now();
      const durationMs = sectionTotalMs > 0 ? sectionTotalMs : Math.max(0, Date.now() - start);
      sendCloseEvent(eventSlug, sid, durationMs, sectionTimes);
      Object.entries(sectionTimes).forEach(([sectionId, spentMs]) => {
        if (!spentMs || spentMs < 250) return;
        const meta = sectionMetaRef.current?.[sectionId] || {};
        post(ENDPOINTS.PUBLIC_PROPOSAL_EVENTS(eventSlug), {
          event: 'section_view',
          payload: {
            sessionId: sid,
            sectionId,
            sectionName: meta.sectionName || sectionId,
            order: Number.isFinite(meta.order) ? meta.order : 0,
            durationMs: Math.round(spentMs),
          },
        }).catch(() => {});
      });
      if (storedNow) setStoredSession(eventSlug, { ...storedNow, closed: true });
    };

    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        sectionTrackingEnabledRef.current = false;
        flushSectionTimer();
      } else {
        sectionTrackingEnabledRef.current = true;
        if (activeSectionIdRef.current && !activeSectionStartedAtRef.current) {
          activeSectionStartedAtRef.current = Date.now();
        }
      }
    };

    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', onLeave);

    return () => {
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', onLeave);
      onLeave();
    };
  }, [proposal?.slug, sendCloseEvent, viewerEmail]);

  const handleBlockChange = (updatedBlock) => {
    setProposal((prev) => {
      if (!prev) return prev;
      const blocks = (prev.blocks || []).map((b) =>
        (b.id === updatedBlock.id ? updatedBlock : b)
      );
      return { ...prev, blocks };
    });
  };

  // Scroll-spy: track which TOC heading is currently in view
  const handleContentScroll = useCallback(() => {
    if (!contentRef.current) return;
    const scrollTop = contentRef.current.scrollTop;
    const offsets = Object.entries(blockRefs.current)
      .map(([id, el]) => ({ id, top: el ? el.offsetTop : 0 }))
      .sort((a, b) => a.top - b.top);
    let current = offsets[0]?.id || null;
    for (const { id, top } of offsets) {
      if (scrollTop >= top - 80) current = id;
    }
    setActiveId(current);
  }, []);

  const scrollToBlock = (id) => {
    const el = blockRefs.current[id];
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
    }
  };

  const blocks = Array.isArray(proposal?.blocks) ? proposal.blocks : [];
  const variables = proposal?.variables || {};
  const sortedBlocks = [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const tocItems = extractTocItems(sortedBlocks);
  const analyticsSections = useMemo(() => {
    const list = tocItems.map((item, idx) => ({
      sectionId: item.id || `section_${idx + 1}`,
      sectionName: item.text || `Section ${idx + 1}`,
      blockId: item.blockId,
      order: idx,
    }));
    if (list.length > 0) return list;
    return [{ sectionId: 'full_page', sectionName: 'Full page', blockId: null, order: 0 }];
  }, [tocItems]);

  useEffect(() => {
    sectionMetaRef.current = analyticsSections.reduce((acc, s) => {
      acc[s.sectionId] = { sectionName: s.sectionName, order: s.order };
      return acc;
    }, {});
  }, [analyticsSections]);

  useEffect(() => {
    if (!proposal?.slug) return;
    if (!analyticsSections.length) return;
    const sectionByBlock = new Map(
      analyticsSections
        .filter((s) => s.blockId)
        .map((s) => [s.blockId, s])
    );
    activeSectionIdRef.current = analyticsSections[0].sectionId;
    activeSectionStartedAtRef.current = Date.now();

    const flush = () => {
      const sid = activeSectionIdRef.current;
      const st = activeSectionStartedAtRef.current;
      if (!sid || !st) return;
      const delta = Math.max(0, Date.now() - st);
      sectionDurationsRef.current[sid] = (sectionDurationsRef.current[sid] || 0) + delta;
      activeSectionStartedAtRef.current = 0;
    };

    const activate = (nextSection) => {
      if (!nextSection || !sectionTrackingEnabledRef.current) return;
      if (activeSectionIdRef.current === nextSection.sectionId) {
        if (!activeSectionStartedAtRef.current) activeSectionStartedAtRef.current = Date.now();
        return;
      }
      flush();
      activeSectionIdRef.current = nextSection.sectionId;
      activeSectionStartedAtRef.current = Date.now();
    };

    const targets = analyticsSections
      .map((s) => ({ section: s, el: s.blockId ? blockRefs.current[s.blockId] : null }))
      .filter((x) => x.el);
    if (targets.length === 0) return () => {};

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => {
            const blockId = Object.keys(blockRefs.current).find((id) => blockRefs.current[id] === e.target);
            const section = blockId ? sectionByBlock.get(blockId) : null;
            return {
              section,
              ratio: e.intersectionRatio,
              top: e.boundingClientRect.top,
            };
          })
          .filter((x) => x.section);
        if (!visible.length) return;
        visible.sort((a, b) => {
          if (b.ratio !== a.ratio) return b.ratio - a.ratio;
          return Math.abs(a.top) - Math.abs(b.top);
        });
        activate(visible[0].section);
      },
      { root: null, threshold: [0.2, 0.5, 0.75] }
    );

    targets.forEach((t) => observer.observe(t.el));
    return () => {
      flush();
      observer.disconnect();
    };
  }, [proposal?.slug, analyticsSections]);

  if (loading) {
    return (
      <div className="public-proposal-view public-proposal-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="public-proposal-view public-proposal-error">
        <Logo size="small" />
        <Title level={4}>Proposal not found</Title>
        <p style={{ color: 'var(--color-text-secondary)' }}>{error || 'This link may be invalid or the proposal is no longer available.'}</p>
      </div>
    );
  }

  const acceptedAndLocked = !!(proposal?.agreementAccepted || viewerStatus?.alreadyAccepted);
  const viewContextValue = {
    pageCaptureRef,
    proposal,
    viewerEmail,
    viewerStatus,
    setViewerEmail,
    refetchViewerStatus,
    onAgreementAccepted,
    slugOrId,
    byId,
    acceptedAndLocked,
    openAgreementModal: () => setAgreementModalOpen(true),
  };

  const orgName = proposal.organization?.name || proposal.org?.name || '';
  const orgInitials = orgName
    ? orgName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'E';

  if (viewerEmail && viewerStatus && !viewerStatus.allowed && !viewerStatusLoading) {
    return (
      <div className="public-proposal-view public-proposal-not-allowed">
        <Logo size="small" />
        <div className="ppv-accepted-card">
          <Title level={4}>This proposal was not sent to this email</Title>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
            Only recipients who received the proposal link by email can accept the agreement.
            If you received an invite, open the link from that email.
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 12 }}>Current email: {viewerEmail}</p>
        </div>
      </div>
    );
  }

  return (
    <ProposalViewContext.Provider value={viewContextValue}>
    <div className="public-proposal-view">
      {acceptedAndLocked && (
        <div className="ppv-accepted-banner" role="status">
          <span className="ppv-accepted-banner-lock" aria-hidden><LockOutlined /></span>
          <span className="ppv-accepted-banner-check"><CheckCircleOutlined /></span>
          <span className="ppv-accepted-banner-text">Accepted and locked</span>
          <span className="ppv-accepted-banner-info" aria-label="Info"><InfoCircleOutlined /></span>
        </div>
      )}
      {/* ── Sticky Navbar ── */}
      <header className="ppv-navbar">
        <div className="ppv-navbar-left">
          <button
            type="button"
            className="ppv-hamburger"
            onClick={() => setTocOpen((v) => !v)}
            aria-label={tocOpen ? 'Close contents' : 'Open contents'}
          >
            <span className="ppv-ham-line" />
            <span className="ppv-ham-line" />
            <span className="ppv-ham-line" />
          </button>
          <Logo size="small" />
          <span className="ppv-navbar-meta">{proposal.title || 'Proposal'}</span>
        </div>
        <div className="ppv-navbar-right">
          <button type="button" className="ppv-agreement-btn" onClick={() => setAgreementModalOpen(true)}>
            View Agreement
          </button>
        </div>
      </header>

      {/* ── Body: TOC sidebar + scrollable content ── */}
      <div className="ppv-body">
        {/* TOC Sidebar — minWidth/maxWidth via inline style to reliably control open/close */}
        <aside
          className={`ppv-toc${tocOpen ? ' ppv-toc--open' : ''}`}
          aria-label="Table of contents"
          style={{
            minWidth: tocOpen ? '280px' : '0px',
            maxWidth: tocOpen ? '280px' : '0px',
            opacity: tocOpen ? 1 : 0,
          }}
        >
          <nav className="ppv-toc-nav">
            {tocItems.length === 0 ? (
              <p className="ppv-toc-empty">No headings in this proposal.</p>
            ) : (
              tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`ppv-toc-item ppv-toc-item--h${item.level}${activeId === item.id ? ' ppv-toc-item--active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToBlock(item.blockId);
                  }}
                >
                  {item.text}
                </a>
              ))
            )}
          </nav>
          {orgName && (
            <div className="ppv-toc-footer">
              <div className="ppv-toc-avatar">{orgInitials}</div>
              <div className="ppv-toc-footer-info">
                <span className="ppv-toc-footer-name">{orgName}</span>
                <span className="ppv-toc-footer-sub">Proposal sender</span>
              </div>
            </div>
          )}
        </aside>


        {/* Scrollable content area — ref used by Agreement modal for PDF (capture this + agreement) */}
        <div ref={pageCaptureRef} className="ppv-content" data-pdf-capture="page-content">
        {/* Scrollable content area */}
        {/* <main
          className="ppv-content"
          ref={contentRef}
          onScroll={handleContentScroll}
        > */}

          <div className="pub-content-container">
            {sortedBlocks.map((block, idx) => {
              const BlockComponent = BLOCK_COMPONENTS[block.type];
              if (!BlockComponent) return null;
              const isFullWidthImage = block.type === 'image' && block.content?.contained !== true;
              return (
                <div
                  key={block.id || idx}
                  className={`pub-block-section${isFullWidthImage ? ' pub-block-section--fullwidth' : ''}`}
                  ref={(el) => { if (block.id) blockRefs.current[block.id] = el; }}
                >
                  <BlockComponent
                    block={block}
                    onChange={handleBlockChange}
                    readOnly
                    variables={variables}
                  />
                </div>
              );
            })}
            {sortedBlocks.length === 0 && (
              <p style={{ color: 'var(--color-text-secondary)' }}>No content in this proposal.</p>
            )}
          </div>
          </div>
        {/* </main> */}
      </div>

      <AgreementModal
        open={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        proposal={proposal}
        slugOrId={slugOrId}
        byId={byId}
        onAgreementAccepted={onAgreementAccepted}
        acceptedAndLocked={acceptedAndLocked}
      />
    </div>
    </ProposalViewContext.Provider>
  );
}

export default PublicProposalView;
