import mongoose from 'mongoose';
import Proposal from './proposal.model.js';
import Organization from '../organizations/organization.model.js';
import User from '../users/user.model.js';
import * as analyticsService from '../analytics/analytics.service.js';
import Template from '../templates/template.model.js';
import Payment from '../payments/payment.model.js';
import { sendMail, WEB_ORIGIN } from '../../config/email.js';
import { assertFolderOwnedByUser } from '../folders/folder.service.js';
import { encodeUrlOpaque } from '../../utils/urlQueryOpaque.js';

/**
 * Simple HTML sanitizer — strips <script>, event handlers, and javascript: URIs.
 * Used on save to prevent XSS from HTML embed blocks.
 */
function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/**
 * Sanitize all HTML embed blocks in a blocks array.
 */
function sanitizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) => {
    if (block.type === 'html' && block.content?.html) {
      return { ...block, content: { ...block.content, html: sanitizeHtml(block.content.html) } };
    }
    // Recursively sanitize columns nested blocks
    if (block.type === 'columns' && Array.isArray(block.content?.columns)) {
      return {
        ...block,
        content: {
          ...block.content,
          columns: block.content.columns.map((col) => ({
            ...col,
            blocks: sanitizeBlocks(col.blocks || []),
          })),
        },
      };
    }
    return block;
  });
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCollaborators(list, creatorEmail) {
  const creator = normalizeEmail(creatorEmail);
  return Array.from(
    new Set(
      (Array.isArray(list) ? list : [])
        .map((e) => normalizeEmail(e))
        .filter((e) => e && e !== creator)
    )
  );
}

function isOrgWideRole(role) {
  return ['Admin', 'Super_Admin', 'Owner'].includes(role);
}

function canAccessProposal(proposal, { userId, role, email }) {
  if (!proposal) return false;
  if (isOrgWideRole(role)) return true;
  if (proposal.createdBy?.toString() === String(userId || '')) return true;
  const me = normalizeEmail(email);
  if (!me) return false;
  return Array.isArray(proposal.collaborators)
    && proposal.collaborators.some((e) => normalizeEmail(e) === me);
}

function assertProposalAccess(proposal, actor) {
  if (canAccessProposal(proposal, actor)) return;
  const err = new Error('You do not have access to this proposal');
  err.status = 403;
  throw err;
}

/**
 * Generate a unique slug for public sharing.
 */
async function generateSlug(title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'proposal';
  const suffix = () => Math.random().toString(36).slice(2, 8);
  let slug = `${base}-${suffix()}`;
  // Ensure uniqueness
  while (await Proposal.exists({ slug })) {
    slug = `${base}-${suffix()}`;
  }
  return slug;
}

/** Format proposal output (rename _id → id). */
function format(p, options = {}) {
  const out = {
    id: p._id.toString(),
    organizationId: p.organizationId?.toString(),
    createdBy: p.createdBy?.toString(),
    createdByName: typeof p.createdBy === 'object' ? p.createdBy?.name || '' : '',
    createdByEmail: typeof p.createdBy === 'object' ? p.createdBy?.email || '' : '',
    title: p.title,
    status: p.status,
    starred: !!p.starred,
    tags: Array.isArray(p.tags) ? p.tags : [],
    engagement: Array.isArray(p.engagement) ? p.engagement : [],
    slug: p.slug || null,
    blocks: p.blocks || [],
    variables: p.variables || {},
    templateId: p.templateId?.toString() || null,
    cloneFromId: p.cloneFromId?.toString() || null,
    folderId: p.folderId ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    collaborators: normalizeCollaborators(p.collaborators, ''),
  };
  if (p.sentTo && Array.isArray(p.sentTo) && (options.includeSentTo !== false)) {
    out.sentTo = p.sentTo.map((e) => ({ email: e.email, sentAt: e.sentAt }));
  }
  return out;
}

/**
 * List proposals for an org. Optionally filter by folderId.
 * folderId: 'pages' or null = default folder (null/missing in DB); 'custom-<id>' = custom folder (must be owned by userId).
 * Attaches paymentSummary when payments exist; attaches engagementLevel (unmonitored | low | medium | high).
 */
export async function listProposals(organizationId, { folderId, userId, role, email } = {}) {
  const query = {
    organizationId,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
  let accessClause = null;
  if (!isOrgWideRole(role)) {
    const me = normalizeEmail(email);
    accessClause = {
      $or: [
        { createdBy: userId },
        ...(me ? [{ collaborators: me }] : []),
      ],
    };
  }
  if (folderId != null && folderId !== '') {
    if (folderId === 'pages') {
      query.$and = [
        { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
        { $or: [{ folderId: null }, { folderId: { $exists: false } }, { folderId: 'pages' }] },
      ];
      delete query.$or;
    } else {
      if (folderId.startsWith('custom-')) {
        if (!userId) {
          const err = new Error('Authentication required');
          err.status = 401;
          throw err;
        }
        await assertFolderOwnedByUser(organizationId, userId, folderId);
      }
      query.folderId = folderId;
    }
  }
  if (accessClause) {
    query.$and = [...(Array.isArray(query.$and) ? query.$and : []), accessClause];
  }
  const proposals = await Proposal.find(query)
    .sort({ updatedAt: -1 })
    .populate('createdBy', 'name email')
    .populate('templateId', 'name')
    .lean();

  const proposalIds = proposals.map((p) => p._id.toString());
  const engagementMetrics = await analyticsService.getEngagementMetricsForProposals(organizationId, proposalIds).catch(() => ({}));

  const summaries = await Payment.aggregate([
    { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), status: 'paid' } },
    { $group: { _id: '$proposalId', totalPaidCents: { $sum: '$amount' }, paymentCount: { $sum: 1 }, lastPaidAt: { $max: '$paidAt' } } },
  ]).then((list) => list.reduce((acc, s) => { acc[s._id.toString()] = s; return acc; }, {}));

  return proposals.map((p) => {
    const out = format(p);
    out.templateName = p.templateId?.name || 'proposal';
    const s = summaries[p._id.toString()];
    if (s) {
      out.paymentSummary = {
        totalPaidCents: s.totalPaidCents,
        totalPaidFormatted: `$${(s.totalPaidCents / 100).toFixed(2)}`,
        paymentCount: s.paymentCount,
        lastPaidAt: s.lastPaidAt,
      };
    } else {
      out.paymentSummary = null;
    }
    const em = engagementMetrics[p._id.toString()];
    out.engagementLevel = em?.engagementLevel || 'unmonitored';
    out.viewCount = em?.viewCount ?? 0;
    out.clickCount = em?.clickCount ?? 0;
    out.lastViewedAt = em?.lastViewedAt ? new Date(em.lastViewedAt).toISOString() : null;
    return out;
  });
}

/**
 * List proposals shared with a user email across organizations.
 * Shared access is granted through proposal.collaborators.
 */
export async function listSharedWithMe(userEmail) {
  const email = normalizeEmail(userEmail);
  if (!email) return [];
  const proposals = await Proposal.find({
    collaborators: email,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .sort({ updatedAt: -1 })
    .populate('createdBy', 'name email')
    .populate('organizationId', 'name slug')
    .lean();

  return proposals.map((p) => {
    const out = format(p);
    out.organizationName = typeof p.organizationId === 'object' ? p.organizationId?.name || '' : '';
    out.organizationSlug = typeof p.organizationId === 'object' ? p.organizationId?.slug || '' : '';
    return out;
  });
}

/**
 * Create a new proposal.
 * - If templateId provided: copy blocks/variables from the template.
 * - If cloneFromId provided: copy blocks/variables from another proposal.
 */
export async function createProposal(organizationId, userId, { title, templateId, cloneFromId, folderId } = {}) {
  let resolvedFolderId = folderId;
  if (resolvedFolderId === 'pages' || resolvedFolderId === '') resolvedFolderId = null;
  if (resolvedFolderId != null) {
    await assertFolderOwnedByUser(organizationId, userId, resolvedFolderId);
  }

  let blocks = [];
  let variables = {};

  if (templateId) {
    const tmpl = await Template.findOne({ _id: templateId, organizationId, createdBy: userId }).lean();
    if (tmpl) {
      blocks = tmpl.blocks || [];
      variables = tmpl.variables || {};
    }
  } else if (cloneFromId) {
    const source = await Proposal.findOne({ _id: cloneFromId, organizationId }).lean();
    if (source) {
      blocks = source.blocks || [];
      variables = source.variables || {};
    }
  }

  const proposal = await Proposal.create({
    organizationId,
    createdBy: userId,
    title: title || 'Untitled Proposal',
    blocks,
    variables,
    templateId: templateId || null,
    cloneFromId: cloneFromId || null,
    folderId: resolvedFolderId || null,
  });
  return format(proposal.toObject());
}

/**
 * Get a single proposal by id, scoped to org. Includes paymentSummary if any payments.
 */
export async function getProposal(organizationId, proposalId, actor = {}) {
  let proposal = await Proposal.findOne({ _id: proposalId, organizationId }).lean();
  if (!proposal && actor?.email) {
    // Collaborator can open shared proposal by id even when it belongs to another org.
    proposal = await Proposal.findOne({
      _id: proposalId,
      collaborators: normalizeEmail(actor.email),
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }).lean();
  }
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  assertProposalAccess(proposal, actor);
  const out = format(proposal);
  const paid = await Payment.aggregate([
    { $match: { proposalId: new mongoose.Types.ObjectId(proposalId), organizationId: new mongoose.Types.ObjectId(organizationId), status: 'paid' } },
    { $group: { _id: null, totalPaidCents: { $sum: '$amount' }, paymentCount: { $sum: 1 }, lastPaidAt: { $max: '$paidAt' } } },
  ]).then((r) => r[0]);
  if (paid) {
    out.paymentSummary = {
      totalPaidCents: paid.totalPaidCents,
      totalPaidFormatted: `$${(paid.totalPaidCents / 100).toFixed(2)}`,
      paymentCount: paid.paymentCount,
      lastPaidAt: paid.lastPaidAt,
    };
  } else {
    out.paymentSummary = null;
  }
  return out;
}

/**
 * Get a published proposal by slug (public, no auth).
 * Returns 404 if not found or not published. Do not include sentTo in public response.
 */
export async function getProposalBySlug(slug) {
  const proposal = await Proposal.findOne({
    slug: (slug || '').toLowerCase().trim(),
    status: 'published',
  }).lean();
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  const out = format(proposal, { includeSentTo: false });
  const org = await Organization.findById(proposal.organizationId).select('branding').lean();
  out.agreementTemplate = org?.branding?.agreementTemplate ?? '';
  out.agreementAccepted = Array.isArray(proposal.agreementAcceptances) && proposal.agreementAcceptances.length > 0;
  return out;
}

/**
 * Get a published proposal by id (public, no auth).
 * Same as getProposalBySlug but lookup by _id. Used for /view/?id=xxx.
 */
export async function getProposalByIdForPublic(proposalId) {
  if (!proposalId || !mongoose.Types.ObjectId.isValid(proposalId)) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  const proposal = await Proposal.findOne({
    _id: proposalId,
    status: 'published',
  }).lean();
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  const out = format(proposal, { includeSentTo: false });
  const org = await Organization.findById(proposal.organizationId).select('branding').lean();
  out.agreementTemplate = org?.branding?.agreementTemplate ?? '';
  out.agreementAccepted = Array.isArray(proposal.agreementAcceptances) && proposal.agreementAcceptances.length > 0;
  return out;
}

/**
 * Update a proposal's title, blocks, or variables.
 * Sanitizes HTML blocks on save.
 */
export async function updateProposal(organizationId, userId, proposalId, updates) {
  let proposal = await Proposal.findOne({ _id: proposalId, organizationId });
  if (!proposal && updates?.actorEmail) {
    // Allow collaborator edits for shared proposals across orgs.
    proposal = await Proposal.findOne({
      _id: proposalId,
      collaborators: normalizeEmail(updates.actorEmail),
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    });
  }
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  const actor = {
    userId,
    role: updates?.actorRole,
    email: updates?.actorEmail,
  };
  assertProposalAccess(proposal, actor);
  if (updates.title !== undefined) proposal.title = updates.title;
  if (updates.blocks !== undefined) {
    proposal.blocks = sanitizeBlocks(updates.blocks);
    proposal.markModified('blocks');
  }
  if (updates.variables !== undefined) {
    proposal.variables = updates.variables;
    proposal.markModified('variables');
  }
  if (updates.status !== undefined) {
    const nextStatus = String(updates.status || '').toLowerCase().trim();
    const allowed = new Set(['draft', 'pending', 'published', 'accepted', 'declined']);
    if (!allowed.has(nextStatus)) {
      const err = new Error('Invalid status');
      err.status = 400;
      throw err;
    }
    if (nextStatus === 'published' && !proposal.slug) {
      proposal.slug = await generateSlug(proposal.title);
    }
    proposal.status = nextStatus;
  }
  if (updates.folderId !== undefined) {
    let nextFolder = updates.folderId === '' || updates.folderId === 'pages' ? null : updates.folderId;
    if (nextFolder != null) {
      await assertFolderOwnedByUser(organizationId, userId, nextFolder);
    }
    proposal.folderId = nextFolder;
  }
  if (updates.starred !== undefined) proposal.starred = !!updates.starred;
  if (updates.tags !== undefined) proposal.tags = Array.isArray(updates.tags) ? updates.tags : [];
  if (updates.engagement !== undefined) proposal.engagement = Array.isArray(updates.engagement) ? updates.engagement : [];
  await proposal.save();
  return format(proposal.toObject());
}

/**
 * Publish a proposal — sets status to 'published' and generates a slug.
 */
export async function publishProposal(organizationId, proposalId, actor = {}) {
  const proposal = await Proposal.findOne({ _id: proposalId, organizationId });
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  assertProposalAccess(proposal, actor);
  if (!proposal.slug) {
    proposal.slug = await generateSlug(proposal.title);
  }
  proposal.status = 'published';
  await proposal.save();
  return format(proposal.toObject());
}

export async function listCollaborators(organizationId, proposalId, actor = {}) {
  const proposal = await Proposal.findOne({ _id: proposalId, organizationId }).lean();
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  assertProposalAccess(proposal, actor);
  return {
    proposalId: proposal._id.toString(),
    collaborators: normalizeCollaborators(proposal.collaborators, ''),
  };
}

export async function addCollaborator(organizationId, proposalId, email, actor = {}) {
  const collaboratorEmail = normalizeEmail(email);
  if (!collaboratorEmail) {
    const err = new Error('Collaborator email is required');
    err.status = 400;
    throw err;
  }
  const proposal = await Proposal.findOne({ _id: proposalId, organizationId });
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  if (!isOrgWideRole(actor.role) && String(actor.userId || '') !== proposal.createdBy?.toString()) {
    const err = new Error('Only owner or admin can manage collaborators');
    err.status = 403;
    throw err;
  }
  const owner = await User.findById(proposal.createdBy).select('email').lean();
  const ownerEmail = normalizeEmail(owner?.email);
  if (collaboratorEmail === ownerEmail) {
    const err = new Error('Owner already has access');
    err.status = 400;
    throw err;
  }
  proposal.collaborators = normalizeCollaborators(
    [...(proposal.collaborators || []), collaboratorEmail],
    ownerEmail
  );
  await proposal.save();
  return { collaborators: proposal.collaborators };
}

export async function removeCollaborator(organizationId, proposalId, email, actor = {}) {
  const collaboratorEmail = normalizeEmail(email);
  if (!collaboratorEmail) {
    const err = new Error('Collaborator email is required');
    err.status = 400;
    throw err;
  }
  const proposal = await Proposal.findOne({ _id: proposalId, organizationId });
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  if (!isOrgWideRole(actor.role) && String(actor.userId || '') !== proposal.createdBy?.toString()) {
    const err = new Error('Only owner or admin can manage collaborators');
    err.status = 403;
    throw err;
  }
  proposal.collaborators = normalizeCollaborators(
    (proposal.collaborators || []).filter((e) => normalizeEmail(e) !== collaboratorEmail),
    ''
  );
  await proposal.save();
  return { collaborators: proposal.collaborators };
}

/**
 * Soft-delete a proposal by id — sets deletedAt.
 */
export async function deleteProposal(organizationId, proposalId) {
  const res = await Proposal.updateOne(
    { _id: proposalId, organizationId },
    { $set: { deletedAt: new Date() } },
    { timestamps: false }
  );
  if (res.matchedCount === 0) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
}

/**
 * List soft-deleted proposals for an org (paginated).
 * @param {{ skip?: number, limit?: number }} [options]
 */
export async function listDeletedProposals(organizationId, { skip = 0, limit = 20 } = {}) {
  const query = {
    organizationId,
    deletedAt: { $exists: true, $ne: null },
  };
  const safeSkip = Math.max(0, Number(skip) || 0);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);

  const [raw, total] = await Promise.all([
    Proposal.find(query)
      .sort({ deletedAt: -1 })
      .skip(safeSkip)
      .limit(safeLimit)
      .populate('templateId', 'name')
      .lean(),
    Proposal.countDocuments(query),
  ]);

  const proposals = raw.map((p) => {
    const out = format(p);
    out.templateName = p.templateId?.name || 'proposal';
    out.deletedAt = p.deletedAt;
    return out;
  });

  return {
    proposals,
    total,
    hasMore: safeSkip + proposals.length < total,
  };
}

/**
 * Restore a soft-deleted proposal.
 */
export async function restoreProposal(organizationId, proposalId) {
  const res = await Proposal.updateOne(
    { _id: proposalId, organizationId },
    { $set: { deletedAt: null } },
    { timestamps: false }
  );
  if (res.matchedCount === 0) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  const proposal = await Proposal.findOne({ _id: proposalId, organizationId }).lean();
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  return format(proposal);
}

/**
 * Send proposal link by email. Proposal must be published.
 * Tracks sentTo to avoid duplicate sends; returns 409 if already sent to this email.
 * @param {string} organizationId
 * @param {string} proposalId
 * @param {{ to: string, message?: string }} options
 */
export async function sendProposalEmail(organizationId, proposalId, { to, message: customMessage }, actor = {}) {
  const proposal = await Proposal.findOne({ _id: proposalId, organizationId });
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  assertProposalAccess(proposal, actor);
  if (proposal.status !== 'published' || !proposal.slug) {
    const err = new Error('Proposal must be published before sending');
    err.status = 400;
    throw err;
  }

  const toEmail = (to || '').trim().toLowerCase();
  if (!toEmail) {
    const err = new Error('Recipient email is required');
    err.status = 400;
    throw err;
  }

  const previewUrl = `${WEB_ORIGIN}/view/${proposal.slug}?email=${encodeURIComponent(toEmail)}`;

  // Plain-text fallback
  const plainText = [
    `Hi,`,
    ``,
    customMessage && customMessage.trim()
      ? `${customMessage.trim()}\n`
      : `You've been sent a proposal to review.`,
    ``,
    `Proposal: ${proposal.title}`,
    `View it here (no login required): ${previewUrl}`,
    ``,
    `Best regards`,
  ].join('\n');

  // Rich branded HTML email
  const customMsgHtml = customMessage && customMessage.trim()
    ? `<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
        ${customMessage.trim().replace(/\n/g, '<br>')}
       </p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:28px 36px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
              Elsner Proposals
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">
              Proposal shared with you
            </p>
            <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
              ${proposal.title}
            </h1>

            ${customMsgHtml}

            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
              You've been invited to review this proposal. Click the button below to view the
              full content — no account or login required.
            </p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#1a1a2e;border-radius:8px;">
                  <a href="${previewUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                    View Full Proposal →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Or copy this link into your browser:<br>
              <a href="${previewUrl}" style="color:#4f46e5;word-break:break-all;">${previewUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 36px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
              This email was sent via <strong style="color:#6b7280;">Elsner Proposals</strong>.
              You received it because someone shared a proposal with you.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendMail({
    to: toEmail,
    subject: `${proposal.title} — Proposal shared with you`,
    text: plainText,
    html,
  });

  if (!Array.isArray(proposal.sentTo)) proposal.sentTo = [];
  proposal.sentTo.push({ email: toEmail, sentAt: new Date() });
  await proposal.save();
}

/**
 * Get viewer status for public proposal: can this email view/accept, and have they already accepted?
 * @param {string} slugOrId - proposal slug or id
 * @param {string} email - viewer email (lowercase)
 * @param {{ byId?: boolean }} opts - byId: true to look up by _id, false by slug
 * @returns {{ allowed: boolean, alreadyAccepted: boolean, acceptance?: { fullName, acceptedAt } }}
 */
export async function getViewerStatus(slugOrId, email, opts = {}) {
  const byId = opts.byId === true;
  if (byId && (!slugOrId || !mongoose.Types.ObjectId.isValid(slugOrId))) {
    return { allowed: false, alreadyAccepted: false };
  }
  const query = byId
    ? { _id: new mongoose.Types.ObjectId(slugOrId), status: 'published' }
    : { slug: (slugOrId || '').toLowerCase().trim(), status: 'published' };
  const proposal = await Proposal.findOne(query).lean();
  if (!proposal) return { allowed: false, alreadyAccepted: false };

  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) return { allowed: false, alreadyAccepted: false };

  const sentTo = Array.isArray(proposal.sentTo) ? proposal.sentTo : [];
  const allowed = sentTo.some((e) => (e.email || '').toLowerCase() === normalizedEmail);

  const acceptances = Array.isArray(proposal.agreementAcceptances) ? proposal.agreementAcceptances : [];
  const acceptance = acceptances.find((a) => (a.email || '').toLowerCase() === normalizedEmail);
  const alreadyAccepted = !!acceptance;

  const result = { allowed, alreadyAccepted };
  if (acceptance) {
    result.acceptance = {
      fullName: acceptance.fullName || '',
      acceptedAt: acceptance.acceptedAt,
    };
  }
  return result;
}

/**
 * Accept agreement for a proposal. Only allowed if email is in sentTo and not already accepted.
 * Sends notification to proposal creator and to the accepter.
 */
export async function acceptAgreement(slugOrId, body, opts = {}) {
  const byId = opts.byId === true;
  if (byId && (!slugOrId || !mongoose.Types.ObjectId.isValid(slugOrId))) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }
  const query = byId
    ? { _id: new mongoose.Types.ObjectId(slugOrId), status: 'published' }
    : { slug: (slugOrId || '').toLowerCase().trim(), status: 'published' };
  const proposal = await Proposal.findOne(query);
  if (!proposal) {
    const err = new Error('Proposal not found');
    err.status = 404;
    throw err;
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  const sentTo = Array.isArray(proposal.sentTo) ? proposal.sentTo : [];
  if (!sentTo.some((e) => (e.email || '').toLowerCase() === email)) {
    const err = new Error('This proposal was not sent to this email address. Only the recipient can accept the agreement.');
    err.status = 403;
    throw err;
  }

  const acceptances = Array.isArray(proposal.agreementAcceptances) ? proposal.agreementAcceptances : [];
  if (acceptances.some((a) => (a.email || '').toLowerCase() === email)) {
    const err = new Error('Agreement was already accepted for this email.');
    err.status = 409;
    throw err;
  }

  if (!proposal.agreementAcceptances) proposal.agreementAcceptances = [];
  proposal.agreementAcceptances.push({
    email,
    fullName: (body.fullName || '').trim(),
    organization: (body.organization || '').trim(),
    signatureDataUrl: typeof body.signatureDataUrl === 'string' ? body.signatureDataUrl : '',
    acceptedAt: new Date(),
  });
  await proposal.save();

  const fullName = (body.fullName || '').trim() || email;
  const proposalTitle = proposal.title || 'Proposal';

  const creator = await User.findById(proposal.createdBy).select('email name').lean();
  const creatorEmail = creator?.email;
  if (creatorEmail) {
    const viewUrl = byId
      ? `${WEB_ORIGIN}/view?id=${encodeURIComponent(encodeUrlOpaque(proposal._id.toString()))}`
      : `${WEB_ORIGIN}/view/${proposal.slug}`;
    await sendMail({
      to: creatorEmail,
      subject: `Agreement accepted: ${proposalTitle}`,
      text: `${fullName} (${email}) has accepted the agreement for "${proposalTitle}".`,
      html: `
        <p><strong>${fullName}</strong> (${email}) has accepted the agreement for "<strong>${proposalTitle}</strong>".</p>
        <p><a href="${viewUrl}">View proposal</a></p>
      `,
    }).catch(() => {});
  }

  await sendMail({
    to: email,
    subject: `Agreement accepted: ${proposalTitle}`,
    text: `You have accepted the agreement for "${proposalTitle}". This confirms your acceptance.`,
    html: `
      <p>You have accepted the agreement for "<strong>${proposalTitle}</strong>".</p>
      <p>This email confirms your acceptance. The proposal owner has been notified.</p>
    `,
  }).catch(() => {});

  return { success: true, acceptance: { fullName, acceptedAt: new Date() } };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
