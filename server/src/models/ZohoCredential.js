import mongoose from 'mongoose';

/**
 * Stores Zoho OAuth tokens (app-level or per-organization).
 * accessToken is refreshed using refreshToken when expired.
 */
const zohoCredentialSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

zohoCredentialSchema.index({ organizationId: 1 }, { unique: true, sparse: true });

export default mongoose.model('ZohoCredential', zohoCredentialSchema);
