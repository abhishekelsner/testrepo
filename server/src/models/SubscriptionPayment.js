import mongoose from 'mongoose';

/**
 * Record of each successful subscription payment (saved from Stripe invoice.payment_succeeded).
 * Used to show payment history in Subscription settings.
 */
const subscriptionPaymentSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    stripeInvoiceId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: { type: String, default: 'paid' },
    paidAt: { type: Date, required: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ workspaceId: 1, paidAt: -1 });

export default mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
