/**
 * CalendarBlock — embed a scheduling calendar (e.g., Calendly link).
 * content: { url: string }
 */
import { Input, Typography } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const { Text } = Typography;

function CalendarBlock({ block, onChange, readOnly }) {
  const url = block.content?.url || '';

  if (readOnly) {
    return url ? (
      <iframe
        src={url}
        title="Calendar Embed"
        style={{ width: '100%', height: 600, border: 'none', borderRadius: 6 }}
        allow="camera; microphone"
      />
    ) : (
      <div style={placeholderStyle}>
        <CalendarOutlined style={{ fontSize: 32, color: 'var(--bg-gray-shade5)' }} />
        <Text type="secondary">No calendar URL set</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarOutlined style={{ color: 'var(--primary-color)' }} />
        <Text strong style={{ fontSize: 13 }}>Calendar Embed (e.g. Calendly)</Text>
      </div>
      <Input
        value={url}
        onChange={(e) => onChange({ ...block, content: { ...block.content, url: e.target.value } })}
        placeholder="https://calendly.com/your-link"
        prefix={<CalendarOutlined />}
      />
      {url && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Preview:</div>
          <iframe
            src={url}
            title="Calendar Preview"
            style={{ width: '100%', height: 400, border: '1px dashed var(--border-color)', borderRadius: 6 }}
          />
        </div>
      )}
    </div>
  );
}

const placeholderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 120,
  background: 'var(--bg-gray-shade3)',
  borderRadius: 6,
};

export default CalendarBlock;
