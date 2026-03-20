import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
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
      index: true,
    },
    planType: {
      type: String,
      enum: ['Single', 'Team'],
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    paymentStatus: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    stripeSubscriptionId: { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null },
    stripeCustomerId: { type: String, default: null },
    stripePriceId: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ userId: 1, paymentStatus: 1 });

subscriptionSchema.virtual('isExpired').get(function () {
  return new Date() > this.endDate;
});

export default mongoose.model('Subscription', subscriptionSchema);
