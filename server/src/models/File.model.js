import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
  },
  encryptedDEK: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  currentVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileVersion',
  },
}, { timestamps: true });

const File = mongoose.model('File', fileSchema);

export default File;
