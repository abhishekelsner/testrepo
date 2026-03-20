import { createContext, useContext } from 'react';

export const ProposalViewContext = createContext(null);

export function useProposalView() {
  return useContext(ProposalViewContext);
}

/** Ref for PDF export to capture the visible page (used when downloading agreement + page as PDF). */
export function usePageCaptureRef() {
  const ctx = useProposalView();
  return ctx?.pageCaptureRef ?? null;
}

/** Viewer email (recipient) and status for agreement: allowed to accept, already accepted. */
export function useViewerAgreementStatus() {
  const ctx = useProposalView();
  return {
    viewerEmail: ctx?.viewerEmail ?? '',
    viewerStatus: ctx?.viewerStatus ?? null,
    setViewerEmail: ctx?.setViewerEmail,
    refetchViewerStatus: ctx?.refetchViewerStatus,
    onAgreementAccepted: ctx?.onAgreementAccepted,
  };
}
