/**
 * RoiCalculatorBlock — custom ROI calculator.
 * content: {
 *   inputs: [{ id, label, value }],
 *   formula: string (e.g. "input0 * 12 - input1"),
 *   outputLabel: string
 * }
 * In editor mode: define inputs and formula.
 * In readOnly mode: client enters values, output is auto-calculated.
 */
import { useState, useEffect } from 'react';
import { Input, InputNumber, Button, Typography, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, CalculatorOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

function uid() {
  return `inp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Safely evaluate formula string with input values substituted.
 * Variables in formula: input0, input1, input2, ...
 */
function evalFormula(formula, inputs) {
  if (!formula) return null;
  try {
    let expr = formula;
    inputs.forEach((inp, i) => {
      expr = expr.replaceAll(`input${i}`, String(Number(inp.value) || 0));
    });
    // Allow only safe math characters
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${expr})`)();
  } catch {
    return null;
  }
}

function RoiCalculatorBlock({ block, onChange, readOnly }) {
  const inputs = block.content?.inputs || [];
  const formula = block.content?.formula || '';
  const outputLabel = block.content?.outputLabel || 'ROI';

  // Client-side live values for readOnly mode
  const [liveInputs, setLiveInputs] = useState(inputs.map((i) => ({ ...i })));

  useEffect(() => {
    setLiveInputs(inputs.map((i) => ({ ...i })));
  }, [block.id]);

  const result = readOnly ? evalFormula(formula, liveInputs) : evalFormula(formula, inputs);

  // ─── Editor mode ───────────────────────────────────────────────────────
  function addInput() {
    const newInp = { id: uid(), label: `Input ${inputs.length + 1}`, value: 0 };
    onChange({ ...block, content: { ...block.content, inputs: [...inputs, newInp] } });
  }

  function updateInput(id, key, value) {
    const updated = inputs.map((i) => (i.id === id ? { ...i, [key]: value } : i));
    onChange({ ...block, content: { ...block.content, inputs: updated } });
  }

  function removeInput(id) {
    const updated = inputs.filter((i) => i.id !== id);
    onChange({ ...block, content: { ...block.content, inputs: updated } });
  }

  if (!readOnly) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <CalculatorOutlined style={{ color: 'var(--primary-color)' }} />
          <Text strong style={{ fontSize: 13 }}>ROI Calculator</Text>
        </div>
        {inputs.map((inp, idx) => (
          <div key={inp.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12, width: 60 }}>{`input${idx}`}</Text>
            <Input
              value={inp.label}
              onChange={(e) => updateInput(inp.id, 'label', e.target.value)}
              placeholder="Input label"
              style={{ flex: 2 }}
            />
            <InputNumber
              value={inp.value}
              onChange={(v) => updateInput(inp.id, 'value', v)}
              placeholder="Default value"
              style={{ flex: 1 }}
            />
            <Button
              type="text" danger size="small" icon={<DeleteOutlined />}
              onClick={() => removeInput(inp.id)}
            />
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={addInput} style={{ width: '100%' }}>
          Add Input
        </Button>
        <Input
          value={formula}
          onChange={(e) => onChange({ ...block, content: { ...block.content, formula: e.target.value } })}
          placeholder="Formula e.g. input0 * 12 - input1"
          addonBefore="Formula"
          style={{ fontFamily: 'monospace' }}
        />
        <Input
          value={outputLabel}
          onChange={(e) => onChange({ ...block, content: { ...block.content, outputLabel: e.target.value } })}
          placeholder="Output label e.g. Annual Savings"
          addonBefore="Output Label"
        />
        {result !== null && (
          <div style={{ padding: '8px 12px', background: 'rgba(3,73,122,0.06)', borderRadius: 6 }}>
            <Text type="secondary">{outputLabel}: </Text>
            <Text strong style={{ fontSize: 16 }}>
              {typeof result === 'number' ? result.toLocaleString(undefined, { maximumFractionDigits: 2 }) : result}
            </Text>
          </div>
        )}
      </div>
    );
  }

  // ─── Read-only / client mode ─────────────────────────────────────────────
  const liveResult = evalFormula(formula, liveInputs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalculatorOutlined style={{ color: 'var(--primary-color)', fontSize: 18 }} />
        <Text strong style={{ fontSize: 15 }}>ROI Calculator</Text>
      </div>
      {liveInputs.map((inp) => (
        <div key={inp.id}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
            {inp.label}
          </label>
          <InputNumber
            value={inp.value}
            onChange={(v) =>
              setLiveInputs((prev) => prev.map((i) => (i.id === inp.id ? { ...i, value: v } : i)))
            }
            style={{ width: '100%' }}
          />
        </div>
      ))}
      {formula && (
        <>
          <Divider style={{ margin: '6px 0' }} />
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(3,73,122,0.06)',
              borderRadius: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Title level={5} style={{ margin: 0 }}>{outputLabel}</Title>
            <Title level={4} style={{ margin: 0, color: 'var(--primary-color)' }}>
              {liveResult !== null
                ? liveResult.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : '—'}
            </Title>
          </div>
        </>
      )}
    </div>
  );
}

export default RoiCalculatorBlock;
