/**
 * TextBlock — Rich text editor block.
 *
 * Storage: block.content.html  (new rich HTML)
 *          block.content.text  (legacy plain text — read-only fallback)
 *
 * Features:
 *   - contentEditable editor (no external lib)
 *   - Paste: preserves full HTML structure (headings, tables, lists, emojis)
 *   - Publish view: identical HTML rendered via dangerouslySetInnerHTML
 *   - Variable substitution {{Var}} in read-only mode
 *   - Placeholder when empty
 *   - Backward-compatible with legacy plain-text blocks
 */
import { useRef, useLayoutEffect, useCallback } from 'react';
import './TextBlock.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the HTML content from a block (supports legacy plain-text blocks) */
function getBlockHtml(block) {
  if (block.content?.html) return block.content.html;

  // Legacy: convert plain text → paragraphs
  const text = block.content?.text || '';
  if (!text.trim()) return '';
  return text
    .split('\n')
    .map(line => `<p>${escHtml(line) || '<br>'}</p>`)
    .join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Replace {{Variable}} tokens with their resolved values. In read-only, missing vars render as empty so PDF doesn't show raw placeholders. */
function applyVars(html, variables, missingInReadOnly = false) {
  if (!html || !variables) return html || '';
  return html.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    const val = variables[k.trim()];
    if (val !== undefined && val !== null && val !== '') return val;
    return missingInReadOnly ? '' : `{{${k}}}`;
  });
}

/**
 * Sanitize clipboard HTML:
 *   - Keep structural/semantic tags (headings, tables, lists, inline)
 *   - Strip scripts, event handlers, iframes
 *   - Keep safe CSS properties (color, text-align, font-size, bg, etc.)
 *   - Preserve colspan / rowspan on table cells
 */
function sanitizePaste(html) {
  const ALLOWED_TAGS = new Set([
    'h1','h2','h3','h4','h5','h6',
    'p','div','span',
    'ul','ol','li',
    'table','thead','tbody','tfoot','tr','th','td',
    'strong','b','em','i','u','s','del','ins','mark','sub','sup',
    'a','br','hr','blockquote','pre','code',
    'figure','figcaption','img',
  ]);

  const SAFE_STYLE = [
    'color','background-color','background',
    'text-align','font-weight','font-size','font-style',
    'text-decoration','font-family','line-height',
    'padding','padding-top','padding-bottom','padding-left','padding-right',
    'margin','margin-top','margin-bottom','margin-left','margin-right',
    'border','border-radius',
    'width','max-width','vertical-align','display',
  ];

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  function clean(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) return; // text node — keep as-is
      if (child.nodeType !== 1) { child.remove(); return; }

      const tag = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: keep children, drop the tag itself
        const frag = document.createDocumentFragment();
        Array.from(child.childNodes).forEach(c => frag.appendChild(c.cloneNode(true)));
        child.replaceWith(frag);
        return;
      }

      // Strip unsafe attributes
      const safe = new Set(['style', 'href', 'src', 'alt', 'colspan', 'rowspan']);
      Array.from(child.attributes).forEach(attr => {
        if (!safe.has(attr.name)) { child.removeAttribute(attr.name); return; }
        if (attr.name === 'style') {
          // Keep only whitelisted CSS props
          const filtered = SAFE_STYLE
            .map(prop => {
              const val = child.style.getPropertyValue(prop);
              return val ? `${prop}:${val}` : null;
            })
            .filter(Boolean)
            .join(';');
          if (filtered) child.setAttribute('style', filtered);
          else child.removeAttribute('style');
        }
      });

      clean(child);
    });
  }

  clean(tmp);
  return tmp.innerHTML;
}

/** Convert plain text → paragraphs (fallback for text/plain paste) */
function plainToHtml(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => `<p>${escHtml(line) || '<br>'}</p>`)
    .join('');
}

// ─── Component ────────────────────────────────────────────────────────────────
function TextBlock({ block, onChange, readOnly, variables, textColor }) {
  const editorRef   = useRef(null);
  const blockIdRef  = useRef(null);  // tracks which block is currently loaded

  // Set editor innerHTML only when the block identity changes
  // (not on every re-render — that would destroy cursor position)
  useLayoutEffect(() => {
    if (!editorRef.current) return;
    if (blockIdRef.current === block.id) return;   // same block → leave DOM alone
    blockIdRef.current = block.id;
    editorRef.current.innerHTML = getBlockHtml(block);
    updatePlaceholder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  // Toggle the CSS placeholder class based on visual emptiness
  const updatePlaceholder = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const empty = el.innerText.trim() === '';
    el.classList.toggle('tb-editor--empty', empty);
  }, []);

  // Persist HTML back to block state (called on blur)
  const save = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const inner = el.innerHTML;
    const isEmpty = el.innerText.trim() === '';
    onChange({
      ...block,
      content: {
        ...block.content,
        html:  isEmpty ? '' : inner,
        text:  el.innerText,   // keep for legacy compatibility
      },
    });
  }, [block, onChange]);

  // Paste handler — preserve full HTML structure
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const html  = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    const clean = html ? sanitizePaste(html) : plainToHtml(plain);
    document.execCommand('insertHTML', false, clean);
    updatePlaceholder();
    setTimeout(save, 0);   // save after DOM settles
  }, [save, updatePlaceholder]);

  // ── Read-only / published view ────────────────────────────────────────────
  if (readOnly) {
    const html = applyVars(getBlockHtml(block), variables, true);
    if (!html) return null;
    return (
      <div
        className="tb-view"
        style={textColor ? { color: textColor } : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className="tb-editor tb-editor--empty"
      data-placeholder="Write your own content or paste content"
      style={textColor ? { color: textColor } : undefined}
      onInput={updatePlaceholder}
      onBlur={save}
      onPaste={handlePaste}
    />
  );
}

export default TextBlock;
