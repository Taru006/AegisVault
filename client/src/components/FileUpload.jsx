import { useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { uploadFile, setUploadStatus } from "../store/slices/fileSlice.js";
import { generateKey, encryptData, hashData, arrayBufferToBase64, wrapDEK } from "../utils/crypto.js";
import { HiOutlineCloudUpload, HiOutlineDocumentAdd, HiOutlineLockClosed } from "react-icons/hi";
import toast from "react-hot-toast";

export default function FileUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const { uploadStatus } = useSelector((state) => state.files);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file");

    try {
      dispatch(setUploadStatus('encrypting'));

      // 1. Read file into ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 2. Generate random AES-256-GCM DEK
      const dek = await generateKey();

      // 3. Encrypt the file data
      const { ciphertext, iv } = await encryptData(arrayBuffer, dek);

      // 4. Hash original content for integrity (optional but good)
      const contentHash = await hashData(arrayBuffer);

      // 5. Wrap/Encrypt the DEK (Dummy KEK for now)
      const encryptedDEK = await wrapDEK(dek);

      // 6. Upload encrypted data and keys to server
      const result = await dispatch(
        uploadFile({
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          iv,
          contentHash,
          encryptedDEK, // Sent to backend!
          encryptedData: arrayBufferToBase64(ciphertext), // Only sending encrypted blob
        })
      ).unwrap();

      toast.success("Document securely encrypted & uploaded!");
      setFile(null);
      if (onUploadComplete) onUploadComplete();
      dispatch(setUploadStatus('idle'));
      
    } catch (err) {
      dispatch(setUploadStatus('failed'));
      toast.error(err?.message || err || "Upload failed");
    }
  };

  const isProcessing = uploadStatus === 'encrypting' || uploadStatus === 'uploading';

  return (
    <div className="bg-dark-900/60 border border-dark-700/40 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <HiOutlineLockClosed className="text-vault-400" />
        Secure Upload
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
            ${isDragging ? 'border-vault-500 bg-vault-500/10' : 'border-dark-600/50 hover:border-vault-500/50 hover:bg-vault-500/5'}
          `}
        >
          <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          {file ? (
            <div>
              <HiOutlineDocumentAdd className="w-10 h-10 text-vault-400 mx-auto mb-2" />
              <p className="text-white font-medium truncate px-4">{file.name}</p>
              <p className="text-dark-500 text-sm mt-1">
                {(file.size / 1048576).toFixed(2)} MB · Click or drag to change
              </p>
            </div>
          ) : (
            <div>
              <HiOutlineCloudUpload className="w-10 h-10 text-dark-500 mx-auto mb-2" />
              <p className="text-dark-300 font-medium">Drag & drop or click to select</p>
              <p className="text-dark-500 text-sm mt-1">Encrypted locally via Web Crypto API</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isProcessing || !file}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-vault-600 to-vault-700 text-white font-semibold hover:from-vault-500 hover:to-vault-600 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-lg shadow-vault-500/20"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {uploadStatus === 'encrypting' ? "Encrypting Locally..." : "Uploading..."}
            </span>
          ) : (
            "Encrypt & Upload"
          )}
        </button>
      </form>
    </div>
  );
}
