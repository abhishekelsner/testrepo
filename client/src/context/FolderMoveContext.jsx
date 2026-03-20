/**
 * FolderMoveContext — provides moveProposalToFolder(proposalId, targetFolderKey) for drag-and-drop.
 * Calls API to update proposal's folderId, then dispatches 'proposal-moved' so Dashboard can update UI.
 */
import { createContext, useContext, useCallback } from 'react';
import { message } from 'antd';
import { put } from '../api/service';
import { ENDPOINTS } from '../api/endpoints';

const FolderMoveContext = createContext(null);

const PROPOSAL_MOVED_EVENT = 'proposal-moved';

/** Dispatch custom event so Dashboard can remove/add proposal without prop drilling */
function dispatchProposalMoved({ proposalId, fromFolderKey, toFolderKey }) {
  window.dispatchEvent(
    new CustomEvent(PROPOSAL_MOVED_EVENT, { detail: { proposalId, fromFolderKey, toFolderKey } })
  );
}

export function FolderMoveProvider({ children }) {
  const moveProposalToFolder = useCallback(async (proposalId, targetFolderKey) => {
    await put(ENDPOINTS.PROPOSAL_BY_ID(proposalId), { folderId: targetFolderKey });
    // We don't have fromFolderKey here; caller (sidebar drop) can pass it via a second call or we emit with from=unknown.
    // Actually the drop handler in AppLayout will have sourceFolderKey from drag data. So we need to emit from the drop handler, not from here. So moveProposalToFolder should accept (proposalId, targetFolderKey, sourceFolderKey) and emit after success.
    return true;
  }, []);

  const moveProposalToFolderAndNotify = useCallback(
    async (proposalId, targetFolderKey, sourceFolderKey) => {
      try {
        await put(ENDPOINTS.PROPOSAL_BY_ID(proposalId), { folderId: targetFolderKey });
        dispatchProposalMoved({ proposalId, fromFolderKey: sourceFolderKey, toFolderKey: targetFolderKey });
      } catch (err) {
        message.error(err?.response?.data?.error || 'Failed to move page');
        throw err;
      }
    },
    []
  );

  return (
    <FolderMoveContext.Provider value={{ moveProposalToFolder: moveProposalToFolderAndNotify }}>
      {children}
    </FolderMoveContext.Provider>
  );
}

export function useFolderMove() {
  const ctx = useContext(FolderMoveContext);
  return ctx || { moveProposalToFolder: async () => {} };
}

/** Event name for Dashboard to subscribe */
export { PROPOSAL_MOVED_EVENT };
