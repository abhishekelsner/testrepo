/**
 * ProposalEditor — full block-based proposal editor.
 * Route: /proposals/:id/edit   (for proposals)
 * Route: /templates/:id/edit   (for templates — same editor, different save target)
 *
 * Features:
 * - Load proposal/template blocks from API
 * - Add / reorder (drag) / delete blocks
 * - Per-block section background (color / image / video)
 * - Image toolbar (link, crop, frame, align, alt, swap, delete)
 * - Three-dot block menu: save to saved blocks, etc.
 * - Variable editor panel (sidebar)
 * - Preview mode: variables replaced, read-only blocks
 * - Auto-save (debounced 1200ms) + manual save button
 * - Publish proposal (templates don't have publish)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Layout, Typography, Button, Input, Spin, message, Tooltip,
  Drawer, Tag, Space, Divider, Modal, Dropdown, Popover, Select,
} from 'antd';
import {
  SaveOutlined, EyeOutlined, EditOutlined, ArrowLeftOutlined,
  UpOutlined, DownOutlined, DeleteOutlined, SendOutlined,
  MenuOutlined, HolderOutlined, CopyOutlined,
  ShareAltOutlined, UserOutlined, PlusOutlined, CheckOutlined,
  EllipsisOutlined, BgColorsOutlined, BookOutlined,
} from '@ant-design/icons';

import { get, put, post, del } from '../../api/service';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import Logo from '../../components/Logo';
import BlockMenu, { createBlock } from './BlockMenu';
import VariablePanel from './VariablePanel';
import EditorLibrary, { DRAG_TYPE_BLOCK_PRESET, DRAG_TYPE_SNIPPET } from './EditorLibrary';
import FloatingBlockPalette from './FloatingBlockPalette';
import { BLOCK_PRESETS, SNIPPETS } from './editorPresets';
import TOCSidebar, { extractTocItems } from './TOCSidebar';
import { decodeUrlOpaque, encodeUrlOpaque } from '../../utils/urlQueryOpaque';
import './ProposalEditor.css';

// Block Components
import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import ImageBlock from './blocks/ImageBlock';
import VideoBlock from './blocks/VideoBlock';
import PricingTableBlock from './blocks/PricingTableBlock';
import ButtonBlock from './blocks/ButtonBlock';
import DividerBlock from './blocks/DividerBlock';
import ColumnsBlock from './blocks/ColumnsBlock';
import HtmlBlock from './blocks/HtmlBlock';
import FormBlock from './blocks/FormBlock';
import CalendarBlock from './blocks/CalendarBlock';
import RoiCalculatorBlock from './blocks/RoiCalculatorBlock';
import AgreementBlock from './blocks/AgreementBlock';

const { Header, Content, Sider } = Layout;

/** Map block type → component */
const BLOCK_COMPONENTS = {
  text: TextBlock,
  heading: HeadingBlock,
  image: ImageBlock,
  video: VideoBlock,
  pricing: PricingTableBlock,
  button: ButtonBlock,
  divider: DividerBlock,
  columns: ColumnsBlock,
  html: HtmlBlock,
  form: FormBlock,
  calendar: CalendarBlock,
  roi: RoiCalculatorBlock,
  agreement: AgreementBlock,
  table: PricingTableBlock,
};

/** Pretty label for block type badge */
const BLOCK_TYPE_LABELS = {
  text: 'Text', heading: 'Heading', image: 'Image', video: 'Video',
  pricing: 'Pricing', button: 'Button', divider: 'Divider',
  columns: 'Columns', html: 'HTML', form: 'Form',
  calendar: 'Calendar', roi: 'ROI Calc', agreement: 'Agreement',
  table: 'Table',
};

// ─── Section Background Panel ─────────────────────────────────────────────────

const BG_COLOR_PRESETS = [
  '#0a1628', '#1a3a6c', '#0d4a38', '#2d2d2d',
  '#ffffff', '#f5f5f5', '#e8f4fd', '#fef9e7',
  '#f0f9f0', '#fce4ec', '#f3e5f5', '#e8eaf6',
];

const TEXT_COLOR_PRESETS = [
  '#000000', '#ffffff', '#1a3a6c', '#0d4a38',
  '#c0392b', '#e67e22', '#8e44ad', '#2980b9',
  '#616161', '#bdbdbd', '#f3e5f5', '#e8f4fd',
];

const STATUS_OPTIONS = [
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'published', label: 'Published' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
];

function SectionBgPanel({ background, onChange, onDelete, onClone }) {
  const [tab, setTab] = useState(background?.type || 'color');
  const color = background?.color || '#ffffff';
  const imageUrl = background?.imageUrl || '';
  const videoUrl = background?.videoUrl || '';
  const textColor = background?.textColor || '';

  const patchBg = (patch) => onChange({ ...(background || {}), ...patch });

  return (
    <div className="section-bg-panel" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {['Color', 'Image', 'Video', 'Text'].map((t) => (
          <button
            key={t}
            className={`section-bg-tab ${tab === t.toLowerCase() ? 'active' : ''}`}
            onClick={() => setTab(t.toLowerCase())}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'color' && (
        <div>
          <div className="section-bg-swatches">
            {BG_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                className={`swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c, border: c === '#ffffff' ? '1px solid #e0e0e0' : 'none' }}
                onClick={() => patchBg({ type: 'color', color: c })}
                title={c}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              type="color"
              value={color}
              onChange={(e) => patchBg({ type: 'color', color: e.target.value })}
              style={{ width: 32, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 2 }}
            />
            <Input
              value={color}
              onChange={(e) => patchBg({ type: 'color', color: e.target.value })}
              size="small"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              maxLength={7}
            />
          </div>
        </div>
      )}

      {tab === 'image' && (
        <div>
          <Input
            value={imageUrl}
            onChange={(e) => patchBg({ type: 'image', imageUrl: e.target.value })}
            placeholder="Image URL (https://...)"
            size="small"
            allowClear
          />
          {imageUrl && (
            <div
              style={{
                marginTop: 8,
                height: 60,
                borderRadius: 4,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid #e8e8e8',
              }}
            />
          )}
        </div>
      )}

      {tab === 'video' && (
        <div>
          <Input
            value={videoUrl}
            onChange={(e) => patchBg({ type: 'video', videoUrl: e.target.value })}
            placeholder="Video URL (https://...)"
            size="small"
            allowClear
          />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 6 }}>
            Supports MP4, WebM, or embed URLs
          </div>
        </div>
      )}

      {tab === 'text' && (
        <div>
          <div className="section-bg-swatches">
            {TEXT_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                className={`swatch ${textColor === c ? 'selected' : ''}`}
                style={{ background: c, border: c === '#ffffff' || c === '#f3e5f5' || c === '#e8f4fd' ? '1px solid #e0e0e0' : 'none' }}
                onClick={() => patchBg({ textColor: c })}
                title={c}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              type="color"
              value={textColor || '#000000'}
              onChange={(e) => patchBg({ textColor: e.target.value })}
              style={{ width: 32, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 2 }}
            />
            <Input
              value={textColor}
              onChange={(e) => patchBg({ textColor: e.target.value })}
              placeholder="#000000"
              size="small"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              maxLength={7}
            />
            {textColor && (
              <button
                onClick={() => patchBg({ textColor: '' })}
                style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      <Divider style={{ margin: '12px 0 8px' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <Button size="small" icon={<CopyOutlined />} onClick={onClone} style={{ flex: 1 }}>
          Clone
        </Button>
        <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete} style={{ flex: 1 }}>
          Delete
        </Button>
      </div>
    </div>
  );
}

// ─── Saved Blocks localStorage → DB migration key ─────────────────────────────
const SAVED_BLOCKS_LEGACY_KEY = 'editor_saved_blocks';

// ─── Main Component ───────────────────────────────────────────────────────────

function ProposalEditor({ mode = 'proposal' }) {
  const { orgSlug, id: routeId } = useParams();
  const id = useMemo(() => decodeUrlOpaque(routeId || ''), [routeId]);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isTemplate = mode === 'template';
  const backUrl = isTemplate ? `/${orgSlug}/templates` : `/${orgSlug}/dashboard`;

  // ─── State ─────────────────────────────────────────────────────────────
  const [doc, setDoc] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [variables, setVariables] = useState({});
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [varDrawerOpen, setVarDrawerOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragOverCanvas, setDragOverCanvas] = useState(false);
  const [paletteOpenAt, setPaletteOpenAt] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [templateLinkModalOpen, setTemplateLinkModalOpen] = useState(false);
  const [bgPopoverBlock, setBgPopoverBlock] = useState(null); // blockId with open bg panel
  const [savedBlocks, setSavedBlocks] = useState([]);
  const [saveBlockModalOpen, setSaveBlockModalOpen] = useState(false);
  const [saveBlockDraft, setSaveBlockDraft] = useState(null); // { block }
  const [saveBlockName, setSaveBlockName] = useState('');
  const [previewSavedBlock, setPreviewSavedBlock] = useState(null);
  const [editorTocOpen, setEditorTocOpen] = useState(false);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [collabSelection, setCollabSelection] = useState([]);
  const [collabSaving, setCollabSaving] = useState(false);

  const debounceRef = useRef(null);
  const isDirtyRef = useRef(false);
  const canvasRef = useRef(null);
  const paletteWrapRef = useRef(null);

  const canEdit = ['Owner', 'Admin', 'Creator'].includes(user?.role);

  useEffect(() => {
    if (paletteOpenAt == null) return;
    const onMouseDown = (e) => {
      if (paletteWrapRef.current && !paletteWrapRef.current.contains(e.target)) setPaletteOpenAt(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [paletteOpenAt]);

  // ─── Load ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!id) {
        setLoading(false);
        message.error('Invalid link');
        navigate(backUrl);
        return;
      }
      setLoading(true);
      try {
        const endpoint = isTemplate
          ? ENDPOINTS.TEMPLATE_BY_ID(id)
          : ENDPOINTS.PROPOSAL_BY_ID(id);
        const { data } = await get(endpoint);
        setDoc(data);
        setTitle(data.name || data.title || '');
        setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
        setVariables(data.variables || {});
      } catch (err) {
        message.error(err.response?.data?.error || 'Failed to load');
        navigate(backUrl);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isTemplate, backUrl, navigate]);

  useEffect(() => {
    if (!id || isTemplate) return;
    let cancelled = false;
    async function loadCollaborators() {
      try {
        const { data } = await get(ENDPOINTS.PROPOSAL_COLLABORATORS(id));
        if (!cancelled) setCollaborators(Array.isArray(data?.collaborators) ? data.collaborators : []);
      } catch {
        if (!cancelled) setCollaborators([]);
      }
    }
    loadCollaborators();
    return () => {
      cancelled = true;
    };
  }, [id, isTemplate]);

  useEffect(() => {
    if (isTemplate) return;
    let cancelled = false;
    async function loadTeamMembers() {
      try {
        const { data } = await get(ENDPOINTS.TEAM_MEMBERS);
        if (!cancelled) setTeamMembers(Array.isArray(data?.data) ? data.data : []);
      } catch {
        if (!cancelled) setTeamMembers([]);
      }
    }
    loadTeamMembers();
    return () => {
      cancelled = true;
    };
  }, [isTemplate]);

  // ─── Auto-save (debounced 1200ms) ──────────────────────────────────────
  const saveToApi = useCallback(
    async (newBlocks, newVariables, newTitle) => {
      if (!isDirtyRef.current) return;
      setSaving(true);
      try {
        const endpoint = isTemplate
          ? ENDPOINTS.TEMPLATE_BY_ID(id)
          : ENDPOINTS.PROPOSAL_BY_ID(id);
        const payload = isTemplate
          ? { name: newTitle, blocks: newBlocks, variables: newVariables }
          : { title: newTitle, blocks: newBlocks, variables: newVariables };
        await put(endpoint, payload);
        isDirtyRef.current = false;
      } catch {
        // Silent fail on auto-save; user can manually save
      } finally {
        setSaving(false);
      }
    },
    [id, isTemplate]
  );

  function scheduleSave(newBlocks, newVariables, newTitle) {
    isDirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToApi(newBlocks, newVariables, newTitle);
    }, 1200);
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // ─── Saved blocks: fetch from DB + one-time localStorage migration ──────
  useEffect(() => {
    if (!user?.id) return;
    async function fetchSavedBlocks() {
      try {
        // One-time migration: move any localStorage items into the DB
        const legacyRaw = localStorage.getItem(SAVED_BLOCKS_LEGACY_KEY);
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw);
            if (Array.isArray(legacy) && legacy.length > 0) {
              await Promise.allSettled(
                legacy.map((s) => {
                  // support both old nested format {block:{...}} and flat format
                  const blockData = s.block || s;
                  return post(ENDPOINTS.SAVED_BLOCKS, {
                    name: s.name || `${s.type || 'block'} block`,
                    type: s.type || blockData.type,
                    content: blockData.content || {},
                    background: blockData.background || null,
                  });
                })
              );
            }
          } catch { /* skip migration errors */ }
          localStorage.removeItem(SAVED_BLOCKS_LEGACY_KEY);
        }
        // Fetch from DB
        const { data } = await get(ENDPOINTS.SAVED_BLOCKS);
        setSavedBlocks(Array.isArray(data) ? data : []);
      } catch {
        setSavedBlocks([]);
      }
    }
    fetchSavedBlocks();
  }, [user?.id]);

  // ─── Manual save ───────────────────────────────────────────────────────
  async function handleManualSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    isDirtyRef.current = true;
    await saveToApi(blocks, variables, title);
    message.success('Saved');
    if (isTemplate) setTemplateLinkModalOpen(true);
  }

  // ─── Blocks mutation helpers ────────────────────────────────────────────
  function updateBlock(updatedBlock) {
    const newBlocks = blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
    setBlocks(newBlocks);
    scheduleSave(newBlocks, variables, title);
  }

  function addBlock(newBlock) {
    const ordered = { ...newBlock, order: blocks.length };
    const newBlocks = [...blocks, ordered];
    setBlocks(newBlocks);
    setActiveBlockId(ordered.id);
    scheduleSave(newBlocks, variables, title);
  }

  function insertBlocksAt(index, newBlocksArr) {
    const withOrder = newBlocksArr.map((b, i) => ({ ...b, order: index + i }));
    const newBlocks = [...blocks.slice(0, index), ...withOrder, ...blocks.slice(index)];
    const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(reordered);
    if (withOrder.length > 0) setActiveBlockId(withOrder[0].id);
    scheduleSave(reordered, variables, title);
  }

  function moveBlockToIndex(blockId, toIndex) {
    const fromIdx = blocks.findIndex((b) => b.id === blockId);
    if (fromIdx === -1) return;
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    const insertIdx = toIndex > fromIdx ? toIndex - 1 : toIndex;
    const block = blocks[fromIdx];
    newBlocks.splice(insertIdx, 0, block);
    const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(reordered);
    scheduleSave(reordered, variables, title);
  }

  const DRAG_TYPE_CANVAS_BLOCK = 'application/x-editor-block-id';

  function handleDropAt(dropIndex, e) {
    e.preventDefault();
    e.stopPropagation();
    let presetId = e.dataTransfer.getData(DRAG_TYPE_BLOCK_PRESET);
    let snippetId = e.dataTransfer.getData(DRAG_TYPE_SNIPPET);
    let blockId = e.dataTransfer.getData(DRAG_TYPE_CANVAS_BLOCK);
    const plain = e.dataTransfer.getData('text/plain') || '';
    if (!presetId && !snippetId && !blockId) {
      if (plain.startsWith('editor:preset:')) presetId = plain.replace('editor:preset:', '');
      else if (plain.startsWith('editor:snippet:')) snippetId = plain.replace('editor:snippet:', '');
      else if (plain.startsWith('editor:block:')) blockId = plain.replace('editor:block:', '');
    }
    if (presetId) {
      const preset = BLOCK_PRESETS.find((p) => p.id === presetId);
      if (preset) insertBlocksAt(dropIndex, [preset.create()]);
    } else if (snippetId) {
      const snippet = SNIPPETS.find((s) => s.id === snippetId);
      if (snippet) insertBlocksAt(dropIndex, snippet.createBlocks());
    } else if (blockId) {
      moveBlockToIndex(blockId, dropIndex);
    }
  }

  function deleteBlock(blockId) {
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    setBlocks(newBlocks);
    if (activeBlockId === blockId) setActiveBlockId(null);
    scheduleSave(newBlocks, variables, title);
  }

  function duplicateBlock(blockId) {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const block = blocks[idx];
    const newBlock = {
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: block.content && typeof block.content === 'object' ? { ...block.content } : block.content,
      order: idx + 1,
    };
    const newBlocks = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)];
    const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(reordered);
    setActiveBlockId(newBlock.id);
    scheduleSave(reordered, variables, title);
  }

  function moveBlock(blockId, direction) {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
    setBlocks(reordered);
    scheduleSave(reordered, variables, title);
  }

  // ─── Section background ─────────────────────────────────────────────────
  function updateBlockBackground(blockId, bg) {
    const newBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, background: bg } : b
    );
    setBlocks(newBlocks);
    scheduleSave(newBlocks, variables, title);
  }

  // ─── Saved blocks ───────────────────────────────────────────────────────
  function saveBlockToLibrary(block) {
    const defaultName = `${BLOCK_TYPE_LABELS[block.type] || block.type} block`;
    setSaveBlockDraft({ block });
    setSaveBlockName(defaultName);
    setSaveBlockModalOpen(true);
  }

  async function confirmSaveBlock() {
    if (!saveBlockDraft) return;
    const name = saveBlockName.trim() ||
      `${BLOCK_TYPE_LABELS[saveBlockDraft.block.type] || saveBlockDraft.block.type} block`;
    try {
      const { data } = await post(ENDPOINTS.SAVED_BLOCKS, {
        name,
        type: saveBlockDraft.block.type,
        content: saveBlockDraft.block.content || {},
        background: saveBlockDraft.block.background || null,
      });
      setSavedBlocks((prev) => [data, ...prev]);
      message.success('Block saved to library');
    } catch {
      message.error('Failed to save block');
    }
    setSaveBlockModalOpen(false);
    setSaveBlockDraft(null);
    setSaveBlockName('');
  }

  async function deleteSavedBlock(id) {
    try {
      await del(ENDPOINTS.SAVED_BLOCK_BY_ID(id));
      setSavedBlocks((prev) => prev.filter((s) => s.id !== id));
      message.success('Removed from saved blocks');
    } catch {
      message.error('Failed to remove block');
    }
  }

  // ─── Variables / title ──────────────────────────────────────────────────
  function handleVariableChange(newVars) {
    setVariables(newVars);
    scheduleSave(blocks, newVars, title);
  }

  function handleTitleChange(newTitle) {
    setTitle(newTitle);
    scheduleSave(blocks, variables, newTitle);
  }

  // ─── Publish ────────────────────────────────────────────────────────────
  async function handlePublish() {
    if (isDirtyRef.current) await saveToApi(blocks, variables, title);
    try {
      const { data } = await post(ENDPOINTS.PROPOSAL_PUBLISH(id));
      setDoc(data);
      message.success(`Published! Slug: ${data.slug}`);
      setShareEmail('');
      setShareMessage('');
      setShareModalOpen(true);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to publish');
    }
  }

  async function handleStatusChange(nextStatus) {
    if (isTemplate || !id || !nextStatus) return;
    if (doc?.status === nextStatus) return;
    if (isDirtyRef.current) await saveToApi(blocks, variables, title);
    try {
      const { data } = await put(ENDPOINTS.PROPOSAL_BY_ID(id), { status: nextStatus });
      setDoc((prev) => ({ ...(prev || {}), ...data, status: data.status, slug: data.slug || prev?.slug }));
      message.success(`Status changed to ${String(nextStatus).toUpperCase()}`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to change status');
    }
  }

  // ─── Share ──────────────────────────────────────────────────────────────
  function getPreviewUrl() {
    if (!doc?.slug) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/view/${doc.slug}`;
  }

  async function handleCopyPreviewUrl() {
    const url = getPreviewUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied to clipboard');
    } catch {
      message.error('Could not copy link');
    }
  }

  function handleShareClick() {
    if (isTemplate) {
      message.info('Templates are not shared publicly. Create a proposal from this template and publish it to share.');
      return;
    }
    if (doc?.status === 'published' && doc?.slug) {
      setShareEmail('');
      setShareMessage('');
      setShareModalOpen(true);
    } else {
      message.info('Publish the proposal first to get a shareable link.', 4);
    }
  }

  async function saveCollaborators() {
    if (!id || isTemplate) return;
    const desired = Array.from(new Set(collabSelection.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)));
    const existing = Array.from(new Set(collaborators.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)));
    const toAdd = desired.filter((e) => !existing.includes(e));
    const toRemove = existing.filter((e) => !desired.includes(e));
    if (!toAdd.length && !toRemove.length) {
      setCollabModalOpen(false);
      return;
    }
    setCollabSaving(true);
    try {
      for (const email of toAdd) {
        await post(ENDPOINTS.PROPOSAL_COLLABORATORS(id), { email });
      }
      for (const email of toRemove) {
        await del(ENDPOINTS.PROPOSAL_COLLABORATORS(id), { data: { email } });
      }
      setCollaborators(desired);
      message.success('Collaborator access updated');
      setCollabModalOpen(false);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to update collaborators');
    } finally {
      setCollabSaving(false);
    }
  }

  function openCollaborateModal() {
    setCollabSelection([...collaborators]);
    setCollabModalOpen(true);
  }

  function getTemplateLink() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/${orgSlug}/templates/${encodeUrlOpaque(id)}/edit`;
  }

  async function handleCopyTemplateLink() {
    try {
      await navigator.clipboard.writeText(getTemplateLink());
      message.success('Template link copied');
    } catch {
      message.error('Could not copy link');
    }
  }

  function doSendProposalEmail(email) {
    setShareSending(true);
    post(ENDPOINTS.PROPOSAL_SEND_EMAIL(id), { to: email, message: shareMessage.trim() || undefined })
      .then(async () => {
        message.success('Email sent');
        const { data } = await get(ENDPOINTS.PROPOSAL_BY_ID(id));
        setDoc(data);
        setShareEmail('');
      })
      .catch((err) => {
        message.error(err.response?.data?.error || 'Failed to send email');
      })
      .finally(() => setShareSending(false));
  }

  async function handleSendProposalEmail() {
    const email = shareEmail.trim().toLowerCase();
    if (!email) { message.warning('Please enter an email address'); return; }
    const alreadySent = doc?.sentTo?.find((e) => (e.email || '').toLowerCase() === email);
    if (alreadySent) {
      const sentDate = alreadySent.sentAt ? new Date(alreadySent.sentAt).toLocaleDateString() : 'previously';
      Modal.confirm({
        title: 'Send again?',
        content: `You already sent this proposal to ${email} on ${sentDate}. Do you want to send it again?`,
        okText: 'Yes, send again',
        cancelText: 'Cancel',
        onOk: () => doSendProposalEmail(email),
      });
    } else {
      doSendProposalEmail(email);
    }
  }

  // ─── Block background helpers ───────────────────────────────────────────
  function getBlockBgStyle(block) {
    const bg = block.background;
    const textColorStyle = bg?.textColor ? { color: bg.textColor } : {};
    if (!bg || bg.type === 'none') return textColorStyle;
    if (bg.type === 'color') return { backgroundColor: bg.color, ...textColorStyle };
    if (bg.type === 'image' && bg.imageUrl) {
      return {
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...textColorStyle,
      };
    }
    return textColorStyle;
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-page-fallback">
        <Spin size="large" />
      </div>
    );
  }

  const isPublished = doc?.status === 'published';
  const currentStatus = String(doc?.status || 'draft').toLowerCase();
  const currentStatusLabel = STATUS_OPTIONS.find((s) => s.key === currentStatus)?.label || 'Draft';

  return (
    <div className="proposal-editor">
      <Layout style={{ minHeight: '100vh' }}>
        <Header className="editor-header">
          <div className="editor-header-left">
            <Link to={backUrl} style={{ color: '#595959', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeftOutlined /> {isTemplate ? 'Templates' : 'Proposals'}
            </Link>
            <Logo size="small" />
            <div className="editor-header-title-wrap">
              <Input
                className="editor-header-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                disabled={!canEdit || previewMode}
                placeholder="Untitled"
              />
              {canEdit && !previewMode && <EditOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
            </div>
            <button type="button" className="editor-header-create-faster" onClick={() => message.info('Convert document — coming soon')}>
              ↑ Create faster: convert a document
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="editor-header-draft">
              <span className="editor-header-draft-dot" /> {currentStatusLabel}
            </span>
            {!isTemplate && canEdit && (
              <Dropdown
                trigger={['click']}
                menu={{
                  selectedKeys: [currentStatus],
                  items: STATUS_OPTIONS.map((s) => ({
                    key: s.key,
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {currentStatus === s.key ? <CheckOutlined /> : <span style={{ width: 14 }} />}
                        {s.label}
                      </span>
                    ),
                    onClick: () => handleStatusChange(s.key),
                  })),
                }}
              >
                <Button size="small">{currentStatusLabel}</Button>
              </Dropdown>
            )}
            {!isTemplate && (
              <Button type="text" size="small" icon={<UserOutlined />} onClick={openCollaborateModal}>
                Collaborate
              </Button>
            )}
            <Button type="primary" className="editor-header-share" icon={<ShareAltOutlined />} onClick={handleShareClick}>Share</Button>
            <Space size={4} className="editor-header-actions">
              <Tooltip title={previewMode ? 'Edit' : 'Preview'}>
                <Button type="text" size="small" icon={previewMode ? <EditOutlined /> : <EyeOutlined />} onClick={() => setPreviewMode((v) => !v)} />
              </Tooltip>
              {canEdit && (
                <Button type="text" size="small" icon={<SaveOutlined />} onClick={handleManualSave} loading={saving}>Save</Button>
              )}
              {!isTemplate && canEdit && (
                <Button type="primary" size="small" icon={<SendOutlined />} onClick={handlePublish} disabled={isPublished}>
                  {isPublished ? 'Published' : 'Publish'}
                </Button>
              )}
              <Tooltip title="Table of Contents">
                <Button type="text" size="small" icon={<BookOutlined />} onClick={() => setEditorTocOpen(true)} />
              </Tooltip>
              <Tooltip title="Variables">
                <Button type="text" size="small" icon={<MenuOutlined />} onClick={() => setVarDrawerOpen(true)} />
              </Tooltip>
            </Space>
            <span style={{ fontSize: 13, color: '#595959' }}>{user?.name}</span>
            <Button type="link" size="small" onClick={() => logout()} style={{ fontSize: 12 }}>Logout</Button>
          </div>
        </Header>

        {/* ── Body: Library sidebar + Canvas ── */}
        <Layout style={{ minHeight: 'calc(100vh - 56px)' }}>
          {canEdit && !previewMode && (
            <Sider width={320} className="editor-sidebar">
              <EditorLibrary
                savedBlocks={savedBlocks}
                onDeleteSavedBlock={deleteSavedBlock}
                onAddPreset={(id) => {
                  const preset = BLOCK_PRESETS.find((p) => p.id === id);
                  if (preset) {
                    insertBlocksAt(blocks.length, [preset.create()]);
                    message.success(`${preset.name} added`);
                  }
                }}
                onAddSnippet={(id) => {
                  const snippet = SNIPPETS.find((s) => s.id === id);
                  if (snippet) {
                    insertBlocksAt(blocks.length, snippet.createBlocks());
                    message.success(`${snippet.name} added`);
                  }
                }}
                onAddSavedBlock={(saved) => {
                  // saved is now a flat DB record: { id, name, type, content, background, savedAt }
                  const newBlock = {
                    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    type: saved.type,
                    content: saved.content || {},
                    background: saved.background || null,
                    order: blocks.length,
                  };
                  insertBlocksAt(blocks.length, [newBlock]);
                  message.success(`${saved.name} added`);
                }}
                onAddImage={(image) => {
                  const newBlock = {
                    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    type: 'image',
                    order: blocks.length,
                    content: { url: image.url, alt: image.originalName, contained: false },
                  };
                  insertBlocksAt(blocks.length, [newBlock]);
                  message.success('Image added');
                }}
                onPreviewSavedBlock={(saved) => {
                  // open a modal to preview the block
                  setPreviewSavedBlock(saved);
                }}
                onEditSavedBlock={async (saved, newName) => {
                  try {
                    const { data } = await put(ENDPOINTS.SAVED_BLOCK_BY_ID(saved.id), { name: newName });
                    setSavedBlocks((prev) => prev.map((s) => s.id === saved.id ? data : s));
                  } catch {
                    message.error('Failed to rename block');
                  }
                }}
              />
            </Sider>
          )}
          <Content className="editor-canvas-wrap" style={{ padding: 0, overflow: 'auto' }}>
            <div
              ref={canvasRef}
              className="editor-canvas"
              style={{
                minHeight: canEdit && !previewMode ? 'calc(100vh - 180px)' : undefined,
                position: 'relative',
              }}
              onDragOver={(e) => {
                if (!canEdit || previewMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setDragOverCanvas(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCanvas(false);
              }}
              onDrop={(e) => {
                if (!canEdit || previewMode) return;
                const rect = canvasRef.current?.getBoundingClientRect();
                const dropY = e.clientY;
                const topZoneHeight = 100;
                const insertAtTop = rect && dropY < rect.top + topZoneHeight;
                handleDropAt(insertAtTop ? 0 : blocks.length, e);
                setDragOverCanvas(false);
              }}
            >
              {/* Full-canvas drop hint */}
              {canEdit && !previewMode && dragOverCanvas && (
                <div
                  style={{
                    position: 'absolute', inset: 0, zIndex: 5,
                    borderRadius: 12, border: '2px dashed var(--primary-color)',
                    background: 'rgba(22, 119, 255, 0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary-color)', fontSize: 15, fontWeight: 500,
                    pointerEvents: 'none',
                  }}
                >
                  Drop anywhere to add
                </div>
              )}

              {/* Published badge */}
              {!isTemplate && isPublished && (
                <div style={{ marginBottom: 12, textAlign: 'center' }}>
                  <Tag color="green">Published — slug: {doc.slug}</Tag>
                </div>
              )}

              {/* Drop zone at top */}
              {canEdit && !previewMode && (
                <DropZone
                  index={0}
                  dragOverIndex={dragOverIndex}
                  setDragOverIndex={setDragOverIndex}
                  setDragOverCanvas={setDragOverCanvas}
                  handleDropAt={handleDropAt}
                  label="Drop here for top"
                  minHeight={48}
                />
              )}

              {/* Empty state */}
              {blocks.length === 0 && !previewMode && (
                <div ref={paletteWrapRef} style={{ position: 'relative' }}>
                  <div className="editor-placeholder">Start typing</div>
                  <div className="editor-type-slash">+ Type / to add content</div>
                  <div style={{ position: 'relative' }}>
                    <div className="editor-add-content-trigger" onClick={() => setPaletteOpenAt(0)}>
                      <span className="plus-circle"><PlusOutlined /></span>
                      <span>Add content</span>
                    </div>
                    <FloatingBlockPalette
                      visible={paletteOpenAt === 0}
                      onInsert={(block) => { addBlock(block); setPaletteOpenAt(null); }}
                      onClose={() => setPaletteOpenAt(null)}
                    />
                  </div>
                </div>
              )}

              {blocks.map((block, idx) => {
                const BlockComponent = BLOCK_COMPONENTS[block.type];
                if (!BlockComponent) return null;

                const isActive = activeBlockId === block.id;
                const dropIndex = idx;
                const bgStyle = getBlockBgStyle(block);
                const hasBg = block.background && block.background.type !== 'none';

                // Build three-dot dropdown menu items
                const moreMenuItems = [
                  {
                    key: 'save',
                    icon: <BookOutlined />,
                    label: 'Save to saved blocks',
                    onClick: () => saveBlockToLibrary(block),
                  },
                  {
                    key: 'duplicate',
                    icon: <CopyOutlined />,
                    label: 'Duplicate section',
                    onClick: () => duplicateBlock(block.id),
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: 'Delete section',
                    danger: true,
                    onClick: () => deleteBlock(block.id),
                  },
                ];

                return (
                  <div key={block.id}>
                    {/* Drop zone above block */}
                    {canEdit && !previewMode && (
                      <DropZone
                        index={dropIndex}
                        dragOverIndex={dragOverIndex}
                        setDragOverIndex={setDragOverIndex}
                        setDragOverCanvas={setDragOverCanvas}
                        handleDropAt={handleDropAt}
                        label="Release to drop block"
                        minHeight={16}
                      />
                    )}

                    {/* Video background wrapper */}
                    {block.background?.type === 'video' && block.background?.videoUrl ? (
                      <div
                        className={`editor-block-card ${isActive && !previewMode ? 'active' : ''} ${hasBg ? 'has-bg' : ''}`}
                        style={{ position: 'relative', overflow: 'hidden', ...(block.background?.textColor ? { color: block.background.textColor } : {}) }}
                        onClick={() => !previewMode && setActiveBlockId(block.id)}
                      >
                        <video
                          autoPlay muted loop playsInline
                          src={block.background.videoUrl}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                        />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          {renderBlockInner()}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`editor-block-card ${isActive && !previewMode ? 'active' : ''} ${hasBg ? 'has-bg' : ''}`}
                        style={bgStyle}
                        onClick={() => !previewMode && setActiveBlockId(block.id)}
                      >
                        {!previewMode && canEdit && (
                          <div className="editor-block-toolbar">
                            {/* Left: drag + type tag */}
                            <div className="editor-block-toolbar-left">
                              <Tooltip title="Drag to reorder">
                                <span
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData(DRAG_TYPE_CANVAS_BLOCK, block.id);
                                    e.dataTransfer.setData('text/plain', 'editor:block:' + block.id);
                                    e.dataTransfer.effectAllowed = 'all';
                                    e.stopPropagation();
                                  }}
                                  className="drag-handle"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <HolderOutlined />
                                </span>
                              </Tooltip>
                              <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                                {BLOCK_TYPE_LABELS[block.type] || block.type}
                              </Tag>
                            </div>

                            {/* Right: section controls */}
                            <div className="editor-block-toolbar-right">
                              {/* Three-dot menu */}
                              <Dropdown
                                menu={{ items: moreMenuItems }}
                                trigger={['click']}
                                placement="bottomRight"
                              >
                                <Tooltip title="More options">
                                  <Button
                                    type="text" size="small"
                                    icon={<EllipsisOutlined />}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Tooltip>
                              </Dropdown>

                              {/* Background button */}
                              <Popover
                                open={bgPopoverBlock === block.id}
                                onOpenChange={(open) => setBgPopoverBlock(open ? block.id : null)}
                                trigger="click"
                                placement="bottomRight"
                                content={
                                  <SectionBgPanel
                                    background={block.background}
                                    onChange={(bg) => updateBlockBackground(block.id, bg)}
                                    onDelete={() => { deleteBlock(block.id); setBgPopoverBlock(null); }}
                                    onClone={() => { duplicateBlock(block.id); setBgPopoverBlock(null); }}
                                  />
                                }
                                overlayClassName="section-bg-popover"
                              >
                                <Tooltip title="Section background">
                                  <Button
                                    type="text" size="small"
                                    icon={<BgColorsOutlined />}
                                    onClick={(e) => e.stopPropagation()}
                                    style={hasBg ? { color: 'var(--editor-accent)' } : {}}
                                  />
                                </Tooltip>
                              </Popover>

                              {/* Move up / down */}
                              <Tooltip title="Move up">
                                <Button type="text" size="small" icon={<UpOutlined />}
                                  disabled={idx === 0}
                                  onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                                />
                              </Tooltip>
                              <Tooltip title="Move down">
                                <Button type="text" size="small" icon={<DownOutlined />}
                                  disabled={idx === blocks.length - 1}
                                  onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                                />
                              </Tooltip>

                              {/* Duplicate */}
                              <Tooltip title="Duplicate">
                                <Button type="text" size="small" icon={<CopyOutlined />}
                                  onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                                />
                              </Tooltip>

                              {/* Delete */}
                              <Tooltip title="Delete">
                                <Button type="text" size="small" danger icon={<DeleteOutlined />}
                                  onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                />
                              </Tooltip>
                            </div>
                          </div>
                        )}

                        {/* Block content — full-width image blocks bypass the 1000px container */}
                        <div className="editor-block-content">
                          {block.type === 'image' && !block.content?.contained ? (
                            <BlockComponent
                              block={block}
                              onChange={canEdit && !previewMode ? updateBlock : () => {}}
                              readOnly={previewMode || !canEdit}
                              variables={variables}
                              isActive={isActive}
                              textColor={block.background?.textColor || ''}
                            />
                          ) : (
                            <div className="editor-content-container">
                              <BlockComponent
                                block={block}
                                onChange={canEdit && !previewMode ? updateBlock : () => {}}
                                readOnly={previewMode || !canEdit}
                                variables={variables}
                                isActive={isActive}
                                textColor={block.background?.textColor || ''}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );

                function renderBlockInner() {
                  return (
                    <>
                      {!previewMode && canEdit && (
                        <div className="editor-block-toolbar">
                          <div className="editor-block-toolbar-left">
                            <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                              {BLOCK_TYPE_LABELS[block.type] || block.type}
                            </Tag>
                          </div>
                          <div className="editor-block-toolbar-right">
                            <Tooltip title="Move up">
                              <Button type="text" size="small" icon={<UpOutlined />}
                                disabled={idx === 0}
                                onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                              />
                            </Tooltip>
                            <Tooltip title="Duplicate">
                              <Button type="text" size="small" icon={<CopyOutlined />}
                                onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                              />
                            </Tooltip>
                            <Tooltip title="Delete">
                              <Button type="text" size="small" danger icon={<DeleteOutlined />}
                                onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                              />
                            </Tooltip>
                          </div>
                        </div>
                      )}
                      <div className="editor-block-content">
                        {block.type === 'image' && !block.content?.contained ? (
                          <BlockComponent
                            block={block}
                            onChange={canEdit && !previewMode ? updateBlock : () => {}}
                            readOnly={previewMode || !canEdit}
                            variables={variables}
                            isActive={isActive}
                          />
                        ) : (
                          <div className="editor-content-container">
                            <BlockComponent
                              block={block}
                              onChange={canEdit && !previewMode ? updateBlock : () => {}}
                              readOnly={previewMode || !canEdit}
                              variables={variables}
                              isActive={isActive}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  );
                }
              })}

              {/* Add content trigger */}
              {canEdit && !previewMode && blocks.length > 0 && (
                <div ref={paletteWrapRef} style={{ position: 'relative', marginTop: 12 }}>
                  <div className="editor-add-content-trigger" onClick={() => setPaletteOpenAt(blocks.length)}>
                    <span className="plus-circle"><PlusOutlined /></span>
                    <span>Add content</span>
                  </div>
                  <FloatingBlockPalette
                    visible={paletteOpenAt === blocks.length}
                    onInsert={(block) => { addBlock(block); setPaletteOpenAt(null); }}
                    onClose={() => setPaletteOpenAt(null)}
                  />
                </div>
              )}
            </div>
          </Content>
        </Layout>
      </Layout>

      {canEdit && !previewMode && (
        <button type="button" className="editor-help-btn" onClick={() => message.info('Help & documentation — coming soon')}>
          ? HELP
        </button>
      )}

      {!isTemplate && (
        <Modal
          title="Collaborators"
          open={collabModalOpen}
          onCancel={() => setCollabModalOpen(false)}
          onOk={saveCollaborators}
          okText="Save access"
          confirmLoading={collabSaving}
        >
          <p style={{ color: '#595959', marginBottom: 12 }}>
            Add team members or enter another email. Only selected people can open this page.
          </p>
          <Select
            mode="tags"
            style={{ width: '100%' }}
            placeholder="Select team member or type email"
            value={collabSelection}
            onChange={setCollabSelection}
            tokenSeparators={[',', ' ']}
            options={teamMembers.map((m) => ({
              value: (m.email || '').toLowerCase(),
              label: `${m.name || m.email} (${m.role || 'Member'})`,
            }))}
          />
          {collaborators.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 6, color: '#8c8c8c', fontSize: 12 }}>Current access</div>
              <Space size={[6, 6]} wrap>
                {collaborators.map((email) => (
                  <Tag key={email}>{email}</Tag>
                ))}
              </Space>
            </div>
          )}
        </Modal>
      )}

      {/* Variables drawer */}
      <Drawer
        title="Variables"
        placement="right"
        width={300}
        open={varDrawerOpen}
        onClose={() => setVarDrawerOpen(false)}
        styles={{ body: { padding: 16 } }}
      >
        <VariablePanel variables={variables} onChange={handleVariableChange} />
      </Drawer>

      {/* Save block name modal */}
      <Modal
        title="Save block to library"
        open={saveBlockModalOpen}
        onOk={confirmSaveBlock}
        onCancel={() => { setSaveBlockModalOpen(false); setSaveBlockDraft(null); setSaveBlockName(''); }}
        okText="Save"
        width={360}
      >
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 6, fontSize: 13, color: '#595959' }}>Block name</div>
          <Input
            value={saveBlockName}
            onChange={(e) => setSaveBlockName(e.target.value)}
            placeholder="Enter a name for this block…"
            onPressEnter={confirmSaveBlock}
            autoFocus
          />
        </div>
      </Modal>

      {/* Share modal */}
      {!isTemplate && (
        <Modal
          title="Share proposal"
          open={shareModalOpen}
          onCancel={() => setShareModalOpen(false)}
          footer={null}
          width={520}
        >
          {doc?.status === 'published' && doc?.slug ? (
            <>
              <p style={{ marginBottom: 16, color: 'var(--color-text-secondary)' }}>
                Send the proposal link by email.
              </p>
              {(doc.sentTo && doc.sentTo.length > 0) && (
                <div style={{ marginBottom: 16, padding: '10px 12px', background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Already sent to</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#595959' }}>
                    {doc.sentTo.map((e, i) => (
                      <li key={i}>{e.email} {e.sentAt ? new Date(e.sentAt).toLocaleDateString() : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Send to (email)</label>
                <Input type="email" placeholder="recipient@example.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} size="large" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Add a message (optional)</label>
                <Input.TextArea placeholder="Optional message..." value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Preview link</label>
                <Input.TextArea readOnly value={getPreviewUrl()} rows={2} style={{ fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button onClick={() => setShareModalOpen(false)}>Cancel</Button>
                <Button icon={<CopyOutlined />} onClick={handleCopyPreviewUrl} disabled={!getPreviewUrl()}>Copy link</Button>
                <Button type="primary" icon={<SendOutlined />} loading={shareSending} onClick={handleSendProposalEmail}>Send email</Button>
              </div>
            </>
          ) : (
            <p style={{ color: '#595959' }}>Publish the proposal to get a shareable link.</p>
          )}
        </Modal>
      )}

      {/* Template link modal */}
      {isTemplate && (
        <Modal
          title="Template saved"
          open={templateLinkModalOpen}
          onCancel={() => setTemplateLinkModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setTemplateLinkModalOpen(false)}>Close</Button>,
            <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyTemplateLink}>Copy template link</Button>,
          ]}
        >
          <p style={{ marginBottom: 12, color: '#595959' }}>Use this link to open or edit your template anytime:</p>
          <Input.TextArea readOnly value={getTemplateLink()} rows={2} style={{ fontFamily: 'monospace', fontSize: 13 }} />
        </Modal>
      )}

      {/* ── TOC Sidebar (slide-in from left) ── */}
      <TOCSidebar
        open={editorTocOpen}
        onClose={() => setEditorTocOpen(false)}
        items={extractTocItems(blocks)}
        activeId={null}
        title={title}
      />

      {/* ── Saved block preview modal ── */}
      <Modal
        title={previewSavedBlock?.name || 'Block Preview'}
        open={!!previewSavedBlock}
        onCancel={() => setPreviewSavedBlock(null)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        {previewSavedBlock && (() => {
          const PreviewComp = BLOCK_COMPONENTS[previewSavedBlock.type];
          if (!PreviewComp) return <div style={{ color: '#999', textAlign: 'center', padding: 32 }}>No preview available</div>;
          return (
            <div style={{ padding: '16px 0', maxHeight: '70vh', overflowY: 'auto' }}>
              <PreviewComp block={previewSavedBlock} onChange={() => {}} readOnly variables={variables} />
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ─── DropZone helper ─────────────────────────────────────────────────────────

function DropZone({ index, dragOverIndex, setDragOverIndex, setDragOverCanvas, handleDropAt, label, minHeight }) {
  const isOver = dragOverIndex === index;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOverIndex(index); setDragOverCanvas(false); }}
      onDragLeave={() => setDragOverIndex(null)}
      onDrop={(e) => { e.stopPropagation(); handleDropAt(index, e); setDragOverIndex(null); setDragOverCanvas(false); }}
      style={{
        minHeight: isOver ? 56 : minHeight,
        marginBottom: 8,
        borderRadius: 8,
        border: isOver ? '2px dashed var(--primary-color)' : '2px dashed transparent',
        background: isOver ? 'rgba(22, 119, 255, 0.06)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isOver ? 'var(--primary-color)' : 'transparent',
        fontSize: 13,
        transition: 'all 0.15s',
      }}
    >
      {isOver ? label : ''}
    </div>
  );
}

export default ProposalEditor;
