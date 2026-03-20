/**
 * ColumnsBlock — 2–3 column layout; each column holds nested blocks or text.
 * content: { columns: [{ id, blocks: [] }] }
 */
import { Row, Col, Button, Typography, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

function uid() {
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function ColumnsBlock({ block, onChange, readOnly, variables }) {
  const columns = block.content?.columns || [
    { id: uid(), text: '' },
    { id: uid(), text: '' },
  ];

  function renderText(text) {
    if (!text) return '';
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => variables?.[key.trim()] ?? `{{${key}}}`);
  }

  function updateCol(colId, text) {
    const updated = columns.map((c) => (c.id === colId ? { ...c, text } : c));
    onChange({ ...block, content: { ...block.content, columns: updated } });
  }

  function addColumn() {
    if (columns.length >= 3) return;
    onChange({ ...block, content: { ...block.content, columns: [...columns, { id: uid(), text: '' }] } });
  }

  function removeColumn(colId) {
    if (columns.length <= 2) return;
    const updated = columns.filter((c) => c.id !== colId);
    onChange({ ...block, content: { ...block.content, columns: updated } });
  }

  const span = columns.length === 2 ? 12 : 8;

  if (readOnly) {
    return (
      <Row gutter={[16, 16]}>
        {columns.map((col) => (
          <Col key={col.id} span={span} xs={24} sm={span}>
            <div style={{ padding: '8px 0', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {renderText(col.text || '')}
            </div>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {columns.length}-column layout
        </Text>
        {columns.length < 3 && (
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addColumn}>
            Add Column
          </Button>
        )}
      </div>
      <Row gutter={[12, 12]}>
        {columns.map((col) => (
          <Col key={col.id} span={span} xs={24} sm={span}>
            <div style={{ position: 'relative' }}>
              <TextArea
                value={col.text || ''}
                onChange={(e) => updateCol(col.id, e.target.value)}
                placeholder="Column text… Use {{Variable}}"
                autoSize={{ minRows: 3 }}
                style={{ resize: 'none' }}
              />
              {columns.length > 2 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeColumn(col.id)}
                  style={{ position: 'absolute', top: 4, right: 4 }}
                />
              )}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default ColumnsBlock;
