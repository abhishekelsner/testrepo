/**
 * BlockMenu — dropdown to choose and add a new block type to the proposal.
 */
import { Button, Dropdown, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

/** All supported block types with labels and descriptions. */
export const BLOCK_TYPES = [
  { type: 'text',     label: 'Text',            desc: 'Paragraph of text' },
  { type: 'heading',  label: 'Heading',          desc: 'H1 / H2 / H3 heading' },
  { type: 'image',    label: 'Image',            desc: 'Image via URL' },
  { type: 'video',    label: 'Video Embed',      desc: 'YouTube, Vimeo, etc.' },
  { type: 'pricing',  label: 'Pricing Table',    desc: 'Interactive pricing options' },
  { type: 'button',   label: 'Button',           desc: 'CTA button with link' },
  { type: 'divider',  label: 'Divider',          desc: 'Horizontal separator' },
  { type: 'columns',  label: 'Columns',          desc: '2–3 column text layout' },
  { type: 'html',     label: 'HTML Embed',       desc: 'Raw HTML (sanitized)' },
  { type: 'form',     label: 'Form',             desc: 'Contact / info form' },
  { type: 'calendar', label: 'Calendar Embed',   desc: 'Calendly or similar' },
  { type: 'roi',      label: 'ROI Calculator',   desc: 'Custom inputs + formula' },
  { type: 'agreement', label: 'Agreement',      desc: 'Agreement card with sign CTA' },
  { type: 'table',     label: 'Table',          desc: 'Editable rows & columns table' },
];

/** Create a default block object for a given type. */
export function createBlock(type) {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const defaults = {
    text:     { text: '' },
    heading:  { level: 2, text: '' },
    image:    { url: '', alt: '' },
    video:    { url: '', provider: '' },
    pricing:  { options: [], multiSelect: true, totals: { subtotal: 0, total: 0 } },
    button:   { label: 'Click Here', url: '' },
    divider:  {},
    columns:  {
      columns: [
        { id: `col-a-${Date.now()}`, text: '' },
        { id: `col-b-${Date.now()}`, text: '' },
      ],
    },
    html:     { html: '' },
    form:     { fields: [], webhookUrl: '' },
    calendar: { url: '' },
    roi:      { inputs: [], formula: '', outputLabel: 'Result' },
    agreement: {
      line1: "We're excited to move forward with your project.",
      line2: "Please review the agreement and sign to kickstart the work.",
      buttonLabel: 'View Agreement',
      buttonUrl: '',
    },
    table:   { headers: [], cells: [] },
  };
  return { id, type, order: 0, content: defaults[type] || {} };
}

function BlockMenu({ onAdd }) {
  const items = BLOCK_TYPES.map(({ type, label, desc }) => ({
    key: type,
    label: (
      <div style={{ padding: '2px 0' }}>
        <Text strong style={{ fontSize: 13 }}>{label}</Text>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{desc}</div>
      </div>
    ),
  }));

  return (
    <Dropdown
      menu={{ items, onClick: ({ key }) => onAdd(createBlock(key)) }}
      trigger={['click']}
      placement="bottomLeft"
    >
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        style={{ width: '100%', marginTop: 12, borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
      >
        Add Block
      </Button>
    </Dropdown>
  );
}

export default BlockMenu;
