/**
 * ButtonBlock — CTA button with label and URL.
 * content: { label: string, url: string }
 */
import { Input, Button } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

function ButtonBlock({ block, onChange, readOnly }) {
  const label = block.content?.label || '';
  const url = block.content?.url || '';

  if (readOnly) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Button
          type="primary"
          size="large"
          href={url || undefined}
          target={url ? '_blank' : undefined}
          rel="noopener noreferrer"
          disabled={!url}
        >
          {label || 'Click Here'}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input
        value={label}
        onChange={(e) => onChange({ ...block, content: { ...block.content, label: e.target.value } })}
        placeholder="Button label"
        addonBefore="Label"
      />
      <Input
        value={url}
        onChange={(e) => onChange({ ...block, content: { ...block.content, url: e.target.value } })}
        placeholder="https://example.com"
        addonBefore={<LinkOutlined />}
      />
      <div style={{ textAlign: 'center', paddingTop: 4 }}>
        <Button type="primary" size="large" disabled>
          {label || 'Click Here'}
        </Button>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Preview</div>
      </div>
    </div>
  );
}

export default ButtonBlock;
