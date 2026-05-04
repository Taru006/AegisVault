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
    const { originalName, mimeType, size, iv, contentHash, encryptedData, encryptedDEK } = req.body;

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
 * @route   GET /api/documents
 * @desc    Get all documents for current user
 * @access  Private
 */
export const getDocuments = async (req, res, next) => {
  try {
    // Only owner visibility for now as per schema simplification
    const docs = await File.find({ ownerId: req.user._id })
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

    if (doc.ownerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Access denied");
    }

    const filePath = path.join(UPLOADS_DIR, doc.s3Key);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error("File blob missing from storage");
    }

    // Read the file and convert to base64
    const fileBuffer = await fs.promises.readFile(filePath);
    const encryptedData = fileBuffer.toString('base64');

    // Create Audit Log
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1 });
    const previousHash = lastLog ? lastLog.currentHash : "0".repeat(64);

    await AuditLog.create({
      action: 'DOWNLOAD',
      userId: req.user._id,
      fileId: doc._id,
      previousHash
    });

    res.json({ 
      success: true, 
      document: doc,
      encryptedData,
      encryptedDEK: doc.encryptedDEK,
      iv: doc.iv,
      mimeType: doc.mimeType
    });
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

    if (doc.ownerId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the owner can delete it");
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
