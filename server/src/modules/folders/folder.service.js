import mongoose from 'mongoose';
import Folder from './folder.model.js';
import Proposal from '../proposals/proposal.model.js';

function format(folder) {
  return {
    id: folder._id.toString(),
    name: folder.name,
    userId: folder.userId?.toString(),
    organizationId: folder.organizationId?.toString(),
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

/**
 * List folders for the authenticated user (same org as JWT).
 */
export async function listFolders(organizationId, userId) {
  const list = await Folder.find({ organizationId, userId })
    .sort({ name: 1 })
    .lean();
  return list.map((f) => format(f));
}

/**
 * Create folder — name unique per user per org.
 */
export async function createFolder(organizationId, userId, rawName) {
  const name = (rawName || '').trim();
  if (!name) {
    const err = new Error('Folder name is required');
    err.status = 400;
    throw err;
  }
  try {
    const folder = await Folder.create({
      name,
      userId,
      organizationId,
    });
    return format(folder.toObject());
  } catch (e) {
    if (e.code === 11000) {
      const err = new Error('A folder with this name already exists');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

async function getOwnedFolder(organizationId, userId, folderId) {
  if (!mongoose.Types.ObjectId.isValid(folderId)) return null;
  return Folder.findOne({
    _id: folderId,
    organizationId,
    userId,
  }).lean();
}

/**
 * Rename folder — owner only.
 */
export async function updateFolder(organizationId, userId, folderId, { name: rawName }) {
  const folder = await getOwnedFolder(organizationId, userId, folderId);
  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    throw err;
  }
  const name = (rawName !== undefined ? String(rawName) : folder.name).trim();
  if (!name) {
    const err = new Error('Folder name is required');
    err.status = 400;
    throw err;
  }
  try {
    const updated = await Folder.findOneAndUpdate(
      { _id: folderId, organizationId, userId },
      { $set: { name } },
      { new: true }
    ).lean();
    return format(updated);
  } catch (e) {
    if (e.code === 11000) {
      const err = new Error('A folder with this name already exists');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

/**
 * Delete folder — owner only. Proposals in this folder move to default (pages).
 */
export async function deleteFolder(organizationId, userId, folderId) {
  const folder = await getOwnedFolder(organizationId, userId, folderId);
  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    throw err;
  }
  const key = `custom-${folderId}`;
  await Proposal.updateMany(
    { organizationId, folderId: key },
    { $set: { folderId: null } }
  );
  await Folder.deleteOne({ _id: folderId, organizationId, userId });
  return { deleted: true, id: folderId };
}

/**
 * Resolve custom-* folder key: returns folder doc if user owns it, else null.
 */
export async function assertFolderOwnedByUser(organizationId, userId, folderKey) {
  if (folderKey == null || folderKey === '' || folderKey === 'pages') return true;
  if (typeof folderKey !== 'string' || !folderKey.startsWith('custom-')) {
    const err = new Error('Invalid folder');
    err.status = 400;
    throw err;
  }
  const id = folderKey.slice('custom-'.length);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid folder');
    err.status = 400;
    throw err;
  }
  const folder = await getOwnedFolder(organizationId, userId, id);
  if (!folder) {
    const err = new Error('Folder not found or access denied');
    err.status = 403;
    throw err;
  }
  return true;
}
