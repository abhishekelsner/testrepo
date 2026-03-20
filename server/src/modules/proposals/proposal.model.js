import mongoose from 'mongoose';

/**
 * Proposal model — stores proposals with embedded blocks and variables.
 * blocks: array of block objects (JSON — type, order, content).
 * variables: key-value map for {{variable}} substitution in blocks.
 */
const proposalSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true, default: 'Untitled Proposal' },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'accepted', 'declined'],
      default: 'draft',
    },
    // slug: used for public shareable link (auto-generated on publish)
    slug: { type: String, unique: true, sparse: true, lowercase: true },
    // Embedded blocks array — same JSON schema as frontend block objects
    blocks: { type: mongoose.Schema.Types.Mixed, default: [] },
    // Key-value map of variables for {{Client Name}}, {{Deal Value}}, etc.
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Optional reference to the template used to create this proposal
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
    // Optional reference for cloned proposals
    cloneFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', default: null },
    // Folder for organization: null/'pages' = default Pages folder; 'custom-<id>' = custom folder
    folderId: { type: String, default: null },
    starred: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
    engagement: [{ type: String, trim: true }],
    collaborators: [{ type: String, lowercase: true, trim: true }],
    // Soft delete — when set, proposal is hidden from main list and shown in Deleted
    deletedAt: { type: Date, default: null },
    // Track emails this proposal was sent to (avoid duplicate sends, show history)
    sentTo: [
      {
        email: { type: String, required: true, lowercase: true },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    // Agreement acceptances: only recipients in sentTo can accept; one acceptance per email
    agreementAcceptances: [
      {
        email: { type: String, required: true, lowercase: true },
        fullName: { type: String, default: '' },
        organization: { type: String, default: '' },
        signatureDataUrl: { type: String, default: '' },
        acceptedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Proposal', proposalSchema);
