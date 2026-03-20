/**
 * Settings → Brand Editor — Colors, Fonts, Team Permissions.
 * Matches reference UI: collapsible sections, color picker popover, font selector.
 */
import { useState, useEffect, useRef } from 'react';
import { Button, Switch, Popover, Input, message } from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { get, put, ENDPOINTS } from '../../api';
import './SettingsBrand.css';

const PRESET_COLORS = [
  '#E53935', '#F57C00', '#FDD835', '#43A047',
  '#26C6DA', '#1E88E5', '#F48FB1',
  '#7CB342', '#42A5F5', '#7E57C2', '#EF9A9A',
  '#8E24AA',
];

const DEFAULT_COLORS = ['#03497A', '#00B4E6', '#FFFFFF', '#0D6EA8'];

const DEFAULT_FONTS = {
  title: 'Playfair Display',
  heading: 'Red Hat Display',
  body: 'Inter',
  agreements: 'Libre Baskerville',
};

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Playfair Display', 'Red Hat Display', 'Libre Baskerville',
  'Merriweather', 'Source Sans Pro', 'Nunito', 'Raleway',
  'Poppins', 'Ubuntu', 'Work Sans', 'DM Sans', 'Outfit',
];

const FONT_CATEGORIES = [
  { key: 'title', tags: ['H1'], tagDesc: 'Title' },
  { key: 'heading', tags: ['H2', 'H3', 'H4'], tagDesc: 'Subtitle, Heading, Subheading' },
  { key: 'body', tags: ['T1', 'T2', 'T3'], tagDesc: 'Body Text, Small Text & Caption' },
  { key: 'agreements', tags: [], tagDesc: 'Agreements', isAgreements: true },
];

function ColorSwatch({ color, isEditing, onClick }) {
  return (
    <button
      className={`brand-color-swatch${isEditing ? ' brand-color-swatch--active' : ''}`}
      style={{ background: color }}
      onClick={onClick}
      aria-label={`Edit color ${color}`}
    >
      {isEditing && <span className="brand-color-swatch-icon">✎</span>}
    </button>
  );
}

function ColorPickerPopover({ color, onColorChange, onUpdate, onDelete }) {
  const [hex, setHex] = useState(color);

  useEffect(() => { setHex(color); }, [color]);

  const handlePreset = (c) => { setHex(c); onColorChange(c); };
  const handleHexChange = (e) => {
    const val = e.target.value;
    setHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onColorChange(val);
  };

  return (
    <div className="brand-color-popover">
      <div className="brand-color-popover-header">
        <span className="brand-color-popover-title">Edit color</span>
        <button className="brand-color-popover-delete" onClick={onDelete}>
          <DeleteOutlined />
        </button>
      </div>
      <div className="brand-color-presets">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className={`brand-color-preset${hex === c ? ' brand-color-preset--active' : ''}`}
            style={{ background: c }}
            onClick={() => handlePreset(c)}
          />
        ))}
      </div>
      <div className="brand-color-hex-row">
        <span className="brand-color-hex-swatch" style={{ background: hex }} />
        <Input
          value={hex}
          onChange={handleHexChange}
          className="brand-color-hex-input"
          maxLength={7}
        />
      </div>
      <Button
        type="primary"
        block
        className="brand-color-update-btn"
        onClick={() => onUpdate(hex)}
      >
        Update color
      </Button>
    </div>
  );
}

function FontPickerPopover({ currentFont, onChange, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = FONT_OPTIONS.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="brand-font-picker">
      <div className="brand-font-picker-search">
        <SearchOutlined className="brand-font-picker-search-icon" />
        <input
          autoFocus
          className="brand-font-picker-input"
          placeholder="Search fonts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="brand-font-picker-list">
        {filtered.map((f) => (
          <button
            key={f}
            className={`brand-font-picker-option${f === currentFont ? ' brand-font-picker-option--active' : ''}`}
            onClick={() => { onChange(f); onClose(); }}
          >
            {f}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="brand-font-picker-empty">No fonts found</div>
        )}
      </div>
    </div>
  );
}

function FontCard({ category, currentFont, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="brand-font-card" ref={wrapRef}>
      {/* Top: tag labels */}
      <div className="brand-font-card-header">
        {category.isAgreements ? (
          <span className="brand-font-card-tag brand-font-card-tag--agreements">AG</span>
        ) : (
          category.tags.map((t) => (
            <span key={t} className="brand-font-card-tag">{t}</span>
          ))
        )}
        <span className="brand-font-card-desc">{category.tagDesc}</span>
      </div>
      {/* Bottom: font name + Change button side by side */}
      <div className="brand-font-card-row">
        <div className="brand-font-card-name" style={{ fontFamily: `'${currentFont}', serif` }}>
          {currentFont}
        </div>
        <div className="brand-font-card-change-wrap">
          <Button size="small" className="brand-font-change-btn" onClick={() => setOpen((v) => !v)}>
            Change
          </Button>
          {open && (
            <FontPickerPopover
              currentFont={currentFont}
              onChange={(f) => { onChange(f); setOpen(false); }}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsBrand() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();

  const [org, setOrg] = useState(null);
  const [colors, setColors] = useState([...DEFAULT_COLORS]);
  const [fonts, setFonts] = useState({ ...DEFAULT_FONTS });
  const [sameFont, setSameFont] = useState(false);
  const [saving, setSaving] = useState(false);

  // Section open/close state
  const [colorsOpen, setColorsOpen] = useState(true);
  const [fontsOpen, setFontsOpen] = useState(true);

  // Which color is being edited (index), and its pending value
  const [editColorIdx, setEditColorIdx] = useState(null);
  const [pendingColor, setPendingColor] = useState('');

  useEffect(() => { loadOrg(); }, []);

  const loadOrg = async () => {
    try {
      const { data } = await get(ENDPOINTS.ORG_CURRENT);
      setOrg(data);
      if (data.branding?.colors?.length) setColors(data.branding.colors);
      if (data.branding?.fonts) setFonts({ ...DEFAULT_FONTS, ...data.branding.fonts });
      if (typeof data.branding?.sameFont === 'boolean') setSameFont(data.branding.sameFont);
    } catch {
      // keep defaults on error
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await put(ENDPOINTS.ORG_CURRENT, {
        branding: { colors, fonts, sameFont },
      });
      setOrg(data);
      message.success('Brand updated successfully');
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'Only admins can update brand settings.'
        : 'Failed to update brand settings';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/${orgSlug}/settings/account`);
  };

  // Color handlers
  const openEdit = (idx) => {
    setEditColorIdx(idx);
    setPendingColor(colors[idx]);
  };
  const closeEdit = () => setEditColorIdx(null);

  const applyColorUpdate = (hex) => {
    const next = [...colors];
    next[editColorIdx] = hex;
    setColors(next);
    closeEdit();
  };

  const deleteColor = () => {
    setColors(colors.filter((_, i) => i !== editColorIdx));
    closeEdit();
  };

  const addColor = () => {
    if (colors.length < 8) setColors([...colors, '#CCCCCC']);
  };

  // Font handlers
  const changeFont = (key, font) => {
    if (sameFont) {
      setFonts({ title: font, heading: font, body: font, agreements: font });
    } else {
      setFonts((prev) => ({ ...prev, [key]: font }));
    }
  };

  const handleSameFont = (checked) => {
    setSameFont(checked);
    if (checked) {
      const f = fonts.title;
      setFonts({ title: f, heading: f, body: f, agreements: f });
    }
  };

  // Format last-updated timestamp
  const lastUpdated = org?.updatedAt
    ? new Date(org.updatedAt).toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const orgName = (org?.name || 'Elsner Technologies').toUpperCase();

  return (
    <div className="brand-editor">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="brand-editor-topbar">
        <div className="brand-editor-topbar-left">
          <span className="brand-editor-topbar-title">Brand editor</span>
          {lastUpdated && (
            <span className="brand-editor-topbar-meta">
              LAST UPDATE BY {orgName}, AT {lastUpdated.toUpperCase()}
            </span>
          )}
        </div>
        <div className="brand-editor-topbar-right">
          <Button onClick={handleCancel} className="brand-editor-btn-cancel">
            CANCEL
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={saving}
            className="brand-editor-btn-save"
          >
            UPDATE BRAND
          </Button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="brand-editor-body">

        {/* Colors section */}
        <div className="brand-editor-section">
          <button
            className="brand-editor-section-toggle"
            onClick={() => setColorsOpen((v) => !v)}
          >
            <span className={`brand-editor-caret${colorsOpen ? ' brand-editor-caret--open' : ''}`}>›</span>
            <span className="brand-editor-section-title">Colors</span>
          </button>

          {colorsOpen && (
            <div className="brand-editor-colors">
              {colors.map((color, idx) => (
                <Popover
                  key={idx}
                  open={editColorIdx === idx}
                  onOpenChange={(open) => { if (!open) closeEdit(); }}
                  placement="bottomLeft"
                  trigger="click"
                  overlayClassName="brand-color-picker-overlay"
                  content={
                    <ColorPickerPopover
                      color={pendingColor}
                      onColorChange={setPendingColor}
                      onUpdate={applyColorUpdate}
                      onDelete={deleteColor}
                    />
                  }
                >
                  <ColorSwatch
                    color={color}
                    isEditing={editColorIdx === idx}
                    onClick={() => (editColorIdx === idx ? closeEdit() : openEdit(idx))}
                  />
                </Popover>
              ))}
              {colors.length < 8 && (
                <button className="brand-color-swatch brand-color-swatch--add" onClick={addColor}>
                  <PlusOutlined />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="brand-editor-divider" />

        {/* Fonts section */}
        <div className="brand-editor-section">
          <div className="brand-editor-section-row">
            <button
              className="brand-editor-section-toggle"
              onClick={() => setFontsOpen((v) => !v)}
            >
              <span className={`brand-editor-caret${fontsOpen ? ' brand-editor-caret--open' : ''}`}>›</span>
              <span className="brand-editor-section-title">Fonts</span>
            </button>
            {fontsOpen && (
              <div className="brand-editor-fonts-controls">
                <span className="brand-editor-same-font-label">Use the same font for all text</span>
                <Switch size="small" checked={sameFont} onChange={handleSameFont} />
                <Button size="small" className="brand-editor-font-pairings-btn">
                  Show font pairings
                </Button>
              </div>
            )}
          </div>

          {fontsOpen && (
            <div className="brand-editor-fonts">
              {FONT_CATEGORIES.map((cat) => (
                <FontCard
                  key={cat.key}
                  category={cat}
                  currentFont={fonts[cat.key]}
                  onChange={(f) => changeFont(cat.key, f)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default SettingsBrand;
