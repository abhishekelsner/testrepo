/**
 * Full agreement document content for AgreementModal.
 * Rendered inside scrollable modal body.
 * When agreementContent (HTML string) is provided (e.g. from org.agreementTemplate), it is rendered;
 * otherwise the default agreement body is used.
 */
import React from 'react';
import { getDefaultAgreementBody } from './agreementPrintHtml';

export default function AgreementModalContent({ agreementContent }) {
  const html =
    typeof agreementContent === 'string' && agreementContent.trim() !== ''
      ? agreementContent.trim()
      : getDefaultAgreementBody();

  return (
    <div
      className="agreement-modal-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
