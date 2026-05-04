import { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { uploadDocument } from "../store/slices/documentSlice.js";
import { generateKey, encryptData, exportKey, hashData, arrayBufferToBase64 } from "../utils/crypto.js";
import { HiOutlineCloudUpload, HiOutlineLockClosed, HiOutlineDocumentAdd } from "react-icons/hi";
import toast from "react-hot-toast";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [encrypting, setEncrypting] = useState(false);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.documents);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file");

    try {
      setEncrypting(true);

      // 1. Read file into ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 2. Generate encryption key
      const key = await generateKey();

      // 3. Encrypt the file data
      const { ciphertext, iv } = await encryptData(arrayBuffer, key);

      // 4. Hash original content for integrity
      const contentHash = await hashData(arrayBuffer);

      // 5. Export key for local storage
      const exportedKey = await exportKey(key);
      // Store key locally — it never leaves the browser
      const keys = JSON.parse(localStorage.getItem("aegis_keys") || "{}");

      // 6. Upload encrypted data to server
      const result = await dispatch(
        uploadDocument({
          title,
          description,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          iv,
          contentHash,
          encryptedData: arrayBufferToBase64(ciphertext),
        })
      ).unwrap();

      // Save key mapped to document ID
      keys[result.document._id] = exportedKey;
      localStorage.setItem("aegis_keys", JSON.stringify(keys));

      setEncrypting(false);
      toast.success("Document encrypted & uploaded!");
      navigate("/");
    } catch (err) {
      setEncrypting(false);
      toast.error(err?.message || err || "Upload failed");
    }
  };

  const isProcessing = encrypting || loading;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload Document</h1>
        <p className="text-dark-400 mt-1">Files are encrypted in your browser before upload</p>
      </div>

      <div className="bg-dark-900/60 border border-dark-700/40 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-dark-600/50 rounded-xl p-10 text-center hover:border-vault-500/50 hover:bg-vault-500/5 transition-all duration-300 cursor-pointer"
          >
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
            {file ? (
              <div>
                <HiOutlineDocumentAdd className="w-12 h-12 text-vault-400 mx-auto mb-3" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-dark-500 text-sm mt-1">
                  {(file.size / 1048576).toFixed(2)} MB · Click to change
                </p>
              </div>
            ) : (
              <div>
                <HiOutlineCloudUpload className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-300 font-medium">Click to select a file</p>
                <p className="text-dark-500 text-sm mt-1">Any file type supported</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="upload-title" className="block text-sm font-medium text-dark-300 mb-2">Title</label>
            <input
              id="upload-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all"
              placeholder="Document title"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="upload-desc" className="block text-sm font-medium text-dark-300 mb-2">Description (optional)</label>
            <textarea
              id="upload-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all resize-none"
              placeholder="Brief description…"
            />
          </div>

          {/* Security note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-vault-600/10 border border-vault-500/20">
            <HiOutlineLockClosed className="w-5 h-5 text-vault-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-vault-300 font-medium">Zero-Knowledge Encryption</p>
              <p className="text-dark-400 mt-0.5">Your file is encrypted with AES-256-GCM in this browser. The encryption key never leaves your device.</p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing || !file}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-vault-600 to-vault-700 text-white font-semibold hover:from-vault-500 hover:to-vault-600 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-lg shadow-vault-500/20"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {encrypting ? "Encrypting…" : "Uploading…"}
              </span>
            ) : (
              "Encrypt & Upload"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
