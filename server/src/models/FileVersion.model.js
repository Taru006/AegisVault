import mongoose from 'mongoose';

const fileVersionSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  versionNumber: {
    type: Number,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  checksum: {
    type: String,
    required: true,
  },
});

const FileVersion = mongoose.model('FileVersion', fileVersionSchema);

export default FileVersion;
