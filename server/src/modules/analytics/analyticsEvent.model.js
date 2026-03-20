import mongoose from 'mongoose';

/**
 * Analytics events — open, close, click from public proposal view.
 * Used to compute views, average time spent, and interactions per proposal.
 */
const analyticsEventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      required: true,
      index: true,
    },
    proposalSlug: { type: String, trim: true },
    event: {
      type: String,
      enum: ['open', 'close', 'click', 'block_view', 'section_view'],
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ proposalId: 1, event: 1, createdAt: -1 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
