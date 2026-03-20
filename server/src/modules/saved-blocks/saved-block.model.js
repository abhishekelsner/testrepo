import mongoose from 'mongoose';

const savedBlockSchema = new mongoose.Schema(
  {
    userId:         { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name:           { type: String, required: true },
    type:           { type: String, required: true },
    content:        { type: mongoose.Schema.Types.Mixed, default: {} },
    background:     { type: mongoose.Schema.Types.Mixed, default: null },
    savedAt:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('SavedBlock', savedBlockSchema);
