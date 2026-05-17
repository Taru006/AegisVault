import User from '../models/User.model.js';
import File from '../models/File.model.js';
import ShareLink from '../models/ShareLink.model.js';
import AuditLog from '../models/AuditLog.model.js';

/**
 * @route   GET /api/admin/analytics
 * @desc    Get system-wide analytics for Admin Dashboard
 * @access  Private (Admin only)
 */
export const getAnalytics = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      res.status(403);
      throw new Error('Access denied: Admins only');
    }

    const totalUsers = await User.countDocuments();
    const totalFiles = await File.countDocuments();
    const activeShares = await ShareLink.countDocuments({ isRevoked: false, expiresAt: { $gt: new Date() } });
    
    const files = await File.find({}, 'size');
    const totalStorageBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
    
    const recentLogs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('userId', 'name email')
      .populate('fileId', 'name originalName');

    res.json({
      success: true,
      data: {
        totalUsers,
        totalFiles,
        activeShares,
        totalStorageBytes,
        recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
};
