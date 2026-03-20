import mongoose from 'mongoose';

/**
 * Billing workspace: 1:1 with Organization. Holds Stripe customer/subscription
 * and plan. Lookup by organizationId (from JWT) for all billing operations.
 */
const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    plan: {
      type: String,
      enum: ['single', 'team'],
      default: 'single',
    },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'trialing', 'past_due'],
      default: 'inactive',
    },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    // Payment method display (from Stripe; never store full card number)
    paymentMethodBrand: { type: String, default: null },
    paymentMethodLast4: { type: String, default: null },
    paymentMethodExpMonth: { type: Number, default: null },
    paymentMethodExpYear: { type: Number, default: null },
    paymentMethodName: { type: String, default: null },
    billingEmail: { type: String, default: null },
  },
  { timestamps: true }
);

// organizationId already has unique: true in schema, so no extra index needed

export default mongoose.model('Workspace', workspaceSchema);
