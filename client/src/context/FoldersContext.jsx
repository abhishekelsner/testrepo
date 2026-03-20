/**
 * Loads and mutates user-owned folders from GET/POST/PUT/DELETE /api/folders.
 * Replaces localStorage custom folders; proposal.folderId stays `custom-<folderMongoId>`.
 */
import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { get, post, put, del } from '../api/service';
import { ENDPOINTS } from '../api/endpoints';

const FoldersContext = createContext(null);

export function FoldersProvider({ children }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await get(ENDPOINTS.FOLDERS);
      setFolders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load folders');
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = useCallback(
    async (name) => {
      const { data } = await post(ENDPOINTS.FOLDERS, { name });
      await fetchFolders();
      return data;
    },
    [fetchFolders]
  );

  const updateFolder = useCallback(
    async (id, body) => {
      const { data } = await put(ENDPOINTS.FOLDER_BY_ID(id), body);
      await fetchFolders();
      return data;
    },
    [fetchFolders]
  );

  const deleteFolder = useCallback(
    async (id) => {
      await del(ENDPOINTS.FOLDER_BY_ID(id));
      await fetchFolders();
    },
    [fetchFolders]
  );

  const value = useMemo(
    () => ({
      folders,
      loading,
      error,
      refetch: fetchFolders,
      createFolder,
      updateFolder,
      deleteFolder,
    }),
    [folders, loading, error, fetchFolders, createFolder, updateFolder, deleteFolder]
  );

  return <FoldersContext.Provider value={value}>{children}</FoldersContext.Provider>;
}

export function useFolders() {
  const ctx = useContext(FoldersContext);
  if (!ctx) {
    throw new Error('useFolders must be used within FoldersProvider');
  }
  return ctx;
}
