import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import s3Client, { BUCKET_NAME } from "../config/s3.js";
import Document from "../models/Document.model.js";

/**
 * @route   POST /api/documents
 * @desc    Upload an encrypted document to S3
 * @access  Private
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const { title, description, originalName, mimeType, size, iv, contentHash, encryptedData } = req.body;

    if (!encryptedData || !iv) {
      res.status(400);
      throw new Error("Encrypted data and IV are required");
    }

    const s3Key = `documents/${req.user._id}/${uuidv4()}`;

    // Upload encrypted blob to S3
    const buffer = Buffer.from(encryptedData, "base64");
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: "application/octet-stream",
        Metadata: {
          originalname: originalName,
          mimetype: mimeType,
        },
      })
    );

    // Save metadata to MongoDB
    const doc = await Document.create({
      title,
      description,
      owner: req.user._id,
      s3Key,
      originalName,
      mimeType,
      size,
      iv,
      contentHash,
    });

    res.status(201).json({ success: true, document: doc });
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
    const docs = await Document.find({
      $or: [
        { owner: req.user._id },
        { "sharedWith.user": req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("owner", "name email");

    res.json({ success: true, count: docs.length, documents: docs });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document with presigned download URL
 * @access  Private
 */
export const getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate("owner", "name email");

    if (!doc) {
      res.status(404);
      throw new Error("Document not found");
    }

    // Verify ownership or shared access
    const isOwner = doc.owner._id.toString() === req.user._id.toString();
    const isShared = doc.sharedWith.some(
      (s) => s.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isShared) {
      res.status(403);
      throw new Error("Access denied");
    }

    // Generate presigned URL for download
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: doc.s3Key }),
      { expiresIn: 3600 }
    );

    res.json({ success: true, document: doc, downloadUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document from S3 and MongoDB
 * @access  Private (owner only)
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      res.status(404);
      throw new Error("Document not found");
    }

    if (doc.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the document owner can delete it");
    }

    // Delete from S3
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: doc.s3Key })
    );

    // Delete from MongoDB
    await doc.deleteOne();

    res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    next(error);
  }
};
