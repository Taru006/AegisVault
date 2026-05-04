import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // ── S3 Storage ──────────────────────────
    s3Key: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    size: {
      type: Number,
      required: true,
    },
    // ── Encryption Metadata ─────────────────
    iv: {
      type: String,
      required: true, // base64-encoded initialization vector
    },
    contentHash: {
      type: String, // SHA-256 hash of original plaintext for integrity
    },
    // ── Sharing ─────────────────────────────
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        encryptedKey: { type: String }, // key re-encrypted with recipient's public key
        permission: {
          type: String,
          enum: ["view", "edit"],
          default: "view",
        },
      },
    ],
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ "sharedWith.user": 1 });

const Document = mongoose.model("Document", documentSchema);
export default Document;
