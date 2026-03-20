import mongoose from 'mongoose';

/**
 * User-owned folder (replaces client localStorage custom folders).
 * Proposals reference a folder via proposal.folderId = `custom-${folder._id}`.
 */
const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
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
  },
  { timestamps: true }
);

/** One folder name per user per org (case-sensitive trim is in app layer too) */
folderSchema.index({ organizationId: 1, userId: 1, name: 1 }, { unique: true });

export default mongoose.model('Folder', folderSchema);
