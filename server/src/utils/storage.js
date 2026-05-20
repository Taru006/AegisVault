import fs from 'fs';
import path from 'path';
import s3Client, { BUCKET_NAME } from '../config/s3.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const isAWSConfigured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
};

export const uploadFile = async (s3Key, buffer, mimeType) => {
  if (isAWSConfigured()) {
    console.log(`☁️ Uploading to AWS S3: ${s3Key}`);
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
    });
    await s3Client.send(command);
  } else {
    console.log(`📁 AWS credentials not configured. Saving locally to: ${s3Key}`);
    const filePath = path.join(UPLOADS_DIR, s3Key);
    await fs.promises.writeFile(filePath, buffer);
  }
};

export const serveFile = async (s3Key, res, downloadName = null) => {
  if (isAWSConfigured()) {
    console.log(`☁️ Fetching from AWS S3: ${s3Key}`);
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });
      const s3Response = await s3Client.send(command);
      
      res.setHeader('Content-Type', s3Response.ContentType || 'application/octet-stream');
      if (downloadName) {
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}.enc"`);
      }
      
      // Node.js stream pipelining
      s3Response.Body.pipe(res);
    } catch (err) {
      console.error("S3 GetObject Error:", err);
      res.status(404).json({ success: false, message: "File missing from cloud storage" });
    }
  } else {
    console.log(`📁 Serving locally: ${s3Key}`);
    const filePath = path.join(UPLOADS_DIR, s3Key);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: "File blob missing from storage" });
      return;
    }
    
    res.setHeader('Content-Type', 'application/octet-stream');
    if (downloadName) {
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}.enc"`);
    }
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
};

export const deleteFile = async (s3Key) => {
  if (isAWSConfigured()) {
    console.log(`☁️ Deleting from AWS S3: ${s3Key}`);
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });
      await s3Client.send(command);
    } catch (err) {
      console.error("S3 DeleteObject Error:", err);
    }
  } else {
    console.log(`📁 Deleting locally: ${s3Key}`);
    const filePath = path.join(UPLOADS_DIR, s3Key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
};

export const fileExists = async (s3Key) => {
  if (isAWSConfigured()) {
    return true; // For S3, verify existence on get or run HeadObject if needed
  } else {
    const filePath = path.join(UPLOADS_DIR, s3Key);
    return fs.existsSync(filePath);
  }
};
