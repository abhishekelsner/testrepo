/**
 * VariablePanel — sidebar panel for editing proposal variables.
 * Variables are key-value pairs that replace {{Variable Name}} placeholders in blocks.
 * Built-in defaults: Client Name, Deal Value, Date.
 */
import { Button, Input, Typography, Divider, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

/** Default variable keys pre-populated for convenience. */
const DEFAULT_VARIABLE_KEYS = ['Client Name', 'Deal Value', 'Date'];

function VariablePanel({ variables = {}, onChange }) {
  const entries = Object.entries(variables);

  function setVar(key, value) {
    onChange({ ...variables, [key]: value });
  }

  function addVar() {
    const key = `Variable ${entries.length + 1}`;
    onChange({ ...variables, [key]: '' });
  }

  function renameVar(oldKey, newKey) {
    if (!newKey || newKey === oldKey) return;
    const updated = {};
    Object.entries(variables).forEach(([k, v]) => {
      updated[k === oldKey ? newKey : k] = v;
    });
    onChange(updated);
  }

  function deleteVar(key) {
    const updated = { ...variables };
    delete updated[key];
    onChange(updated);
  }

  /** Ensure default variables are present with empty values if not set. */
  function initDefaults() {
    const updated = { ...variables };
    DEFAULT_VARIABLE_KEYS.forEach((k) => {
      if (!(k in updated)) updated[k] = '';
    });
    // Set Date default to today
    if (!updated['Date']) updated['Date'] = new Date().toLocaleDateString();
    onChange(updated);
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>Variables</Title>
        <Tooltip title="Use {{Variable Name}} in text and heading blocks. Values are replaced on preview/publish.">
          <InfoCircleOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
        </Tooltip>
      </div>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10 }}>
        Reference in text: <code style={{ fontSize: 10 }}>{'{{Client Name}}'}</code>
      </Text>

      {entries.length === 0 && (
        <Button type="dashed" size="small" onClick={initDefaults} style={{ width: '100%', marginBottom: 8 }}>
          Add default variables
        </Button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {/* Editable key name */}
              <Input
                value={key}
                size="small"
                onBlur={(e) => renameVar(key, e.target.value.trim())}
                onChange={() => {}} // controlled — commit on blur
                defaultValue={key}
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--primary-color)',
                  borderColor: 'transparent',
                  background: 'transparent',
                  padding: '0 4px',
                }}
              />
              <Button
                type="text" danger size="small"
                icon={<DeleteOutlined />}
                onClick={() => deleteVar(key)}
              />
            </div>
            <Input
              value={value}
              size="small"
              onChange={(e) => setVar(key, e.target.value)}
              placeholder={`Value for {{${key}}}`}
            />
          </div>
        ))}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={addVar}
        style={{ width: '100%' }}
      >
        Add Variable
      </Button>

      {/* CRM placeholder — future integration */}
      <div
        style={{
          marginTop: 14,
          padding: '8px 10px',
          background: 'var(--bg-gray-shade3)',
          borderRadius: 6,
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}
      >
        <Text type="secondary" style={{ fontSize: 11 }}>
          🔗 <strong>CRM sync</strong> — coming soon. Variables will be auto-filled from your CRM.
        </Text>
      </div>
    </div>
  );
}

export default VariablePanel;
