/**
 * AgreementBlock — white card with two lines of text and a "View Agreement" CTA button.
 * On click, opens AgreementModal popup with full agreement content and Accept form.
 * In edit mode, "Edit agreement document" opens a popup to edit and save the org agreement template.
 */
import { useState, useEffect } from 'react';
import { Input, Button, Modal, message } from 'antd';
import { FileTextOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons';
import { useProposalView } from '../ProposalViewContext';
import { get, put, ENDPOINTS } from '../../../api';
import { getDefaultAgreementBody } from './agreementPrintHtml';
import './AgreementBlock.css';

const DEFAULT_LINE1 = "We're excited to move forward with your project.";
const DEFAULT_LINE2 = "Please review the agreement and sign to kickstart the work.";
const DEFAULT_BUTTON_LABEL = 'View Agreement';

function AgreementBlock({ block, onChange, readOnly }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [agreementTemplate, setAgreementTemplate] = useState('');
  const [editorBranding, setEditorBranding] = useState(null);
  const viewContext = useProposalView();
  const proposal = viewContext?.proposal ?? null;
  const line1 = block.content?.line1 ?? DEFAULT_LINE1;
  const line2 = block.content?.line2 ?? DEFAULT_LINE2;
  const buttonLabel = block.content?.buttonLabel ?? DEFAULT_BUTTON_LABEL;
  const buttonUrl = block.content?.buttonUrl ?? '';

  useEffect(() => {
    if (!editorOpen) return;
    setEditorLoading(true);
    get(ENDPOINTS.ORG_CURRENT)
      .then(({ data }) => {
        const branding = data.branding && typeof data.branding === 'object' ? data.branding : {};
        setEditorBranding(branding);
        const current = typeof branding.agreementTemplate === 'string' ? branding.agreementTemplate : '';
        setAgreementTemplate(current);
      })
      .catch(() => message.error('Failed to load agreement template.'))
      .finally(() => setEditorLoading(false));
  }, [editorOpen]);

  const handleSaveAgreementTemplate = () => {
    const branding = { ...(editorBranding || {}), agreementTemplate: agreementTemplate.trim() };
    setEditorSaving(true);
    put(ENDPOINTS.ORG_CURRENT, { branding })
      .then(() => {
        message.success('Agreement template saved.');
        setEditorOpen(false);
      })
      .catch(() => message.error('Failed to save agreement template.'))
      .finally(() => setEditorSaving(false));
  };

  const handleResetToDefault = () => {
    setAgreementTemplate(getDefaultAgreementBody());
    message.info('Reset to default agreement content. Click Save to apply.');
  };

  if (readOnly) {
    return (
      <div className="agreement-block agreement-block-readonly">
        <div className="agreement-block-card">
          <p className="agreement-block-line1">{line1}</p>
          <p className="agreement-block-line2">{line2}</p>
          <Button
            className="agreement-block-btn"
            onClick={() => viewContext?.openAgreementModal?.()}
          >
            {buttonLabel || DEFAULT_BUTTON_LABEL}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="agreement-block agreement-block-edit">
      <Input
        value={line1}
        onChange={(e) => onChange({ ...block, content: { ...block.content, line1: e.target.value } })}
        placeholder="First line of text"
        addonBefore="Line 1"
      />
      <Input
        value={line2}
        onChange={(e) => onChange({ ...block, content: { ...block.content, line2: e.target.value } })}
        placeholder="Second line of text"
        addonBefore="Line 2"
      />
      <Input
        value={buttonLabel}
        onChange={(e) => onChange({ ...block, content: { ...block.content, buttonLabel: e.target.value } })}
        placeholder="Button label"
        addonBefore={<FileTextOutlined />}
      />
      <Input
        value={buttonUrl}
        onChange={(e) => onChange({ ...block, content: { ...block.content, buttonUrl: e.target.value } })}
        placeholder="https://..."
        addonBefore={<LinkOutlined />}
      />
      <Button
        type="default"
        icon={<EditOutlined />}
        onClick={() => setEditorOpen(true)}
        className="agreement-block-edit-doc-btn"
      >
        Edit agreement document
      </Button>
      <div className="agreement-block-preview-wrap">
        <div className="agreement-block-card">
          <p className="agreement-block-line1">{line1 || 'First line'}</p>
          <p className="agreement-block-line2">{line2 || 'Second line'}</p>
          <Button className="agreement-block-btn" disabled>
            {buttonLabel || DEFAULT_BUTTON_LABEL}
          </Button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>Preview</div>
      </div>

      <Modal
        title="Edit agreement document"
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        width={900}
        destroyOnClose
        footer={[
          <Button key="reset" onClick={handleResetToDefault} disabled={editorLoading || editorSaving}>
            Reset to default
          </Button>,
          <Button key="cancel" onClick={() => setEditorOpen(false)} disabled={editorSaving}>
            Cancel
          </Button>,
          <Button key="save" type="primary" loading={editorSaving} onClick={handleSaveAgreementTemplate}>
            Save
          </Button>,
        ]}
      >
        {editorLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>
        ) : (
          <>
            <p style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>
              HTML content for the agreement shown in the View Agreement modal and in PDF. Leave empty to use the default template.
            </p>
            <Input.TextArea
              value={agreementTemplate}
              onChange={(e) => setAgreementTemplate(e.target.value)}
              placeholder="<h1>Agreement title</h1><section>...</section> Leave empty to use default."
              rows={18}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </>
        )}
      </Modal>
    </div>
  );
}

export default AgreementBlock;
