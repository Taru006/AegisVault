import mongoose from 'mongoose';
import crypto from 'crypto';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['UPLOAD', 'DOWNLOAD', 'DOWNLOAD_SHARED', 'DELETE', 'SHARE', 'VIEW'],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
  },
  previousHash: {
    type: String,
    default: 'GENESIS',
  },
  currentHash: {
    type: String,
  },
});

auditLogSchema.pre('save', async function() {
  if (this.isNew) {
    // Find the most recent log entry for this file to get its currentHash as our previousHash
    const lastLog = await this.constructor.findOne({ fileId: this.fileId }).sort({ _id: -1 });
    
    this.previousHash = lastLog && lastLog.currentHash ? lastLog.currentHash : 'GENESIS';

    // Compute currentHash: SHA-256(action + userId + fileId + timestamp + previousHash)
    const dataToHash = `${this.action}${this.userId.toString()}${this.fileId.toString()}${this.timestamp.toISOString()}${this.previousHash}`;
    
    this.currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
