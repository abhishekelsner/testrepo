import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: {
      type: String,
      enum: ['Admin', 'Creator', 'Super_Admin'],
      default: 'Creator',
    },
    emailVerified: { type: Boolean, default: false },
    googleId: { type: String, default: null },
    inviteStatus: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'accepted',
    },
    mustChangePassword: { type: Boolean, default: false },
    inviteToken: { type: String, default: null },
    inviteTokenExpiry: { type: Date, default: null },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    invitedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ organizationId: 1, email: 1 }, { unique: true });
userSchema.index({ email: 1, organizationId: 1 });

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

export default mongoose.model('User', userSchema);
