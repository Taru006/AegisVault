import AuditLog from '../models/AuditLog.model.js';
import crypto from 'crypto';

export const getAuditLog = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Fetch all logs for this file, sorted chronologically (oldest first)
    const logs = await AuditLog.find({ fileId }).sort({ _id: 1 });

    let isChainValid = true;
    let expectedPreviousHash = 'GENESIS';

    for (const log of logs) {
      // 1. Check if the previousHash matches the expected one
      if (log.previousHash !== expectedPreviousHash) {
        isChainValid = false;
        break;
      }
      
      // 2. Recompute the current hash and compare
      const dataToHash = `${log.action}${log.userId.toString()}${log.fileId.toString()}${log.timestamp.toISOString()}${log.previousHash}`;
      const computedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
      
      if (log.currentHash !== computedHash) {
        isChainValid = false;
        break;
      }

      expectedPreviousHash = log.currentHash;
    }

    res.status(200).json({ logs, isChainValid });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
