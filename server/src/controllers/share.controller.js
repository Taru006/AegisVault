import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ShareLink from '../models/ShareLink.model.js';
import File from '../models/File.model.js';
import { notifyUser } from '../config/socket.js';
import AuditLog from '../models/AuditLog.model.js';

// Ensure uploads directory exists for mock local download
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * @route   POST /api/share
 * @desc    Create a share link for a file
 * @access  Private (Owner only)
 */
export const createShareLink = async (req, res, next) => {
  try {
    const { fileId, expirationHours = 24, maxDownloads = 1 } = req.body;

    if (!fileId) {
      res.status(400);
      throw new Error('fileId is required');
    }

    const file = await File.findById(fileId);
    if (!file) {
      res.status(404);
      throw new Error('File not found');
    }

    if (file.ownerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Access denied: only the owner can share this file');
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(expirationHours, 10));

    const shareLink = await ShareLink.create({
      fileId,
      token,
      createdBy: req.user._id,
      expiresAt,
      maxDownloads: parseInt(maxDownloads, 10),
    });

    res.status(201).json({
      success: true,
      shareLink: {
        token: shareLink.token,
        expiresAt: shareLink.expiresAt,
        maxDownloads: shareLink.maxDownloads,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/share/:token
 * @desc    Access a shared file via token
 * @access  Public (Token based)
 */
export const accessShareLink = async (req, res, next) => {
  try {
    const { token } = req.params;

    const shareLink = await ShareLink.findOne({ token }).populate('fileId');

    if (!shareLink) {
      res.status(404);
      throw new Error('Share link not found');
    }

    if (shareLink.isRevoked) {
      res.status(403);
      throw new Error('Share link has been revoked');
    }

    if (new Date() > shareLink.expiresAt) {
      res.status(403);
      throw new Error('Share link has expired');
    }

    if (shareLink.downloadCount >= shareLink.maxDownloads) {
      res.status(403);
      throw new Error('Maximum download limit reached for this link');
    }

    const file = shareLink.fileId;
    if (!file) {
      res.status(404);
      throw new Error('The original file has been deleted');
    }

    const filePath = path.join(UPLOADS_DIR, file.s3Key);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error('File blob missing from storage');
    }

    const downloadUrl = `${req.protocol}://${req.get('host')}/api/share/${token}/download`;

    // Return the link info and metadata
    res.json({
      success: true,
      document: {
        _id: file._id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      },
      downloadUrl,
      encryptedDEK: file.encryptedDEK,
      iv: file.iv,
      mimeType: file.mimeType
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/share/:token/download
 * @desc    Download a shared file via token
 * @access  Public (Token based)
 */
export const downloadSharedFile = async (req, res, next) => {
  try {
    const { token } = req.params;

    const shareLink = await ShareLink.findOne({ token }).populate('fileId');

    if (!shareLink) {
      res.status(404);
      throw new Error('Share link not found');
    }

    if (shareLink.isRevoked) {
      res.status(403);
      throw new Error('Share link has been revoked');
    }

    if (new Date() > shareLink.expiresAt) {
      res.status(403);
      throw new Error('Share link has expired');
    }

    if (shareLink.downloadCount >= shareLink.maxDownloads) {
      res.status(403);
      throw new Error('Maximum download limit reached for this link');
    }

    const file = shareLink.fileId;
    if (!file) {
      res.status(404);
      throw new Error('The original file has been deleted');
    }

    const filePath = path.join(UPLOADS_DIR, file.s3Key);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error('File blob missing from storage');
    }

    // Increment download count
    shareLink.downloadCount += 1;
    await shareLink.save();

    // Emit Socket.io notification to the file owner
    notifyUser(shareLink.createdBy, 'fileDownloaded', {
      message: `Your file '${file.name}' was downloaded via a share link.`,
      fileId: file._id,
      fileName: file.name,
      downloadCount: shareLink.downloadCount,
      maxDownloads: shareLink.maxDownloads,
      timestamp: new Date()
    });

    // Create Audit Log (using generic SYSTEM user for public link if no req.user)
    const userId = req.user ? req.user._id : shareLink.createdBy;
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
    const previousHash = lastLog ? lastLog.currentHash : "0".repeat(64);

    await AuditLog.create({
      action: 'DOWNLOAD_SHARED',
      userId: userId,
      fileId: file._id,
      previousHash
    });

    // Serve the file
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}.enc"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/share/:token
 * @desc    Revoke a share link
 * @access  Private (Admin/Manager only or Owner)
 */
export const revokeShareLink = async (req, res, next) => {
  try {
    const { token } = req.params;

    const shareLink = await ShareLink.findOne({ token });
    if (!shareLink) {
      res.status(404);
      throw new Error('Share link not found');
    }

    // Check permissions: Owner or Admin/Manager
    const isOwner = shareLink.createdBy.toString() === req.user._id.toString();
    const isAdminOrManager = req.user.role === 'Admin' || req.user.role === 'Manager';

    if (!isOwner && !isAdminOrManager) {
      res.status(403);
      throw new Error('Access denied: insufficient permissions to revoke this link');
    }

    shareLink.isRevoked = true;
    await shareLink.save();

    res.json({
      success: true,
      message: 'Share link successfully revoked',
    });
  } catch (error) {
    next(error);
  }
};
