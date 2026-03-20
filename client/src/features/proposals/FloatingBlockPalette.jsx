/**
 * Floating block palette — grid of block types (Text, Splash, Quote, Video, Embed, Accept).
 * Same-to-same as reference UI.
 */
import { Button } from 'antd';
import { FontSizeOutlined, PictureOutlined, FormatPainterOutlined, PlaySquareOutlined, CodeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { createBlock } from './BlockMenu';

const PALETTE_ITEMS = [
  { type: 'text',    label: 'Text',   icon: FontSizeOutlined,      className: 'text' },
  { type: 'image',   label: 'Splash', icon: PictureOutlined,       className: 'splash' },
  { type: 'heading', label: 'Quote',  icon: FormatPainterOutlined, className: 'quote' },
  { type: 'video',   label: 'Video',  icon: PlaySquareOutlined,    className: 'video' },
  { type: 'html',    label: 'Embed',  icon: CodeOutlined,          className: 'embed' },
  { type: 'button',  label: 'Accept', icon: CheckCircleOutlined,   className: 'accept' },
];

export default function FloatingBlockPalette({ visible, onInsert, onClose, anchorRef }) {
  if (!visible) return null;

  return (
    <div
      className="editor-block-palette"
      style={{
        position: 'absolute',
        left: anchorRef?.current ? 0 : '50%',
        top: anchorRef?.current ? '100%' : undefined,
        transform: anchorRef?.current ? undefined : 'translateX(-50%)',
        marginTop: 8,
        zIndex: 100,
      }}
    >
      {PALETTE_ITEMS.map(({ type, label, icon: Icon, className }) => (
        <button
          key={type}
          type="button"
          className={`editor-block-palette-btn ${className}`}
          onClick={() => onInsert(createBlock(type))}
        >
          <span className="icon-wrap"><Icon /></span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
