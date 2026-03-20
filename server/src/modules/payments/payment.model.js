import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal', required: true, index: true },
    amount: { type: Number, required: true }, // in cents
    currency: { type: String, default: 'usd' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    stripeSessionId: { type: String, sparse: true },
    stripePaymentIntentId: { type: String, default: null },
    payerEmail: { type: String, default: null },
    payerName: { type: String, default: null },
    selectedOptionsSummary: { type: String, default: null }, // e.g. "Option A, Option B"
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ proposalId: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
