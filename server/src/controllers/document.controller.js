import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from "uuid";
import File from "../models/File.model.js";
import FileVersion from "../models/FileVersion.model.js";
import AuditLog from "../models/AuditLog.model.js";
import mongoose from "mongoose";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * @route   POST /api/documents
 * @desc    Upload an encrypted document
 * @access  Private
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const { originalName, mimeType, size, iv, contentHash, encryptedData, encryptedDEK, folder, tags } = req.body;

    if (!encryptedData || !iv || !encryptedDEK) {
      res.status(400);
      throw new Error("Encrypted data, DEK, and IV are required");
    }

    const fileId = new mongoose.Types.ObjectId(); // Create ID beforehand for Audit Log and s3Key
    const s3Key = `local_${req.user._id}_${uuidv4()}`;
    const filePath = path.join(UPLOADS_DIR, s3Key);

    // Save encrypted blob to local disk (mocking S3)
    const buffer = Buffer.from(encryptedData, "base64");
    await fs.promises.writeFile(filePath, buffer);

    // Save metadata to MongoDB
    const newFile = await File.create({
      _id: fileId,
      name: originalName,
      ownerId: req.user._id,
      s3Key,
      encryptedDEK,
      iv,
      mimeType,
      size,
      folder: folder || 'root',
      tags: tags || [],
    });

    const fileVersion = await FileVersion.create({
      fileId: newFile._id,
      versionNumber: 1,
      s3Key,
      uploadedBy: req.user._id,
      checksum: contentHash || "N/A",
    });

    newFile.currentVersionId = fileVersion._id;
    await newFile.save();

    // Create Audit Log
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
    const previousHash = lastLog ? lastLog.currentHash : "0".repeat(64);

    await AuditLog.create({
      action: 'UPLOAD',
      userId: req.user._id,
      fileId: newFile._id,
      previousHash
    });

    res.status(201).json({ success: true, document: newFile });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/documents/:id/versions
 * @desc    Upload a new version of a document
 * @access  Private (Owner only)
 */
export const uploadDocumentVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { size, iv, contentHash, encryptedData, encryptedDEK } = req.body;

    const file = await File.findById(id);
    if (!file) {
      res.status(404);
      throw new Error("File not found");
    }

    if (file.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      res.status(403);
      throw new Error("Access denied");
    }

    const s3Key = `local_${req.user._id}_${uuidv4()}`;
    const filePath = path.join(UPLOADS_DIR, s3Key);

    const buffer = Buffer.from(encryptedData, "base64");
    await fs.promises.writeFile(filePath, buffer);

    const oldVersionsCount = await FileVersion.countDocuments({ fileId: file._id });

    const fileVersion = await FileVersion.create({
      fileId: file._id,
      versionNumber: oldVersionsCount + 1,
      s3Key,
      uploadedBy: req.user._id,
      checksum: contentHash || "N/A",
    });

    file.currentVersionId = fileVersion._id;
    file.s3Key = s3Key;
    file.encryptedDEK = encryptedDEK;
    file.iv = iv;
    file.size = size;
    await file.save();

    const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
    const previousHash = lastLog ? lastLog.currentHash : "0".repeat(64);

    await AuditLog.create({
      action: 'UPDATE_VERSION',
      userId: req.user._id,
      fileId: file._id,
      previousHash
    });

    res.status(201).json({ success: true, document: file });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/documents
 * @desc    Get all documents for current user
 * @access  Private
 */
export const getDocuments = async (req, res, next) => {
  try {
    // Global visibility for the vault so all users (including Viewers) can see documents
    const docs = await File.find({})
      .sort({ createdAt: -1 })
      .populate("ownerId", "name email");

    res.json({ success: true, count: docs.length, documents: docs });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document (download)
 * @access  Private
 */
export const getDocument = async (req, res, next) => {
  try {
    const doc = await File.findById(req.params.id);

    if (!doc) {
      res.status(404);
      throw new Error("File not found");
    }

    // No owner restriction for viewing/downloading in a centralized vault

    const filePath = path.join(UPLOADS_DIR, doc.s3Key);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error("File blob missing from storage");
    }

    const downloadUrl = `documents/${doc._id}/download`;

    res.json({ 
      success: true, 
      document: doc,
      downloadUrl,
      encryptedDEK: doc.encryptedDEK,
      iv: doc.iv,
      mimeType: doc.mimeType
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download a document
 * @access  Private
 */
export const downloadDocument = async (req, res, next) => {
  try {
    const doc = await File.findById(req.params.id);

    if (!doc) {
      res.status(404);
      throw new Error("File not found");
    }

    // No owner restriction for downloading in a centralized vault

    const filePath = path.join(UPLOADS_DIR, doc.s3Key);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error("File blob missing from storage");
    }

    // Create Audit Log
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
    const previousHash = lastLog ? lastLog.currentHash : "0".repeat(64);

    await AuditLog.create({
      action: 'DOWNLOAD',
      userId: req.user._id,
      fileId: doc._id,
      previousHash
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}.enc"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document from storage and MongoDB
 * @access  Private (owner only)
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await File.findById(req.params.id);

    if (!doc) {
      res.status(404);
      throw new Error("File not found");
    }

    // Only the owner or an Admin can delete the file
    const isOwner = doc.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error("Only the owner or an Admin can delete this file");
    }

    // Delete from disk
    const filePath = path.join(UPLOADS_DIR, doc.s3Key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }

    // Delete from MongoDB
    await doc.deleteOne();
    await FileVersion.deleteMany({ fileId: doc._id });

    // Create Audit Log
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
    const previousHash = lastLog ? lastLog.currentHash : "0".repeat(64);

    await AuditLog.create({
      action: 'DELETE',
      userId: req.user._id,
      fileId: doc._id,
      previousHash
    });

    res.json({ success: true, message: "File deleted" });
  } catch (error) {
    next(error);
  }
};
