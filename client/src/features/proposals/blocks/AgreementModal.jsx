/**
 * AgreementModal — popup when "View Agreement" is clicked.
 * Shows full agreement content (scrollable) and Accept form at the bottom.
 * In public view: only sentTo recipients can accept; on Agree POSTs to API and notifies creator + accepter.
 */
import { useState } from 'react';
import { Modal, Button, Input, Checkbox, message } from 'antd';
import { DownloadOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { post, ENDPOINTS } from '../../../api';
import AgreementModalContent from './AgreementModalContent';
import SignaturePad from './SignaturePad';
import SendForSignatureModal from '../../../components/SendForSignatureModal';
import { getAgreementPrintHtml } from './agreementPrintHtml';
import { exportAgreementToPdf } from './agreementPdfExport';
import './AgreementModal.css';

export default function AgreementModal({
  open,
  onClose,
  proposal = null,
  slugOrId = '',
  byId = false,
  onAgreementAccepted,
  acceptedAndLocked = false,
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [signatureChecked, setSignatureChecked] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [signaturePadOpen, setSignaturePadOpen] = useState(false);
  const [zohoSignOpen, setZohoSignOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  const isPublicFlow = !!(slugOrId && onAgreementAccepted);

  const clientData = agreed || fullName.trim() || email.trim()
    ? { fullName: fullName.trim(), email: email.trim(), organization: organization.trim(), signatureDataUrl }
    : null;

  const handleDownloadPdf = async () => {
    // PDF contains only the agreement (and "Accepted by" section when filled) — no proposal content
    const html = getAgreementPrintHtml(clientData, proposal, { forPdf: true });
    setPdfDownloading(true);
    try {
      const name = proposal?.title
        ? `Proposal-and-Agreement-${proposal.title.replace(/[^a-z0-9-_]/gi, '-').slice(0, 40)}.pdf`
        : 'Proposal-and-Agreement.pdf';
      await exportAgreementToPdf(html, name, { agreementOnly: true });
      message.success('PDF downloaded.');
    } catch (e) {
      message.error(e?.message || 'Failed to generate PDF.');
    } finally {
      setPdfDownloading(false);
    }
  };

  const formValid = fullName.trim() && email.trim() && signatureChecked && signatureDataUrl;
  const canAgree = formValid;

  async function handleAgreeClick() {
    if (!canAgree || agreed) return;
    if (isPublicFlow) {
      setAcceptSubmitting(true);
      try {
        await post(ENDPOINTS.PUBLIC_ACCEPT_AGREEMENT(slugOrId, byId), {
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          organization: organization.trim(),
          signatureDataUrl: signatureDataUrl || '',
        });
        setAgreed(true);
        onAgreementAccepted?.(email.trim().toLowerCase(), fullName.trim());
        message.success('Agreement accepted. You will receive a confirmation email.');
        onClose();
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Failed to accept agreement.';
        message.error(msg);
      } finally {
        setAcceptSubmitting(false);
      }
    } else {
      setAgreed(true);
    }
  }

  function handleClose() {
    onClose();
  }

  function handleAfterClose() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.width = '';
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      afterClose={handleAfterClose}
      footer={null}
      width={1400}
      className="agreement-modal"
      closable={false}
      destroyOnHidden
    >
      <div className="agreement-modal-header">
        <h1 className="agreement-modal-title">Non-Disclosure Agreement</h1>
        <div className="agreement-modal-actions">
          <Button type="text" icon={<DownloadOutlined />} onClick={handleDownloadPdf} loading={pdfDownloading} disabled={pdfDownloading}>
            Download PDF
          </Button>
          {!acceptedAndLocked && (
            <Button
              type="primary"
              className="agreement-modal-agree-header"
              disabled={!canAgree || agreed || acceptSubmitting}
              loading={acceptSubmitting}
              onClick={handleAgreeClick}
            >
              Agree
            </Button>
          )}
          <Button type="text" icon={<CloseOutlined />} onClick={handleClose} className="agreement-modal-close" />
        </div>
      </div>

      <div className="agreement-modal-body">
        <AgreementModalContent agreementContent={proposal?.agreementTemplate} />

        {!acceptedAndLocked && (
        <section className="agreement-modal-accept">
          {agreed ? (
            <div className="agreement-modal-agreed">
              <h2 className="agreement-modal-h2">Accepted by</h2>
              <div className="agreement-modal-client-details">
                <p><strong>Name:</strong> {fullName || '—'}</p>
                <p><strong>Email:</strong> {email || '—'}</p>
                {organization && <p><strong>Organization:</strong> {organization}</p>}
                {signatureDataUrl && (
                  <p className="agreement-modal-signature-display">
                    <strong>Signature:</strong>
                    <img src={signatureDataUrl} alt="Your signature" />
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="agreement-modal-accept-intro">To accept this document, fill out the form and click the button below.</p>
              <div className="agreement-modal-form">
                <div className="agreement-modal-field">
                  <label>Name</label>
                  <Input
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={agreed}
                  />
                </div>
                <div className="agreement-modal-field">
                  <label>Email</label>
                  <Input
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={agreed}
                  />
                  {isPublicFlow && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                      Use the same email this proposal was sent to. Only that recipient can accept.
                    </p>
                  )}
                </div>
                <div className="agreement-modal-field">
                  <label>Organization (optional)</label>
                  <Input
                    placeholder="Organization name"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    disabled={agreed}
                  />
                </div>
                <div className="agreement-modal-field">
                  <label>E-signature</label>
                  <div className="agreement-modal-sign-actions">
                    <Button
                      size="large"
                      className="agreement-modal-sign-btn"
                      onClick={() => setSignaturePadOpen(true)}
                      disabled={agreed}
                    >
                      Sign
                    </Button>
                    {/* <Button
                      size="large"
                      type="default"
                      icon={<SendOutlined />}
                      onClick={() => setZohoSignOpen(true)}
                      disabled={agreed}
                      className="agreement-modal-zoho-btn"
                    >
                      Zoho Sign
                    </Button> */}
                  </div>
                  {signatureDataUrl && (
                    <div className="agreement-modal-signature-preview">
                      <img src={signatureDataUrl} alt="Signature" />
                      <span className="agreement-modal-signature-hint">Click Sign again to replace.</span>
                    </div>
                  )}
                  <div className="agreement-modal-checkbox-row">
                    <Checkbox
                      checked={signatureChecked}
                      onChange={(e) => setSignatureChecked(e.target.checked)}
                      disabled={agreed}
                    >
                      I agree that my electronic signature is as valid and legally binding as a handwritten signature.
                    </Checkbox>
                  </div>
                </div>
                <Button
                  type="primary"
                  size="large"
                  className="agreement-modal-agree-btn"
                  disabled={!canAgree}
                  loading={acceptSubmitting}
                  onClick={handleAgreeClick}
                >
                  Agree
                </Button>
              </div>
            </>
          )}
        </section>
        )}
      </div>

      <SignaturePad
        open={signaturePadOpen}
        onSave={(dataUrl) => {
          setSignatureDataUrl(dataUrl);
          setSignaturePadOpen(false);
        }}
        onDiscard={() => setSignaturePadOpen(false)}
      />
      <SendForSignatureModal
        open={zohoSignOpen}
        onClose={() => setZohoSignOpen(false)}
        requestName={proposal?.title ? `Agreement – ${proposal.title}` : 'Agreement for signature'}
        proposalId={proposal?.id}
      />
    </Modal>
  );
}
