/**
 * ContentBlock — heading + paragraph + image with layout options.
 * content: { heading, headingColor, paragraph, paragraphColor, imageUrl, layout: 'left'|'right'|'stacked' }
 */
import { useState, useRef } from 'react';
import { Input, Button, Tooltip } from 'antd';
import {
  PictureOutlined, UploadOutlined, LoadingOutlined,
  AlignLeftOutlined, AlignRightOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import { useImageStore } from '../imageStore';

const { TextArea } = Input;

const LAYOUTS = [
  { key: 'stacked', label: 'Stack', icon: UnorderedListOutlined, title: 'Image above text' },
  { key: 'left',    label: 'Left',  icon: AlignLeftOutlined,     title: 'Image on left' },
  { key: 'right',   label: 'Right', icon: AlignRightOutlined,    title: 'Image on right' },
];

function ContentBlock({ block, onChange, readOnly, variables }) {
  const c = block.content || {};
  const {
    heading = '', headingColor = '', paragraph = '', paragraphColor = '',
    imageUrl = '', layout = 'stacked',
  } = c;

  const fileRef = useRef(null);
  const { uploading, uploadImage } = useImageStore();

  const patch = (p) => onChange({ ...block, content: { ...c, ...p } });

  function renderText(t, hideMissingVars = false) {
    if (!t) return '';
    return t.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
      const val = variables?.[k.trim()];
      if (val !== undefined && val !== null && val !== '') return val;
      return hideMissingVars ? '' : `{{${k}}}`;
    });
  }

  async function handleUpload(file) {
    const img = await uploadImage(file);
    if (img) patch({ imageUrl: img.url });
  }

  const imgEl = imageUrl ? (
    <img src={imageUrl} alt={heading || 'content'} style={{ width: '100%', borderRadius: 6, display: 'block', objectFit: 'cover' }} />
  ) : (
    !readOnly && (
      <div
        style={{ border: '2px dashed #d9d9d9', borderRadius: 6, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fafafa', flexShrink: 0 }}
        onClick={() => fileRef.current?.click()}
      >
        <PictureOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
      </div>
    )
  );

  const textEl = (
    <div style={{ flex: 1, minWidth: 0 }}>
      {readOnly ? (
        <>
          {heading && <h2 style={{ margin: '0 0 8px', ...(headingColor ? { color: headingColor } : {}) }}>{renderText(heading, true)}</h2>}
          {paragraph && <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', ...(paragraphColor ? { color: paragraphColor } : {}) }}>{renderText(paragraph, true)}</p>}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Input
              value={heading}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="Heading…"
              bordered={false}
              style={{ flex: 1, fontWeight: 600, fontSize: 18, padding: 0, ...(headingColor ? { color: headingColor } : {}) }}
            />
            <Tooltip title="Heading color">
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <input type="color" value={headingColor || '#000000'} onChange={(e) => patch({ headingColor: e.target.value })} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                <span style={{ width: 16, height: 16, borderRadius: 3, background: headingColor || '#000', border: '1.5px solid #d9d9d9', display: 'inline-block' }} />
              </label>
            </Tooltip>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <TextArea
              value={paragraph}
              onChange={(e) => patch({ paragraph: e.target.value })}
              placeholder="Paragraph…"
              autoSize={{ minRows: 2 }}
              bordered={false}
              style={{ flex: 1, padding: 0, fontSize: 14, lineHeight: 1.7, resize: 'none', ...(paragraphColor ? { color: paragraphColor } : {}) }}
            />
            <Tooltip title="Paragraph color">
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: 4 }}>
                <input type="color" value={paragraphColor || '#000000'} onChange={(e) => patch({ paragraphColor: e.target.value })} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                <span style={{ width: 16, height: 16, borderRadius: 3, background: paragraphColor || '#000', border: '1.5px solid #d9d9d9', display: 'inline-block' }} />
              </label>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );

  const isHoriz = layout === 'left' || layout === 'right';

  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#8c8c8c', marginRight: 2 }}>Layout:</span>
          {LAYOUTS.map(({ key, label, icon: Icon, title }) => (
            <Tooltip key={key} title={title}>
              <button
                onClick={() => patch({ layout: key })}
                style={{
                  padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                  border: `1px solid ${layout === key ? '#1677ff' : '#d9d9d9'}`,
                  background: layout === key ? '#e6f4ff' : '#fff',
                  color: layout === key ? '#1677ff' : '#595959',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Icon style={{ fontSize: 12 }} /> {label}
              </button>
            </Tooltip>
          ))}
          {imageUrl ? (
            <Tooltip title="Replace image">
              <button
                onClick={() => fileRef.current?.click()}
                style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer', border: '1px solid #d9d9d9', background: '#fff', color: '#595959', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {uploading ? <LoadingOutlined /> : <UploadOutlined />} Image
              </button>
            </Tooltip>
          ) : null}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
        </div>
      )}

      <div style={{
        display: isHoriz ? 'flex' : 'block',
        flexDirection: layout === 'right' ? 'row-reverse' : 'row',
        gap: isHoriz ? 24 : 0,
        alignItems: 'flex-start',
      }}>
        {isHoriz ? (
          <>
            <div style={{ width: '40%', flexShrink: 0 }}>{imgEl}</div>
            {textEl}
          </>
        ) : (
          <>
            {imgEl && <div style={{ marginBottom: imageUrl ? 12 : 0 }}>{imgEl}</div>}
            {textEl}
          </>
        )}
      </div>
    </div>
  );
}

export default ContentBlock;
