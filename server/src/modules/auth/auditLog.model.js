import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'register',
        'login',
        'login_failed',
        'logout',
        'forgot_password',
        'password_reset',
        'email_verified',
        'invite_sent',
        'invite_accepted',
        'role_changed',
      ],
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    email: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    // No TTL — retain for 5+ years per NFR-4
  }
);

auditLogSchema.index({ event: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
