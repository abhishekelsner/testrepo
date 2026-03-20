import mongoose from 'mongoose';

/**
 * Contract / document sent for signature via Zoho Sign.
 * Links to template/proposal and tracks status via webhooks.
 */
const contractSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', default: null },
    zoho_request_id: { type: String, required: true, unique: true, index: true },
    request_name: { type: String, default: '' },
    signer_name: { type: String, required: true },
    signer_email: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'viewed', 'signed', 'completed', 'declined', 'expired'],
      default: 'sent',
      index: true,
    },
    document_url: { type: String, default: null },
    signed_document_url: { type: String, default: null },
    completed_at: { type: Date, default: null },
  },
  { timestamps: true }
);

contractSchema.index({ organizationId: 1, createdAt: -1 });

export default mongoose.model('Contract', contractSchema);
