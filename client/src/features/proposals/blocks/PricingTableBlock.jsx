/**
 * PricingTableBlock — free-form editable table with row/column add.
 * content: {
 *   rows: number,
 *   cols: number,
 *   headers: string[],     // column headers
 *   cells: string[][],     // [row][col]
 * }
 * Setup mode (no cells yet): user picks rows × cols.
 */
import { useState } from 'react';
import { Button, InputNumber, Typography, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

function emptyGrid(rows, cols) {
  const headers = Array.from({ length: cols }, (_, i) => `Column ${i + 1}`);
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
  return { headers, cells };
}

function PricingTableBlock({ block, onChange, readOnly }) {
  const content = block.content || {};
  const { headers = [], cells = [] } = content;
  const isSetup = !headers.length;

  const [setupRows, setSetupRows] = useState(3);
  const [setupCols, setSetupCols] = useState(3);

  function updateContent(partial) {
    onChange({ ...block, content: { ...content, ...partial } });
  }

  function handleSetup() {
    updateContent(emptyGrid(setupRows, setupCols));
  }

  function updateHeader(colIdx, val) {
    const newHeaders = headers.map((h, i) => (i === colIdx ? val : h));
    updateContent({ headers: newHeaders });
  }

  function updateCell(rowIdx, colIdx, val) {
    const newCells = cells.map((row, ri) =>
      ri === rowIdx ? row.map((c, ci) => (ci === colIdx ? val : c)) : row
    );
    updateContent({ cells: newCells });
  }

  function addRow() {
    const newRow = Array.from({ length: headers.length }, () => '');
    updateContent({ cells: [...cells, newRow] });
  }

  function addCol() {
    const newHeaders = [...headers, `Column ${headers.length + 1}`];
    const newCells = cells.map((row) => [...row, '']);
    updateContent({ headers: newHeaders, cells: newCells });
  }

  function deleteRow(rowIdx) {
    updateContent({ cells: cells.filter((_, i) => i !== rowIdx) });
  }

  function deleteCol(colIdx) {
    const newHeaders = headers.filter((_, i) => i !== colIdx);
    const newCells = cells.map((row) => row.filter((_, i) => i !== colIdx));
    updateContent({ headers: newHeaders, cells: newCells });
  }

  /* ── Setup screen ── */
  if (isSetup && !readOnly) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 15 }}>Set up your table</Text>
        <Space size={16} style={{ marginBottom: 20 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Rows</Text>
            <InputNumber min={1} max={20} value={setupRows} onChange={(v) => setSetupRows(v || 1)} style={{ width: 72 }} />
          </div>
          <div style={{ fontSize: 18, paddingTop: 20 }}>×</div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Columns</Text>
            <InputNumber min={1} max={10} value={setupCols} onChange={(v) => setSetupCols(v || 1)} style={{ width: 72 }} />
          </div>
        </Space>
        <br />
        <Button type="primary" onClick={handleSetup}>
          Create Table
        </Button>
      </div>
    );
  }

  if (isSetup && readOnly) {
    return <div style={{ color: '#8c8c8c', textAlign: 'center', padding: 24 }}>Table not configured</div>;
  }

  const cols = headers.length;

  /* ── Read-only view ── */
  if (readOnly) {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e8e8e8', fontWeight: 600, color: '#1a1a1a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 1 ? '#fafafa' : '#fff' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '9px 12px', borderBottom: '1px solid #f0f0f0', color: '#2c2c2c' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ── Editor view ── */
  return (
    <div>
      <div style={{ overflowX: 'auto', marginBottom: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              {headers.map((h, ci) => (
                <th key={ci} style={{ padding: 0, borderBottom: '2px solid #d9d9d9', minWidth: 100 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      value={h}
                      onChange={(e) => updateHeader(ci, e.target.value)}
                      style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 10px', fontWeight: 600, fontSize: 13, outline: 'none', minWidth: 60 }}
                      placeholder={`Col ${ci + 1}`}
                    />
                    {cols > 1 && (
                      <Popconfirm title="Delete column?" onConfirm={() => deleteCol(ci)} okText="Delete" okButtonProps={{ danger: true }}>
                        <button style={{ padding: '4px 6px', border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: 11 }}>✕</button>
                      </Popconfirm>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ width: 32, padding: 0 }} />
            </tr>
          </thead>
          <tbody>
            {cells.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 1 ? '#fafafa' : '#fff' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: 0, borderBottom: '1px solid #f0f0f0' }}>
                    <input
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      style={{ width: '100%', border: 'none', background: 'transparent', padding: '8px 10px', fontSize: 13, outline: 'none' }}
                      placeholder="—"
                    />
                  </td>
                ))}
                <td style={{ padding: '0 4px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
                  {cells.length > 1 && (
                    <Popconfirm title="Delete row?" onConfirm={() => deleteRow(ri)} okText="Delete" okButtonProps={{ danger: true }}>
                      <button style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: 11 }}>✕</button>
                    </Popconfirm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Space size={8}>
        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addRow}>Add Row</Button>
        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addCol}>Add Column</Button>
      </Space>
    </div>
  );
}

export default PricingTableBlock;
