/**
 * EditorLibrary — left sidebar.
 * Library: Blocks / Saved / Images tabs
 * Explore: All / Blocks / Snippets / Images tabs
 */
import { useState, useMemo, useRef, useEffect, useCallback, Component } from 'react';
import { Input, Tabs, Typography, Card, Space, Button, Tooltip, Spin, Popconfirm, message } from 'antd';
import {
  SearchOutlined, BlockOutlined, FileTextOutlined,
  HolderOutlined, DollarOutlined, FontSizeOutlined,
  PictureOutlined, PlaySquareOutlined, FormOutlined,
  FolderOutlined, FilterOutlined, SortAscendingOutlined, UnorderedListOutlined,
  DeleteOutlined, PlusOutlined, UploadOutlined, LoadingOutlined,
  EyeOutlined, EditOutlined,
} from '@ant-design/icons';
import { BLOCK_PRESETS, SNIPPETS } from './editorPresets';
import { BLOCK_COMPONENTS } from './blockRegistry';
import { useImageStore } from './imageStore';

const { Text } = Typography;

/** Strip HTML tags to get plain text for previews */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Catches render errors inside block previews so one bad block doesn't crash the sidebar */
class BlockPreviewBoundary extends Component {
  constructor(props) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return this.props.fallback || null;
    return this.props.children;
  }
}

const BLOCK_PREVIEW_SCALE = 0.38;
const BLOCK_PREVIEW_WIDTH_PCT = `${(100 / BLOCK_PREVIEW_SCALE).toFixed(0)}%`; // ~263%

const DRAG_TYPE_BLOCK_PRESET = 'application/x-editor-block-preset';
const DRAG_TYPE_SNIPPET = 'application/x-editor-snippet';
const DRAG_PAYLOAD_PREFIX = 'editor:';

const PRESET_ICONS = {
  heading: FontSizeOutlined,
  text: FontSizeOutlined,
  pricing: DollarOutlined,
  button: BlockOutlined,
  divider: HolderOutlined,
  form: FormOutlined,
  image: PictureOutlined,
  video: PlaySquareOutlined,
  agreement: FileTextOutlined,
};

// 10 Unsplash explore images (category + id for stable URLs)
const EXPLORE_IMAGES = [
  { id: 'ex1', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70', name: 'Mountain Lake' },
  { id: 'ex2', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=70', name: 'Forest Path' },
  { id: 'ex3', url: 'https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=400&q=70', name: 'City at Night' },
  { id: 'ex4', url: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&q=70', name: 'Workspace' },
  { id: 'ex5', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=70', name: 'Team Work' },
  { id: 'ex6', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=70', name: 'Analytics' },
  { id: 'ex7', url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=70', name: 'Office Meeting' },
  { id: 'ex8', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=70', name: 'Laptop Code' },
  { id: 'ex9', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=70', name: 'Startup' },
  { id: 'ex10', url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=70', name: 'Collaboration' },
];

// ─── Block preset card ────────────────────────────────────────────────────────
function BlockPresetCard({ preset, onAdd, markDragStarted, wasDrag }) {
  const Icon = PRESET_ICONS[preset.type] || BlockOutlined;
  return (
    <Card
      size="small"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE_BLOCK_PRESET, preset.id);
        e.dataTransfer.setData('text/plain', DRAG_PAYLOAD_PREFIX + 'preset:' + preset.id);
        e.dataTransfer.effectAllowed = 'copy';
        markDragStarted?.();
      }}
      onClick={() => { if (!wasDrag?.()) onAdd?.('preset', preset.id); }}
      style={{ marginBottom: 8, cursor: 'grab', borderRadius: 8 }}
      styles={{ body: { padding: '10px 12px' } }}
    >
      <Space size={8}>
        <Icon style={{ color: '#1677ff', fontSize: 16 }} />
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 12, display: 'block' }}>{preset.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }} ellipsis>{preset.preview}</Text>
        </div>
      </Space>
    </Card>
  );
}

// ─── Snippet card (with scaled actual block preview) ─────────────────────────
function SnippetCard({ snippet, onAdd, markDragStarted, wasDrag }) {
  /* Get the first block of the snippet to render as thumbnail */
  const firstBlock = useMemo(() => {
    try {
      const blocks = snippet.createBlocks();
      return Array.isArray(blocks) && blocks.length > 0 ? blocks[0] : null;
    } catch { return null; }
  }, [snippet.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const BlockComp = firstBlock ? BLOCK_COMPONENTS[firstBlock.type] : null;

  return (
    <Card
      size="small"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE_SNIPPET, snippet.id);
        e.dataTransfer.setData('text/plain', DRAG_PAYLOAD_PREFIX + 'snippet:' + snippet.id);
        e.dataTransfer.effectAllowed = 'copy';
        markDragStarted?.();
      }}
      onClick={() => { if (!wasDrag?.()) onAdd?.('snippet', snippet.id); }}
      style={{ marginBottom: 8, cursor: 'grab', borderRadius: 10, overflow: 'hidden', padding: 0 }}
      styles={{ body: { padding: 0 } }}
      className="snippet-card"
    >
      {/* Thumbnail — scaled actual first block */}
      <div style={{ height: 100, background: '#ffffff', borderBottom: '1px solid #f0f0f0', position: 'relative', overflow: 'hidden' }}>
        {BlockComp && firstBlock ? (
          <BlockPreviewBoundary fallback={<div style={{ height: '100%', background: '#f5f5f5' }} />}>
            <div style={{
              pointerEvents: 'none',
              position: 'absolute', top: 0, left: 0,
              width: BLOCK_PREVIEW_WIDTH_PCT,
              transform: `scale(${BLOCK_PREVIEW_SCALE})`,
              transformOrigin: 'top left',
            }}>
              <BlockComp block={firstBlock} readOnly variables={{}} />
            </div>
          </BlockPreviewBoundary>
        ) : (
          /* Fallback bars when no renderable block found */
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ height: 7, background: '#1a3a6c', borderRadius: 3, width: '72%' }} />
            <div style={{ height: 4, background: '#c8c8c8', borderRadius: 3, width: '100%' }} />
            <div style={{ height: 4, background: '#c8c8c8', borderRadius: 3, width: '88%' }} />
            <div style={{ height: 4, background: '#d8d8d8', borderRadius: 3, width: '70%' }} />
          </div>
        )}
      </div>
      {/* Name row */}
      <div style={{ padding: '8px 10px' }}>
        <Text strong style={{ fontSize: 11, display: 'block' }} ellipsis>{snippet.name}</Text>
        <Text type="secondary" style={{ fontSize: 10 }} ellipsis>{snippet.description}</Text>
      </div>
    </Card>
  );
}

// ─── Saved block card (with scaled actual block preview + hover eye/edit) ────
function SavedBlockCard({ saved, onAdd, onDelete, onPreview, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(saved.name);
  const Icon = PRESET_ICONS[saved.type] || BlockOutlined;
  const BlockComp = BLOCK_COMPONENTS[saved.type];

  const handleRename = () => {
    if (draftName.trim() && draftName.trim() !== saved.name) {
      onEdit?.(saved, draftName.trim());
    }
    setEditingName(false);
  };

  /* Fallback for types with no BLOCK_COMPONENTS entry */
  const renderFallback = () => (
    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Icon style={{ color: '#1677ff', fontSize: 14 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', textTransform: 'capitalize' }}>{saved.type}</span>
      </div>
      <div style={{ height: 5, background: '#e0e0e0', borderRadius: 3, width: '80%' }} />
      <div style={{ height: 5, background: '#e0e0e0', borderRadius: 3, width: '65%' }} />
      <div style={{ height: 5, background: '#ebebeb', borderRadius: 3, width: '90%' }} />
    </div>
  );

  return (
    <Card
      size="small"
      style={{ marginBottom: 8, borderRadius: 10, overflow: 'hidden', padding: 0, cursor: 'pointer' }}
      styles={{ body: { padding: 0 } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail area — scaled actual block content */}
      <div
        style={{ height: 90, background: '#ffffff', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #f0f0f0' }}
        onClick={() => !editingName && onAdd?.(saved)}
      >
        {BlockComp ? (
          <BlockPreviewBoundary fallback={renderFallback()}>
            <div style={{
              pointerEvents: 'none',
              position: 'absolute', top: 0, left: 0,
              width: BLOCK_PREVIEW_WIDTH_PCT,
              transform: `scale(${BLOCK_PREVIEW_SCALE})`,
              transformOrigin: 'top left',
            }}>
              <BlockComp block={saved} readOnly variables={{}} />
            </div>
          </BlockPreviewBoundary>
        ) : renderFallback()}

        {/* Hover actions overlay */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <Tooltip title="Preview">
              <button
                onClick={(e) => { e.stopPropagation(); onPreview?.(saved); }}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.92)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1677ff', fontSize: 15,
                }}
              >
                <EyeOutlined />
              </button>
            </Tooltip>
            <Tooltip title="Rename">
              <button
                onClick={(e) => { e.stopPropagation(); setEditingName(true); setDraftName(saved.name); }}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.92)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#52c41a', fontSize: 15,
                }}
              >
                <EditOutlined />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Name row */}
      <div style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        {editingName ? (
          <Input
            size="small"
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={handleRename}
            onPressEnter={handleRename}
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, fontSize: 11, height: 24 }}
          />
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 11, display: 'block' }} ellipsis>{saved.name}</Text>
            <Text type="secondary" style={{ fontSize: 10 }}>
              {saved.type} · {saved.savedAt ? new Date(saved.savedAt).toLocaleDateString() : ''}
            </Text>
          </div>
        )}
        {!editingName && (
          <Popconfirm
            title="Delete this saved block?"
            description="This cannot be undone."
            onConfirm={(e) => { e?.stopPropagation(); onDelete?.(saved.id); }}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text" size="small" danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ flexShrink: 0, width: 22, height: 22, minWidth: 0, padding: 0 }}
            />
          </Popconfirm>
        )}
      </div>
    </Card>
  );
}

// ─── Explore > Images: user images + Unsplash stock images ──────────────────
function ExploreImageLibrary({ onAddImage }) {
  const { images, loading, uploading, fetchImages, uploadImage, deleteImage } = useImageStore();
  const fileInputRef = useRef(null);
  const [deletedStockIds, setDeletedStockIds] = useState([]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const img = await uploadImage(file);
    if (img) message.success('Image uploaded');
    else message.error('Upload failed');
  }, [uploadImage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Upload button */}
      <Button
        type="primary"
        icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
        block
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        style={{ borderRadius: 8 }}
      >
        {uploading ? 'Uploading…' : 'Upload Image'}
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* User's uploaded images */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><Spin /></div>
      ) : images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#8c8c8c' }}>
          <PictureOutlined style={{ fontSize: 28, display: 'block', marginBottom: 6, color: '#d9d9d9' }} />
          <div style={{ fontSize: 12 }}>No uploaded images yet</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>My Images</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {images.map((img) => (
              <div key={img._id} className="img-card-wrap">
                <div className="img-card-thumb" onClick={() => onAddImage?.(img)}>
                  <img src={img.url} alt={img.originalName} loading="lazy" />
                  <div className="img-card-overlay"><PlusOutlined /> Add</div>
                </div>
                <div className="img-card-name" title={img.originalName}>{img.originalName}</div>
                <Popconfirm title="Delete this image?" onConfirm={() => deleteImage(img._id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                  <Button
                    type="text" size="small" danger icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, minWidth: 0, padding: 0, background: 'rgba(255,255,255,0.92)', borderRadius: 5, zIndex: 2 }}
                    className="img-card-del-btn"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Unsplash stock images */}
      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 8, marginBottom: 2 }}>Stock Images</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {EXPLORE_IMAGES.filter((img) => !deletedStockIds.includes(img.id)).map((img) => (
          <div key={img.id} className="img-card-wrap">
            <div
              className="img-card-thumb"
              onClick={() => onAddImage?.({ url: img.url, originalName: img.name, _id: img.id })}
            >
              <img src={img.url} alt={img.name} loading="lazy" />
              <div className="img-card-overlay"><PlusOutlined /> Add</div>
            </div>
            <div className="img-card-name" title={img.name}>{img.name}</div>
            <Popconfirm
              title="Remove this image?"
              onConfirm={() => setDeletedStockIds((prev) => [...prev, img.id])}
              okText="Remove"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text" size="small" danger icon={<DeleteOutlined />}
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, minWidth: 0, padding: 0, background: 'rgba(255,255,255,0.92)', borderRadius: 5, zIndex: 2 }}
                className="img-card-del-btn"
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Library > Images component ───────────────────────────────────────────────
function ImageLibrary({ onAddImage }) {
  const { images, loading, uploading, fetchImages, uploadImage, deleteImage } = useImageStore();
  const fileInputRef = useRef(null);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const img = await uploadImage(file);
    if (img) message.success('Image uploaded');
    else message.error('Upload failed');
  }, [uploadImage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <Button
        type="primary"
        icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
        block
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        style={{ borderRadius: 8 }}
      >
        {uploading ? 'Uploading…' : 'Upload Image'}
      </Button>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><Spin /></div>
      ) : images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#8c8c8c' }}>
          <PictureOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#d9d9d9' }} />
          <div style={{ fontSize: 12 }}>No images yet</div>
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>Upload to get started</div>
        </div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {images.map((img) => (
              <div key={img._id} className="img-card-wrap">
                <div className="img-card-thumb" onClick={() => onAddImage?.(img)}>
                  <img src={img.url} alt={img.originalName} loading="lazy" />
                  <div className="img-card-overlay"><PlusOutlined /> Add</div>
                </div>
                <div className="img-card-name" title={img.originalName}>{img.originalName}</div>
                <Popconfirm title="Delete this image?" onConfirm={() => deleteImage(img._id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                  <Button
                    type="text" size="small" danger icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, minWidth: 0, padding: 0, background: 'rgba(255,255,255,0.92)', borderRadius: 5, zIndex: 2 }}
                    className="img-card-del-btn"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EditorLibrary({
  onAddPreset, onAddSnippet, onAddSavedBlock, onDeleteSavedBlock,
  onAddImage, savedBlocks = [],
  onPreviewSavedBlock, onEditSavedBlock,
}) {
  const [search, setSearch] = useState('');
  const [mainTab, setMainTab] = useState('library');
  const [subTab, setSubTab] = useState('blocks');
  const [exploreTab, setExploreTab] = useState('all');
  const draggedRef = useRef(false);

  const handleAdd = (kind, id) => {
    if (kind === 'preset') onAddPreset?.(id);
    else if (kind === 'snippet') onAddSnippet?.(id);
  };
  const markDragStarted = () => { draggedRef.current = true; };
  const wasDrag = () => { const v = draggedRef.current; draggedRef.current = false; return v; };

  const filteredPresets = useMemo(() => {
    if (!search.trim()) return BLOCK_PRESETS;
    const q = search.toLowerCase();
    return BLOCK_PRESETS.filter((p) => p.name.toLowerCase().includes(q) || (p.preview && p.preview.toLowerCase().includes(q)));
  }, [search]);

  const filteredSnippets = useMemo(() => {
    if (!search.trim()) return SNIPPETS;
    const q = search.toLowerCase();
    return SNIPPETS.filter((s) => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
  }, [search]);

  const filteredSaved = useMemo(() => {
    if (!search.trim()) return savedBlocks;
    const q = search.toLowerCase();
    return savedBlocks.filter((s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
  }, [search, savedBlocks]);

  const showSearch = mainTab === 'library' && subTab !== 'images';

  return (
    <div className="editor-sidebar" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
      <Tabs
        activeKey={mainTab}
        onChange={setMainTab}
        size="small"
        style={{ marginTop: 12 }}
        items={[
          { key: 'library', label: 'Library' },
          { key: 'explore', label: 'Explore' },
        ]}
      />

      {/* ── Library tab ──────────────────────────────────────────────────── */}
      {mainTab === 'library' && (
        <>
          <Tabs
            activeKey={subTab}
            onChange={setSubTab}
            size="small"
            style={{ marginBottom: 12 }}
            items={[
              { key: 'blocks', label: 'Blocks' },
              { key: 'saved', label: `Saved${savedBlocks.length ? ` (${savedBlocks.length})` : ''}` },
              { key: 'images', label: 'Images' },
            ]}
          />

          {/* Search bar only for Blocks + Saved tabs */}
          {showSearch && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <Input
                placeholder="Search blocks…"
                prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ flex: 1 }}
              />
              <Space size={4}>
                <Button type="text" size="small" icon={<FilterOutlined />} style={{ color: '#8c8c8c' }} />
                <Button type="text" size="small" icon={<SortAscendingOutlined />} style={{ color: '#8c8c8c' }} />
                <Button type="text" size="small" icon={<UnorderedListOutlined />} style={{ color: '#8c8c8c' }} />
              </Space>
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0 16px' }}>
            {/* Blocks tab */}
            {subTab === 'blocks' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Click or drag onto the page to add</Text>
                </div>
                {filteredPresets.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>No blocks match your search.</Text>
                ) : (
                  filteredPresets.map((preset) => (
                    <BlockPresetCard key={preset.id} preset={preset} onAdd={handleAdd} markDragStarted={markDragStarted} wasDrag={wasDrag} />
                  ))
                )}
              </>
            )}

            {/* Saved tab */}
            {subTab === 'saved' && (
              <>
                {filteredSaved.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <FolderOutlined style={{ fontSize: 32, color: '#d9d9d9', display: 'block', marginBottom: 8 }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No saved blocks yet.<br />Use the ⋯ menu on any block to save it.
                    </Text>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Hover to preview or rename · Click to add</Text>
                    </div>
                    {filteredSaved.map((saved) => (
                      <SavedBlockCard
                        key={saved.id}
                        saved={saved}
                        onAdd={onAddSavedBlock}
                        onDelete={onDeleteSavedBlock}
                        onPreview={onPreviewSavedBlock}
                        onEdit={onEditSavedBlock}
                      />
                    ))}
                  </>
                )}
              </>
            )}

            {/* Images tab */}
            {subTab === 'images' && (
              <ImageLibrary onAddImage={onAddImage} />
            )}
          </div>
        </>
      )}

      {/* ── Explore tab ──────────────────────────────────────────────────── */}
      {mainTab === 'explore' && (
        <>
          <Input
            placeholder={exploreTab === 'images' ? 'Search images…' : 'Search snippets…'}
            prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ marginBottom: 10 }}
          />

          <Tabs
            activeKey={exploreTab}
            onChange={setExploreTab}
            size="small"
            style={{ marginBottom: 8 }}
            items={[
              { key: 'all', label: 'All' },
              { key: 'blocks', label: 'Blocks' },
              { key: 'snippets', label: 'Snippets' },
              { key: 'images', label: 'Images' },
            ]}
          />

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 16px' }}>
            {/* All tab */}
            {exploreTab === 'all' && (
              <>
                {/* Blocks section */}
                <div style={{ marginBottom: 6 }}>
                  <Text strong style={{ fontSize: 12, color: '#e67e22' }}>Blocks</Text>
                </div>
                {BLOCK_PRESETS.map((preset) => (
                  <BlockPresetCard key={preset.id} preset={preset} onAdd={handleAdd} markDragStarted={markDragStarted} wasDrag={wasDrag} />
                ))}

                {/* Snippets section */}
                <div style={{ marginTop: 16, marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12, color: '#e67e22' }}>Snippets</Text>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {filteredSnippets.map((snippet) => (
                    <SnippetCard key={snippet.id} snippet={snippet} onAdd={handleAdd} markDragStarted={markDragStarted} wasDrag={wasDrag} />
                  ))}
                </div>

                {/* Images section */}
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 12, color: '#e67e22' }}>Images</Text>
                </div>
                <ExploreImageLibrary onAddImage={onAddImage} />
              </>
            )}

            {/* Blocks tab */}
            {exploreTab === 'blocks' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Click or drag onto the page to add</Text>
                </div>
                {filteredPresets.map((preset) => (
                  <BlockPresetCard key={preset.id} preset={preset} onAdd={handleAdd} markDragStarted={markDragStarted} wasDrag={wasDrag} />
                ))}
              </>
            )}

            {/* Snippets tab */}
            {exploreTab === 'snippets' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Pre-built multi-block templates</Text>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {filteredSnippets.map((snippet) => (
                    <SnippetCard key={snippet.id} snippet={snippet} onAdd={handleAdd} markDragStarted={markDragStarted} wasDrag={wasDrag} />
                  ))}
                </div>
              </>
            )}

            {/* Images tab — exact same as Library > Images + stock images below */}
            {exploreTab === 'images' && (
              <ExploreImageLibrary onAddImage={onAddImage} />
            )}
          </div>
        </>
      )}

      {/* ── Build pages faster promo (library tab only) ── */}
      {mainTab === 'library' && (
        <div className="build-pages-card">
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #fff7e6 0%, #f9f0ff 100%)', borderRadius: 10, marginBottom: 12 }} />
          <h4>Build pages faster</h4>
          <p>Save your favourite blocks of content to your Block Library, then drag and drop them into any page.</p>
          <Button type="primary" className="explore-blocks-btn" size="middle">
            Explore Blocks
          </Button>
        </div>
      )}
    </div>
  );
}

export { DRAG_TYPE_BLOCK_PRESET, DRAG_TYPE_SNIPPET, BLOCK_PRESETS, SNIPPETS };
