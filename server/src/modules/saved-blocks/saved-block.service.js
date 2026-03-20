import SavedBlock from './saved-block.model.js';

/** List all saved blocks for a user (user-scoped, not org-scoped). */
export async function listSavedBlocks(userId, organizationId) {
  const blocks = await SavedBlock.find({ userId, organizationId })
    .sort({ savedAt: -1 })
    .lean();
  return blocks.map(format);
}

/** Create a saved block. */
export async function createSavedBlock(userId, organizationId, { name, type, content, background }) {
  const block = await SavedBlock.create({
    userId,
    organizationId,
    name,
    type,
    content: content || {},
    background: background || null,
    savedAt: new Date(),
  });
  return format(block.toObject());
}

/** Rename a saved block (only owner can update). */
export async function updateSavedBlock(userId, organizationId, id, { name }) {
  const block = await SavedBlock.findOne({ _id: id, userId, organizationId });
  if (!block) {
    const err = new Error('Saved block not found');
    err.status = 404;
    throw err;
  }
  if (name !== undefined) block.name = name;
  await block.save();
  return format(block.toObject());
}

/** Delete a saved block (only owner can delete). */
export async function deleteSavedBlock(userId, organizationId, id) {
  const result = await SavedBlock.deleteOne({ _id: id, userId, organizationId });
  if (result.deletedCount === 0) {
    const err = new Error('Saved block not found');
    err.status = 404;
    throw err;
  }
}

/** Format DB document to API response shape. */
function format(b) {
  return {
    id:        b._id.toString(),
    name:      b.name,
    type:      b.type,
    content:   b.content  || {},
    background: b.background || null,
    savedAt:   b.savedAt || b.createdAt,
  };
}
