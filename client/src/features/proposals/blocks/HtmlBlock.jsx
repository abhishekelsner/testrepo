/**
 * HtmlBlock — raw HTML embed.
 * content: { html: string }
 * Security: HTML is sanitized on render (removes <script>, event handlers, javascript:).
 *
 * In edit mode:
 *  - When NOT active: renders the HTML as a visual preview (like read mode)
 *  - When active (isActive=true): shows a textarea for editing + preview below
 */
import { useState } from 'react';
import { Input, Button } from 'antd';
import { CodeOutlined, WarningOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';

const { TextArea } = Input;

/**
 * Browser-native HTML sanitizer — no extra packages needed.
 * Removes script/iframe/object/embed tags and event handler attributes.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, object, embed').forEach((el) => el.remove());
    doc.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith('on')) el.removeAttribute(attr.name);
        if (attr.value.toLowerCase().includes('javascript:')) el.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  } catch {
    return '';
  }
}

function HtmlBlock({ block, onChange, readOnly, isActive }) {
  const html = block.content?.html || '';
  const [editMode, setEditMode] = useState(false);

  // Always show rendered HTML in read-only / preview mode
  if (readOnly) {
    return (
      <div
        className="html-block-render"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        style={{ lineHeight: 1.6 }}
      />
    );
  }

  // In edit mode but block not active (or not in textarea mode): show visual preview
  if (!isActive && !editMode) {
    return (
      <div
        className="html-block-render html-block-edit-preview"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) || '<div style="color:#bfbfbf;font-size:13px;padding:12px;text-align:center;">HTML block — click to edit</div>' }}
        style={{ lineHeight: 1.6, cursor: 'default', minHeight: 32 }}
      />
    );
  }

  // Active / editing state — show textarea + live preview
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CodeOutlined style={{ color: 'var(--primary-color)' }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>HTML Embed</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>
            <WarningOutlined /> Scripts and event handlers are removed.
          </span>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CheckOutlined />}
          onClick={() => setEditMode(false)}
          style={{ color: '#52c41a' }}
        >
          Done
        </Button>
      </div>
      <TextArea
        value={html}
        onChange={(e) => onChange({ ...block, content: { ...block.content, html: e.target.value } })}
        placeholder="Paste raw HTML here…"
        autoSize={{ minRows: 4, maxRows: 14 }}
        style={{ fontFamily: 'monospace', fontSize: 12 }}
        autoFocus
      />
      {html && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Preview:</div>
          <div
            style={{
              border: '1px dashed var(--border-color)',
              borderRadius: 6,
              padding: 12,
              background: '#fff',
            }}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />
        </div>
      )}
    </div>
  );
}

export default HtmlBlock;
