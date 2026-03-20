/**
 * TOCSidebar — Table of Contents slide-in panel.
 * Shared by PublicProposalView and ProposalEditor.
 *
 * Props:
 *   open      boolean           — whether the sidebar is visible
 *   onClose   () => void        — called when backdrop or X is clicked
 *   items     TocItem[]         — [{ id, text, level, blockId }]
 *   activeId  string | null     — id of the currently-visible heading
 *   title     string            — document title shown at top of sidebar
 */
import { useEffect, useRef } from 'react';
import './TOCSidebar.css';

/** Smooth-scroll to the element with given id */
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const navH = 56; // sticky navbar height
  const top = el.getBoundingClientRect().top + window.scrollY - navH - 12;
  window.scrollTo({ top, behavior: 'smooth' });
}

export default function TOCSidebar({ open, onClose, items = [], activeId, title }) {
  const sidebarRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Trap focus inside sidebar when open
  useEffect(() => {
    if (open) sidebarRef.current?.focus();
  }, [open]);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`toc-backdrop${open ? ' toc-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Sidebar panel ── */}
      <aside
        ref={sidebarRef}
        className={`toc-sidebar${open ? ' toc-sidebar--open' : ''}`}
        aria-label="Table of Contents"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="toc-sidebar-header">
          <div className="toc-sidebar-header-title">
            <span className="toc-sidebar-icon">☰</span>
            <span className="toc-sidebar-label">Contents</span>
          </div>
          <button className="toc-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Document title */}
        {title && (
          <div className="toc-doc-title">{title}</div>
        )}

        {/* TOC nav */}
        <nav className="toc-nav">
          {items.length === 0 ? (
            <p className="toc-empty">No headings found.<br />Add Heading blocks to generate a table of contents.</p>
          ) : (
            items.map((item) => (
              <a
                key={item.id}
                className={`toc-item toc-item--h${item.level}${activeId === item.id ? ' toc-item--active' : ''}`}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(item.id);
                  onClose();
                }}
              >
                <span className="toc-item-dot" />
                <span className="toc-item-text">{item.text}</span>
              </a>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}

/**
 * Extract TOC items from a blocks array.
 * Reads heading-type blocks only.
 */
export function extractTocItems(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b) => b.type === 'heading' && b.content?.text?.trim())
    .map((b) => ({
      id: `toc-${b.id}`,
      text: b.content.text.trim(),
      level: Math.min(Math.max(Number(b.content.level) || 1, 1), 6),
      blockId: b.id,
    }));
}
