import mongoose from 'mongoose';

/**
 * System-wide settings (e.g. Stripe keys). One doc per key or single doc.
 * Used by admin to store Stripe live/test keys.
 */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
