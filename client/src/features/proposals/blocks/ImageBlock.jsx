/**
 * ImageBlock — interactive image block.
 * content: {
 *   url: string,
 *   alt: string,
 *   link: string,
 *   align: 'left' | 'center' | 'right',
 *   width: number (25 | 50 | 75 | 100),
 *   height: number | null,   // 25 | 50 | 75 | 100 (vh); null = auto
 *   overlayImages: [{id, url, alt, opacity, x, y, width}],  // stacked image layers
 *   overlays: [{id, text, x, y, color, fontSize, fontWeight, fontFamily}],
 *   overlay: {...}  // legacy single overlay — auto-migrated on read
 * }
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Tooltip, Modal, Input, Dropdown, message } from 'antd';
import {
  PictureOutlined, DeleteOutlined, SwapOutlined,
  FontSizeOutlined, ColumnWidthOutlined, UploadOutlined,
  LoadingOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
  CheckOutlined, PlusOutlined,
} from '@ant-design/icons';
import { useImageStore } from '../imageStore';

/* ── constants ───────────────────────────────────────────────────────────── */
const WIDTHS = [25, 50, 75, 100];
const HEIGHTS = [25, 50, 75, 100]; // vh units
const ALIGNS = ['left', 'center', 'right'];
const FONT_SIZES = [12, 14, 18, 24, 32, 42, 56];

/* ── content migration ───────────────────────────────────────────────────── */
function migrateContent(raw) {
  if (!raw) return { url: '', alt: '', link: '', align: 'left', width: 100, height: null, overlays: [], overlayImages: [] };
  let overlays = Array.isArray(raw.overlays) ? raw.overlays : [];
  // Migrate legacy single overlay object
  if (overlays.length === 0 && raw.overlay?.enabled) {
    overlays = [{
      id: 'ov-legacy',
      text: raw.overlay.text || '',
      x: raw.overlay.x ?? 50,
      y: raw.overlay.y ?? 50,
      color: raw.overlay.color || '#ffffff',
      fontSize: raw.overlay.fontSize || 24,
      fontWeight: raw.overlay.fontWeight || 'bold',
      fontFamily: 'Default',
    }];
  }
  // Accept only valid vh preset values; discard old px numbers
  const height = HEIGHTS.includes(raw.height) ? raw.height : null;
  return {
    url: raw.url || '',
    alt: raw.alt || '',
    link: raw.link || '',
    align: raw.align || 'left',
    width: raw.width || 100,
    height,
    overlays,
    overlayImages: Array.isArray(raw.overlayImages)
      ? raw.overlayImages.map((oi) => ({
          x: 50, y: 50, width: 50,
          ...oi,
        }))
      : [],
  };
}

function newOverlay() {
  return {
    id: `ov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    text: '',
    x: 50,
    y: 50,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Default',
  };
}

/* ── overlay text CSS ────────────────────────────────────────────────────── */
function overlayStyle(ov, selected) {
  return {
    position: 'absolute',
    left: `${ov.x}%`,
    top: `${ov.y}%`,
    transform: 'translate(-50%, -50%)',
    color: ov.color || '#fff',
    fontSize: ov.fontSize || 24,
    fontWeight: ov.fontWeight || 'bold',
    fontFamily: ov.fontFamily && ov.fontFamily !== 'Default' ? ov.fontFamily : 'inherit',
    lineHeight: 1.2,
    textShadow: '0 1px 4px rgba(0,0,0,0.55)',
    userSelect: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxWidth: '80%',
    textAlign: 'center',
    zIndex: 5,
    pointerEvents: 'auto',
    cursor: 'move',
    padding: '2px 6px',
    borderRadius: 3,
    outline: selected ? '1.5px dashed rgba(255,255,255,0.75)' : 'none',
  };
}

/* ── Read-only render ─────────────────────────────────────────────────────── */
function ReadOnlyImage({ block }) {
  const { url, alt, link, align, width = 100, height, overlays, overlayImages } = migrateContent(block.content);
  const alignStyle = align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0';

  const inner = (
    <div style={{ position: 'relative', width: `${width}%`, margin: alignStyle, height: height ? `${height}vh` : undefined }}>
      {url ? (
        <img
          src={url}
          alt={alt}
          style={{
            width: '100%',
            height: height ? '100%' : undefined,
            objectFit: height ? 'cover' : undefined,
            borderRadius: 6,
            display: 'block',
          }}
        />
      ) : (
        <div style={{ height: 160, background: '#f5f5f5', borderRadius: 6, border: '2px dashed #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PictureOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
        </div>
      )}
      {overlayImages.map((oi) => (
        <div
          key={oi.id}
          style={{
            position: 'absolute',
            left: `${oi.x ?? 50}%`,
            top: `${oi.y ?? 50}%`,
            transform: 'translate(-50%, -50%)',
            width: `${oi.width ?? 50}%`,
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          <img src={oi.url} alt={oi.alt} style={{ width: '100%', opacity: oi.opacity ?? 1, display: 'block' }} />
        </div>
      ))}
      {overlays.map((ov) => (
        <div key={ov.id} style={overlayStyle(ov, false)}>{ov.text}</div>
      ))}
    </div>
  );

  if (!url || !link) return inner;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
      {inner}
    </a>
  );
}

/* ── Placeholder ──────────────────────────────────────────────────────────── */
function PlaceholderBox({ onUpload, onLibrary, onUrl }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 180, background: '#f8f9fc',
        borderRadius: 8, border: '2px dashed #d9d9d9', padding: '28px 24px', gap: 12,
      }}
    >
      <PictureOutlined style={{ fontSize: 36, color: '#bfbfbf' }} />
      <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 500 }}>Add an image</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onUpload}
          style={{
            padding: '7px 16px', background: '#1677ff', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <UploadOutlined /> Upload
        </button>
        <button
          onClick={onLibrary}
          style={{
            padding: '7px 16px', background: '#fff', color: '#1677ff',
            border: '1.5px solid #1677ff', borderRadius: 6, cursor: 'pointer',
            fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <PictureOutlined /> From Library
        </button>
        <button
          onClick={onUrl}
          style={{
            padding: '7px 16px', background: '#fff', color: '#595959',
            border: '1.5px solid #d9d9d9', borderRadius: 6, cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
          }}
        >
          From URL
        </button>
      </div>
    </div>
  );
}

/* ── EditableOverlayText ──────────────────────────────────────────────────── */
// Separated component so it mounts fresh when entering edit mode — no white-screen flash.
function EditableOverlayText({ text, onSave }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.focus();
    // Select all so user can type over existing text immediately
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={{ outline: 'none', minWidth: 20, cursor: 'text', userSelect: 'text' }}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.currentTarget.blur(); } e.stopPropagation(); }}
      onBlur={(e) => onSave(e.currentTarget.innerText)}
    >
      {text}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function ImageBlock({ block, onChange, readOnly, isActive }) {
  const c = migrateContent(block.content);
  const { url, alt, align, width, height, overlays, overlayImages } = c;

  const [hovering, setHovering] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceTab, setReplaceTab] = useState('upload');
  const [tempUrl, setTempUrl] = useState('');
  const [editingOverlayId, setEditingOverlayId] = useState(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [selectedOIId, setSelectedOIId] = useState(null); // selected overlay image

  const blockRef = useRef(block);
  useEffect(() => { blockRef.current = block; }, [block]);

  // Fetch library images whenever the modal opens
  useEffect(() => {
    if (replaceOpen) fetchImages();
  }, [replaceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerRef = useRef(null);
  const toolbarRef = useRef(null);
  const fileInputRef = useRef(null);
  const overlayImgFileRef = useRef(null);
  const dragState = useRef(null);
  const resizeState = useRef(null);
  const textResizeState = useRef(null);

  const { uploading, uploadImage, images, loading: imagesLoading, fetchImages } = useImageStore();

  /* ── patch helpers ── */
  const patch = useCallback((p) => {
    const b = blockRef.current;
    onChange({ ...b, content: { ...migrateContent(b.content), ...p } });
  }, [onChange]);

  const patchOverlay = useCallback((id, updates) => {
    const newOverlays = overlays.map((ov) => ov.id === id ? { ...ov, ...updates } : ov);
    patch({ overlays: newOverlays });
  }, [overlays, patch]);

  const patchOverlayImg = useCallback((id, updates) => {
    const newOIs = overlayImages.map((oi) => oi.id === id ? { ...oi, ...updates } : oi);
    patch({ overlayImages: newOIs });
  }, [overlayImages, patch]);

  /* ── file uploads ── */
  const handleFileUpload = useCallback(async (file) => {
    const img = await uploadImage(file);
    if (img) {
      patch({ url: img.url, alt: img.originalName });
      setReplaceOpen(false);
      message.success('Image updated');
    } else {
      message.error('Upload failed');
    }
  }, [uploadImage, patch]);

  const handleOverlayImageUpload = useCallback(async (file) => {
    const img = await uploadImage(file);
    if (img) {
      const newOI = {
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        url: img.url,
        alt: img.originalName,
        opacity: 0.85,
        x: 50,
        y: 50,
        width: 50,
      };
      patch({ overlayImages: [...overlayImages, newOI] });
      setSelectedOIId(newOI.id);
      message.success('Image layer added');
    }
  }, [uploadImage, overlayImages, patch]);

  /* ── overlay image drag ── */
  const startOIDrag = useCallback((e, oi) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectedOIId(oi.id);
    dragState.current = { clientX: e.clientX, clientY: e.clientY, x: oi.x ?? 50, y: oi.y ?? 50, rect };

    const onMove = (me) => {
      const dx = ((me.clientX - dragState.current.clientX) / dragState.current.rect.width) * 100;
      const dy = ((me.clientY - dragState.current.clientY) / dragState.current.rect.height) * 100;
      patchOverlayImg(oi.id, {
        x: Math.max(0, Math.min(100, dragState.current.x + dx)),
        y: Math.max(0, Math.min(100, dragState.current.y + dy)),
      });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [patchOverlayImg]);

  /* ── overlay image corner resize ── */
  const startOIResize = useCallback((e, oi) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    resizeState.current = { clientX: e.clientX, width: oi.width ?? 50, rect };
    const onMove = (me) => {
      if (!resizeState.current) return;
      const dx = ((me.clientX - resizeState.current.clientX) / resizeState.current.rect.width) * 100;
      patchOverlayImg(oi.id, { width: Math.max(10, Math.min(100, resizeState.current.width + dx)) });
    };
    const onUp = () => {
      resizeState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [patchOverlayImg]);

  const startOverlayTextResize = useCallback((e, ov) => {
    e.stopPropagation();
    e.preventDefault();
    textResizeState.current = { clientX: e.clientX, clientY: e.clientY, fontSize: ov.fontSize || 24 };
    const onMove = (me) => {
      if (!textResizeState.current) return;
      const dx = me.clientX - textResizeState.current.clientX;
      const dy = me.clientY - textResizeState.current.clientY;
      const delta = (dx - dy) * 0.3; // SE drag = bigger
      const newSize = Math.max(8, Math.min(120, textResizeState.current.fontSize + delta));
      patchOverlay(ov.id, { fontSize: Math.round(newSize) });
    };
    const onUp = () => {
      textResizeState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [patchOverlay]);

  const handleUrlReplace = useCallback(() => {
    if (tempUrl.trim()) {
      patch({ url: tempUrl.trim() });
      setTempUrl('');
      setReplaceOpen(false);
    }
  }, [tempUrl, patch]);

  /* ── overlay drag ── */
  const startOverlayDrag = useCallback((e, ov) => {
    if (editingOverlayId === ov.id) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelectedOverlayId(ov.id);
    dragState.current = { clientX: e.clientX, clientY: e.clientY, x: ov.x, y: ov.y, rect };

    const onMove = (me) => {
      const dx = ((me.clientX - dragState.current.clientX) / dragState.current.rect.width) * 100;
      const dy = ((me.clientY - dragState.current.clientY) / dragState.current.rect.height) * 100;
      patchOverlay(ov.id, {
        x: Math.max(2, Math.min(98, dragState.current.x + dx)),
        y: Math.max(2, Math.min(98, dragState.current.y + dy)),
      });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [editingOverlayId, patchOverlay]);

  /* ── deselect on outside click ── */
  useEffect(() => {
    if (!selectedOverlayId && !editingOverlayId && !selectedOIId) return;
    const handler = (e) => {
      // Don't deselect if clicking inside the container OR inside the toolbar
      if (
        !containerRef.current?.contains(e.target) &&
        !toolbarRef.current?.contains(e.target)
      ) {
        setSelectedOverlayId(null);
        setEditingOverlayId(null);
        setSelectedOIId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedOverlayId, editingOverlayId, selectedOIId]);

  if (readOnly) return <ReadOnlyImage block={block} />;

  const alignStyle = align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0';
  const showToolbar = (hovering || isActive || colorPickerOpen) && url;
  const selectedOverlay = overlays.find((ov) => ov.id === selectedOverlayId);
  const selectedOI = overlayImages.find((oi) => oi.id === selectedOIId);

  /* ── dropdown items ── */
  const widthItems = WIDTHS.map((w) => ({
    key: String(w),
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {width === w && <CheckOutlined style={{ fontSize: 11, color: '#1677ff' }} />}
        <span style={{ width: 16 }} />{w}%
      </span>
    ),
  }));

  const heightItems = [
    { key: 'auto', label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{!height && <CheckOutlined style={{ fontSize: 11, color: '#1677ff' }} />}<span style={{ width: 16 }} />Auto</span> },
    ...HEIGHTS.map((h) => ({
      key: String(h),
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {height === h && <CheckOutlined style={{ fontSize: 11, color: '#1677ff' }} />}
          <span style={{ width: 16 }} />{h}%
        </span>
      ),
    })),
  ];

  const oiWidthItems = WIDTHS.map((w) => ({
    key: String(w),
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {selectedOI?.width === w && <CheckOutlined style={{ fontSize: 11, color: '#1677ff' }} />}
        <span style={{ width: 16 }} />{w}%
      </span>
    ),
  }));

  const posItems = ALIGNS.map((a) => ({
    key: a,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {align === a && <CheckOutlined style={{ fontSize: 11, color: '#1677ff' }} />}
        <span style={{ width: 16 }} />{a.charAt(0).toUpperCase() + a.slice(1)}
      </span>
    ),
  }));

  const AlignIcon = align === 'center' ? AlignCenterOutlined : align === 'right' ? AlignRightOutlined : AlignLeftOutlined;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* ── Image container ── */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: `${width}%`,
          margin: alignStyle,
          borderRadius: 6,
          overflow: 'hidden',
          height: height ? `${height}vh` : undefined,
        }}
        onClick={(e) => {
          // Deselect overlay if click is on the image bg, not on an overlay
          const clickedOverlay = overlays.some((ov) => {
            const el = document.querySelector(`[data-overlay-id="${ov.id}"]`);
            return el?.contains(e.target);
          });
          if (!clickedOverlay) {
            setSelectedOverlayId(null);
            setEditingOverlayId(null);
          }
        }}
      >
        {url ? (
          <img
            src={url}
            alt={alt}
            style={{
              width: '100%',
              height: height ? '100%' : undefined,
              objectFit: height ? 'cover' : 'contain',
              display: 'block',
              borderRadius: 6,
            }}
            draggable={false}
          />
        ) : (
          <PlaceholderBox
            onUpload={() => { setReplaceTab('upload'); setReplaceOpen(true); }}
            onLibrary={() => { setReplaceTab('library'); setReplaceOpen(true); }}
            onUrl={() => { setReplaceTab('url'); setReplaceOpen(true); }}
          />
        )}

        {/* ── Additional image layers (draggable, positioned) ── */}
        {overlayImages.map((oi) => {
          const isOISelected = selectedOIId === oi.id;
          return (
            <div
              key={oi.id}
              style={{
                position: 'absolute',
                left: `${oi.x ?? 50}%`,
                top: `${oi.y ?? 50}%`,
                transform: 'translate(-50%, -50%)',
                width: `${oi.width ?? 50}%`,
                zIndex: 3,
                cursor: 'move',
                outline: 'none',
                background: 'transparent',
              }}
              onMouseDown={(e) => startOIDrag(e, oi)}
              onClick={(e) => { e.stopPropagation(); setSelectedOIId(oi.id); }}
            >
              <img
                src={oi.url}
                alt={oi.alt}
                style={{ width: '100%', opacity: oi.opacity ?? 1, display: 'block', pointerEvents: 'none' }}
                draggable={false}
              />
              {/* Corner resize handles — visible only when selected */}
              {isOISelected && [
                { key: 'nw', top: -4, left: -4, cursor: 'nwse-resize' },
                { key: 'ne', top: -4, right: -4, cursor: 'nesw-resize' },
                { key: 'sw', bottom: -4, left: -4, cursor: 'nesw-resize' },
                { key: 'se', bottom: -4, right: -4, cursor: 'nwse-resize' },
              ].map(({ key, cursor, ...pos }) => (
                <div
                  key={key}
                  style={{
                    position: 'absolute',
                    width: 8, height: 8,
                    background: '#fff',
                    border: '1.5px solid #1677ff',
                    borderRadius: 2,
                    zIndex: 10,
                    cursor,
                    ...pos,
                  }}
                  onMouseDown={(e) => startOIResize(e, oi)}
                />
              ))}
            </div>
          );
        })}

        {/* ── Text overlays ── */}
        {overlays.map((ov) => {
          const isEditing = editingOverlayId === ov.id;
          const isSelected = selectedOverlayId === ov.id;
          return (
            <div
              key={ov.id}
              data-overlay-id={ov.id}
              style={overlayStyle(ov, isSelected)}
              onMouseDown={(e) => startOverlayDrag(e, ov)}
              onClick={(e) => { e.stopPropagation(); setSelectedOverlayId(ov.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); setEditingOverlayId(ov.id); setSelectedOverlayId(ov.id); }}
            >
              {isEditing ? (
                <EditableOverlayText
                  text={ov.text}
                  onSave={(newText) => {
                    patchOverlay(ov.id, { text: newText });
                    setEditingOverlayId(null);
                  }}
                />
              ) : (
                <span style={{ pointerEvents: 'none', opacity: ov.text ? 1 : 0.5 }}>
                  {ov.text || (isSelected ? 'Double-click to type' : '')}
                </span>
              )}
              {/* SE corner resize handle — visible only when selected and not editing */}
              {isSelected && !isEditing && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -5,
                    right: -5,
                    width: 10,
                    height: 10,
                    background: '#fff',
                    border: '1.5px solid #1677ff',
                    borderRadius: 2,
                    cursor: 'nwse-resize',
                    zIndex: 20,
                  }}
                  onMouseDown={(e) => startOverlayTextResize(e, ov)}
                />
              )}
            </div>
          );
        })}

      </div>

      {/* ── Floating toolbar ── */}
      {showToolbar && (
        <div ref={toolbarRef} className="image-block-toolbar">
          {/* Replace */}
          <Tooltip title="Replace image">
            <button
              className="img-tb-btn"
              onClick={(e) => { e.stopPropagation(); setReplaceTab('upload'); setTempUrl(url); setReplaceOpen(true); }}
            >
              <SwapOutlined />
            </button>
          </Tooltip>

          {/* Add image layer */}
          <Tooltip title="Add image layer (draggable)">
            <button
              className="img-tb-btn"
              onClick={(e) => { e.stopPropagation(); overlayImgFileRef.current?.click(); }}
            >
              <PlusOutlined />
            </button>
          </Tooltip>
          <input
            ref={overlayImgFileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOverlayImageUpload(f); e.target.value = ''; }}
          />

          <div className="img-tb-sep" />

          {/* Width */}
          <Dropdown
            menu={{ items: widthItems, onClick: ({ key }) => patch({ width: Number(key) }) }}
            trigger={['click']}
            placement="bottom"
          >
            <Tooltip title={`Width: ${width}%`}>
              <button className="img-tb-btn img-tb-btn-label" onClick={(e) => e.stopPropagation()}>
                <ColumnWidthOutlined />
                <span style={{ fontSize: 10, marginLeft: 3 }}>{width}%</span>
              </button>
            </Tooltip>
          </Dropdown>

          {/* Height % dropdown */}
          <Dropdown
            menu={{
              items: heightItems,
              onClick: ({ key }) => patch({ height: key === 'auto' ? null : Number(key) }),
            }}
            trigger={['click']}
            placement="bottom"
          >
            <Tooltip title={`Height: ${height ? `${height}%` : 'Auto'}`}>
              <button className="img-tb-btn img-tb-btn-label" onClick={(e) => e.stopPropagation()}>
                <span style={{ fontSize: 10 }}>H:{height ? `${height}%` : 'Auto'}</span>
              </button>
            </Tooltip>
          </Dropdown>

          {/* Align */}
          <Dropdown
            menu={{ items: posItems, onClick: ({ key }) => patch({ align: key }) }}
            trigger={['click']}
            placement="bottom"
          >
            <Tooltip title={`Align: ${align}`}>
              <button className="img-tb-btn" onClick={(e) => e.stopPropagation()}>
                <AlignIcon />
              </button>
            </Tooltip>
          </Dropdown>

          <div className="img-tb-sep" />

          {/* Add text overlay */}
          <Tooltip title="Add text overlay">
            <button
              className="img-tb-btn img-tb-btn-label"
              onClick={(e) => {
                e.stopPropagation();
                const ov = newOverlay();
                patch({ overlays: [...overlays, ov] });
                setSelectedOverlayId(ov.id);
                setEditingOverlayId(ov.id); // auto-enter edit mode so user types directly
              }}
            >
              <FontSizeOutlined />
              <span style={{ fontSize: 10, marginLeft: 3 }}>+Text</span>
            </button>
          </Tooltip>

          {/* Selected overlay controls */}
          {selectedOverlay && (
            <>
              <div className="img-tb-sep" />

              {/* Color */}
              <Tooltip title="Text color">
                <label
                  className="img-tb-btn img-tb-color-btn"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={() => setColorPickerOpen(true)}
                >
                  <input
                    type="color"
                    value={selectedOverlay.color || '#ffffff'}
                    onChange={(e) => patchOverlay(selectedOverlay.id, { color: e.target.value })}
                    onBlur={() => setColorPickerOpen(false)}
                    style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
                  />
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: selectedOverlay.color || '#fff', border: '1.5px solid rgba(255,255,255,0.5)', display: 'inline-block' }} />
                </label>
              </Tooltip>

              {/* Font size cycle */}
              <Tooltip title={`Size: ${selectedOverlay.fontSize || 24}px`}>
                <button
                  className="img-tb-btn img-tb-btn-label"
                  onClick={(e) => {
                    e.stopPropagation();
                    const cur = selectedOverlay.fontSize || 24;
                    const idx = FONT_SIZES.indexOf(cur);
                    patchOverlay(selectedOverlay.id, { fontSize: FONT_SIZES[(idx + 1) % FONT_SIZES.length] });
                  }}
                >
                  <span style={{ fontSize: 10 }}>{selectedOverlay.fontSize || 24}px</span>
                </button>
              </Tooltip>

              {/* Bold */}
              <Tooltip title={selectedOverlay.fontWeight === 'bold' ? 'Normal' : 'Bold'}>
                <button
                  className={`img-tb-btn${selectedOverlay.fontWeight === 'bold' ? ' img-tb-btn-active' : ''}`}
                  style={{ fontWeight: 700, fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    patchOverlay(selectedOverlay.id, { fontWeight: selectedOverlay.fontWeight === 'bold' ? 'normal' : 'bold' });
                  }}
                >
                  B
                </button>
              </Tooltip>

              <div className="img-tb-sep" />

              {/* Horizontal position */}
              {[['←', 20, 'Left'], ['↔', 50, 'Center H'], ['→', 80, 'Right']].map(([sym, xVal, title]) => (
                <Tooltip key={title} title={title}>
                  <button
                    className={`img-tb-btn${Math.round(selectedOverlay.x) === xVal ? ' img-tb-btn-active' : ''}`}
                    style={{ fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); patchOverlay(selectedOverlay.id, { x: xVal }); }}
                  >
                    {sym}
                  </button>
                </Tooltip>
              ))}

              {/* Vertical position */}
              {[['↑', 20, 'Top'], ['⇕', 50, 'Middle'], ['↓', 80, 'Bottom']].map(([sym, yVal, title]) => (
                <Tooltip key={title} title={title}>
                  <button
                    className={`img-tb-btn${Math.round(selectedOverlay.y) === yVal ? ' img-tb-btn-active' : ''}`}
                    style={{ fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); patchOverlay(selectedOverlay.id, { y: yVal }); }}
                  >
                    {sym}
                  </button>
                </Tooltip>
              ))}

              {/* Delete this overlay */}
              <Tooltip title="Remove text">
                <button
                  className="img-tb-btn img-tb-btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idToRemove = selectedOverlay.id;
                    setSelectedOverlayId(null);
                    patch({ overlays: overlays.filter((ov) => ov.id !== idToRemove) });
                  }}
                >
                  <DeleteOutlined />
                </button>
              </Tooltip>
            </>
          )}

          {/* Selected overlay image controls */}
          {selectedOI && !selectedOverlay && (
            <>
              <div className="img-tb-sep" />
              <Dropdown
                menu={{
                  items: oiWidthItems,
                  onClick: ({ key }) => patchOverlayImg(selectedOI.id, { width: Number(key) }),
                }}
                trigger={['click']}
                placement="bottom"
              >
                <Tooltip title={`Image layer size: ${selectedOI.width ?? 50}%`}>
                  <button className="img-tb-btn img-tb-btn-label" onClick={(e) => e.stopPropagation()}>
                    <ColumnWidthOutlined />
                    <span style={{ fontSize: 10, marginLeft: 3 }}>{selectedOI.width ?? 50}%</span>
                  </button>
                </Tooltip>
              </Dropdown>
              <Tooltip title="Remove image layer">
                <button
                  className="img-tb-btn img-tb-btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idToRemove = selectedOI.id;
                    setSelectedOIId(null);
                    patch({ overlayImages: overlayImages.filter((x) => x.id !== idToRemove) });
                  }}
                >
                  <DeleteOutlined />
                </button>
              </Tooltip>
            </>
          )}

          {!selectedOverlay && !selectedOI && <div className="img-tb-sep" />}

          {/* Delete image */}
          <Tooltip title="Remove image">
            <button
              className="img-tb-btn img-tb-btn-danger"
              onClick={(e) => {
                e.stopPropagation();
                patch({ url: '', overlayImages: [], overlays: [] });
                setSelectedOverlayId(null);
                setSelectedOIId(null);
              }}
            >
              <DeleteOutlined />
            </button>
          </Tooltip>
        </div>
      )}

      {/* ── Replace / Set image modal ── */}
      <Modal
        title="Set image"
        open={replaceOpen}
        onCancel={() => setReplaceOpen(false)}
        footer={null}
        width={460}
        destroyOnHidden
      >
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
          {[['upload', 'Upload file'], ['url', 'Paste URL'], ['library', 'My Images']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setReplaceTab(k)}
              style={{
                flex: 1, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: replaceTab === k ? '2px solid #1677ff' : '2px solid transparent',
                color: replaceTab === k ? '#1677ff' : '#666',
                fontWeight: replaceTab === k ? 600 : 400,
                fontSize: 13, transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {replaceTab === 'upload' && (
          <div
            style={{
              border: '2px dashed #d9d9d9', borderRadius: 8, padding: '32px 16px',
              textAlign: 'center', cursor: 'pointer', background: '#fafafa',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f?.type.startsWith('image/')) handleFileUpload(f);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
            />
            {uploading ? (
              <>
                <LoadingOutlined style={{ fontSize: 28, color: '#1677ff' }} />
                <div style={{ marginTop: 8, color: '#666' }}>Uploading…</div>
              </>
            ) : (
              <>
                <UploadOutlined style={{ fontSize: 28, color: '#bfbfbf' }} />
                <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>Click or drag image here</div>
                <div style={{ marginTop: 4, color: '#bbb', fontSize: 11 }}>PNG, JPG, GIF, WebP · max 10 MB</div>
              </>
            )}
          </div>
        )}

        {replaceTab === 'url' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              onPressEnter={handleUrlReplace}
              autoFocus
              allowClear
            />
            <button
              onClick={handleUrlReplace}
              disabled={!tempUrl.trim()}
              style={{
                padding: '4px 16px', background: '#1677ff', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500,
                opacity: tempUrl.trim() ? 1 : 0.5,
              }}
            >
              Apply
            </button>
          </div>
        )}

        {replaceTab === 'library' && (
          imagesLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#8c8c8c' }}>
              <LoadingOutlined style={{ fontSize: 28, color: '#1677ff' }} />
              <div style={{ marginTop: 8 }}>Loading images…</div>
            </div>
          ) : images.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#8c8c8c', fontSize: 13 }}>
              <PictureOutlined style={{ fontSize: 32, color: '#d9d9d9', display: 'block', marginBottom: 8 }} />
              No images uploaded yet. Use the Upload tab to add images.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                maxHeight: 320,
                overflowY: 'auto',
                padding: '4px 2px',
              }}
            >
              {images.map((img) => (
                <div
                  key={img._id}
                  title={img.originalName}
                  onClick={() => {
                    patch({ url: img.url, alt: img.originalName || '' });
                    setReplaceOpen(false);
                    message.success('Image updated');
                  }}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: url === img.url ? '2px solid #1677ff' : '2px solid transparent',
                    background: '#f5f5f5',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { if (url !== img.url) e.currentTarget.style.borderColor = '#91caff'; }}
                  onMouseLeave={(e) => { if (url !== img.url) e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <img
                    src={img.url}
                    alt={img.originalName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
