/**
 * HeadingBlock — H1 / H2 / H3.
 * content: { level: 1|2|3, text: string }
 */
import { Input, Select } from 'antd';

const levelStyles = {
  1: { fontSize: 32, fontWeight: 700 },
  2: { fontSize: 24, fontWeight: 600 },
  3: { fontSize: 18, fontWeight: 600 },
};

function HeadingBlock({ block, onChange, readOnly, variables, textColor }) {
  const level = block.content?.level || 1;
  const text = block.content?.text || '';

  function renderText(t, hideMissingVars = false) {
    return t.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const val = variables?.[key.trim()];
      if (val !== undefined && val !== null && val !== '') return val;
      return hideMissingVars ? '' : `{{${key}}}`;
    });
  }

  if (readOnly) {
    const Tag = `h${level}`;
    return (
      <Tag style={{ ...levelStyles[level], margin: 0, ...(textColor ? { color: textColor } : {}) }}>
        {renderText(text, true)}
      </Tag>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Select
        size="small"
        value={level}
        onChange={(val) => onChange({ ...block, content: { ...block.content, level: val } })}
        style={{ width: 64 }}
        options={[
          { value: 1, label: 'H1' },
          { value: 2, label: 'H2' },
          { value: 3, label: 'H3' },
        ]}
      />
      <Input
        value={text}
        onChange={(e) => onChange({ ...block, content: { ...block.content, text: e.target.value } })}
        placeholder="Heading text… Use {{Variable}}"
        bordered={false}
        style={{ ...levelStyles[level], padding: 0, flex: 1, ...(textColor ? { color: textColor } : {}) }}
      />
    </div>
  );
}

export default HeadingBlock;
