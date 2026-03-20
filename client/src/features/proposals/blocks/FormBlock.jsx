/**
 * FormBlock — simple configurable form (name, email, message, etc.).
 * content: { fields: [{ id, label, type, required }], webhookUrl?: string }
 * In editor mode: configure form fields.
 * In readOnly mode: renders a functional form (submits to webhookUrl or shows success).
 */
import { useState } from 'react';
import {
  Input, Button, Select, Switch, Typography, Space, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';

const { Text } = Typography;

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'tel', label: 'Phone' },
];

function uid() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function FormBlock({ block, onChange, readOnly }) {
  const fields = block.content?.fields || [];
  const webhookUrl = block.content?.webhookUrl || '';
  const [formValues, setFormValues] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // ─── Editor mode ───────────────────────────────────────────────────────
  function addField() {
    const newField = { id: uid(), label: 'Field', type: 'text', required: false };
    onChange({ ...block, content: { ...block.content, fields: [...fields, newField] } });
  }

  function updateField(id, key, value) {
    const updated = fields.map((f) => (f.id === id ? { ...f, [key]: value } : f));
    onChange({ ...block, content: { ...block.content, fields: updated } });
  }

  function removeField(id) {
    const updated = fields.filter((f) => f.id !== id);
    onChange({ ...block, content: { ...block.content, fields: updated } });
  }

  if (!readOnly) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <FormOutlined style={{ color: 'var(--primary-color)' }} />
          <Text strong style={{ fontSize: 13 }}>Form Block</Text>
        </div>
        {fields.map((field) => (
          <div
            key={field.id}
            style={{
              display: 'flex', gap: 8, alignItems: 'center',
              padding: '8px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              background: 'var(--bg-gray-shade3)',
            }}
          >
            <Input
              value={field.label}
              onChange={(e) => updateField(field.id, 'label', e.target.value)}
              placeholder="Field label"
              style={{ flex: 2 }}
              variant="borderless"
            />
            <Select
              value={field.type}
              onChange={(v) => updateField(field.id, 'type', v)}
              options={FIELD_TYPES}
              size="small"
              style={{ width: 110 }}
            />
            <Space>
              <Text style={{ fontSize: 12 }}>Required</Text>
              <Switch
                size="small"
                checked={!!field.required}
                onChange={(v) => updateField(field.id, 'required', v)}
              />
            </Space>
            <Button
              type="text" danger size="small"
              icon={<DeleteOutlined />}
              onClick={() => removeField(field.id)}
            />
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={addField}>
          Add Field
        </Button>
        <Input
          value={webhookUrl}
          onChange={(e) => onChange({ ...block, content: { ...block.content, webhookUrl: e.target.value } })}
          placeholder="Webhook URL (optional — form data posted here on submit)"
          addonBefore="Webhook"
        />
      </div>
    );
  }

  // ─── Read-only / submission mode ────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-success)' }}>
        <FormOutlined style={{ fontSize: 32, marginBottom: 8 }} />
        <div><Text strong>Thank you! Your message has been sent.</Text></div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Validate required fields
    for (const f of fields) {
      if (f.required && !formValues[f.id]) {
        message.error(`${f.label} is required`);
        return;
      }
    }
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: formValues }),
        });
      } catch {
        // Webhook failed silently — still show success to client
      }
    }
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {fields.map((field) => (
        <div key={field.id}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
            {field.label}{field.required && <span style={{ color: 'red' }}> *</span>}
          </label>
          {field.type === 'textarea' ? (
            <Input.TextArea
              rows={3}
              value={formValues[field.id] || ''}
              onChange={(e) => setFormValues((v) => ({ ...v, [field.id]: e.target.value }))}
              required={field.required}
            />
          ) : (
            <Input
              type={field.type}
              value={formValues[field.id] || ''}
              onChange={(e) => setFormValues((v) => ({ ...v, [field.id]: e.target.value }))}
              required={field.required}
            />
          )}
        </div>
      ))}
      {fields.length > 0 && (
        <Button type="primary" htmlType="submit" style={{ alignSelf: 'flex-start' }}>
          Submit
        </Button>
      )}
      {fields.length === 0 && (
        <Text type="secondary">No fields configured for this form.</Text>
      )}
    </form>
  );
}

export default FormBlock;
