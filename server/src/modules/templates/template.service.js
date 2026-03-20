import Template from './template.model.js';

/**
 * List templates for the current user only (same org + createdBy = userId).
 */
export async function listTemplates(organizationId, userId, { type, folderId } = {}) {
  if (!organizationId || !userId) {
    const err = new Error('Organization and user context required');
    err.status = 403;
    throw err;
  }
  const query = { organizationId, createdBy: userId };
  if (type) query.type = type;
  if (folderId) query.folderId = folderId;
  const templates = await Template.find(query).sort({ createdAt: -1 }).lean();
  return templates.map(format);
}

/**
 * Create a new template (owned by the given user).
 */
export async function createTemplate(organizationId, userId, { name, type = 'proposal', blocks = [], variables = {}, folderId }) {
  if (!organizationId || !userId) {
    const err = new Error('Organization and user context required');
    err.status = 403;
    throw err;
  }
  const template = await Template.create({
    organizationId,
    createdBy: userId,
    name,
    type,
    blocks,
    variables,
    folderId: folderId || null,
  });
  return format(template.toObject());
}

/**
 * Get a single template by id. Only the owner can access.
 */
export async function getTemplate(organizationId, userId, templateId) {
  const template = await Template.findOne({ _id: templateId, organizationId, createdBy: userId }).lean();
  if (!template) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }
  return format(template);
}

/**
 * Update a template. Only the owner can update.
 */
export async function updateTemplate(organizationId, userId, templateId, updates) {
  const template = await Template.findOne({ _id: templateId, organizationId, createdBy: userId });
  if (!template) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }
  const allowed = ['name', 'blocks', 'variables', 'folderId'];
  allowed.forEach((key) => {
    if (updates[key] !== undefined) template[key] = updates[key];
  });
  if (updates.blocks !== undefined) template.markModified('blocks');
  if (updates.variables !== undefined) template.markModified('variables');
  await template.save();
  return format(template.toObject());
}

/**
 * Delete a template by id. Only the owner can delete.
 */
export async function deleteTemplate(organizationId, userId, templateId) {
  const result = await Template.deleteOne({ _id: templateId, organizationId, createdBy: userId });
  if (result.deletedCount === 0) {
    const err = new Error('Template not found');
    err.status = 404;
    throw err;
  }
}

/** Format output (rename _id → id). */
function format(t) {
  return {
    id: t._id.toString(),
    organizationId: t.organizationId?.toString(),
    createdBy: t.createdBy?.toString() ?? null,
    name: t.name,
    type: t.type,
    blocks: t.blocks || [],
    variables: t.variables || {},
    folderId: t.folderId?.toString() || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
