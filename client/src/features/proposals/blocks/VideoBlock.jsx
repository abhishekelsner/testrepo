/**
 * VideoBlock — embed video (YouTube, Vimeo, etc.) via URL.
 * content: { url: string, provider: string }
 */
import { Input, Typography } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';

const { Text } = Typography;

/** Convert a YouTube/Vimeo watch URL to an embed URL. */
function toEmbedUrl(url) {
  if (!url) return '';
  // YouTube: https://www.youtube.com/watch?v=ID or https://youtu.be/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo: https://vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Return as-is (may already be an embed URL)
  return url;
}

function VideoBlock({ block, onChange, readOnly }) {
  const url = block.content?.url || '';
  const provider = block.content?.provider || '';
  const embedUrl = toEmbedUrl(url);

  if (readOnly) {
    return embedUrl ? (
      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 6, overflow: 'hidden' }}>
        <iframe
          src={embedUrl}
          title="Video embed"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    ) : (
      <div style={placeholderStyle}>
        <VideoCameraOutlined style={{ fontSize: 32, color: 'var(--bg-gray-shade5)' }} />
        <Text type="secondary">No video added yet</Text>
        <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Switch to Edit and paste a YouTube or Vimeo URL</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {embedUrl && (
        <div style={{ position: 'relative', paddingTop: '40%', borderRadius: 6, overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            title="Video embed preview"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      )}
      {!embedUrl && (
        <div style={placeholderStyle}>
          <VideoCameraOutlined style={{ fontSize: 32, color: 'var(--bg-gray-shade5)' }} />
        </div>
      )}
      <Input
        value={url}
        onChange={(e) => {
          const newUrl = e.target.value;
          let detected = provider;
          if (!detected) {
            if (/youtube|youtu\.be/.test(newUrl)) detected = 'youtube';
            else if (/vimeo/.test(newUrl)) detected = 'vimeo';
          }
          onChange({ ...block, content: { ...block.content, url: newUrl, provider: detected } });
        }}
        placeholder="Video URL (YouTube, Vimeo, or embed URL)"
        prefix={<VideoCameraOutlined />}
      />
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

export default VideoBlock;
