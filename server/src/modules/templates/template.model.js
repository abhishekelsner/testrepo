import mongoose from 'mongoose';

/**
 * Template model — stores reusable proposal/agreement templates.
 * Each template belongs to one organization and the user who created it (user-wise).
 * blocks: array of block objects (same JSON structure as proposal blocks).
 * variables: key-value defaults for {{variable}} substitution.
 */
const templateSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['proposal', 'agreement'],
      default: 'proposal',
    },
    blocks: { type: mongoose.Schema.Types.Mixed, default: [] },
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    folderId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Template', templateSchema);
