import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    website: { type: String, default: '' },
    defaultSharing: {
      type: String,
      enum: ['private', 'view_everyone', 'edit_everyone'],
      default: 'private',
    },
    creatorInvitePermission: {
      type: String,
      enum: ['any', 'same_domain', 'none'],
      default: 'any',
    },
    aiFeaturesEnabled: { type: Boolean, default: true },
    security: {
      loginProviders: [{ type: String, enum: ['google', 'salesforce', 'hubspot', 'microsoft', 'email'] }],
      allowAdminEmailLogin: { type: Boolean, default: false },
    },
    branding: {
      logo: String,
      primaryColor: String,
      colors: [String],
      font: String,
      fonts: {
        title: String,
        heading: String,
        body: String,
        agreements: String,
      },
      sameFont: { type: Boolean, default: false },
      emailTemplates: mongoose.Schema.Types.Mixed,
      /** Admin-editable agreement document HTML (modal + PDF). Empty = use app default. */
      agreementTemplate: { type: String, default: '' },
    },
    analyticsSettings: {
      timezone: { type: String, default: 'Etc/UTC' },
      currency: { type: String, default: 'USD' },
      engagementEnabled: { type: Boolean, default: false },
      savedFilters: [{ name: String, createdBy: { type: String, default: 'QWILR' } }],
      enableLastEdited: { type: Boolean, default: false },
    },
    subscription: { type: String, default: 'free' },
    customDomain: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
