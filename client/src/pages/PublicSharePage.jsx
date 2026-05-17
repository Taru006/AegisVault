import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineCloudDownload, HiOutlineExclamationCircle, HiOutlineDocumentText } from "react-icons/hi";
import api from "../services/api.js";
import { decryptData, unwrapDEK } from "../utils/crypto.js";
import toast from "react-hot-toast";

export default function PublicSharePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileDoc, setFileDoc] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetchShareInfo();
  }, [token]);

  const fetchShareInfo = async (pass = "") => {
    try {
      setLoading(true);
      const { data } = await api.get(`/share/${token}${pass ? `?password=${encodeURIComponent(pass)}` : ""}`);
      setFileDoc(data);
      setError(null);
      setNeedsPassword(false);
      setPasswordError("");
    } catch (err) {
      if (err.response?.data?.message === 'PASSWORD_REQUIRED') {
        setNeedsPassword(true);
        setError(null);
      } else if (err.response?.data?.message === 'Invalid password') {
        setPasswordError("Invalid password");
      } else {
        setError(err.response?.data?.message || "Share link is invalid or expired");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password) fetchShareInfo(password);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      const { downloadUrl, encryptedDEK, iv, mimeType, document: docMetadata } = fileDoc;

      if (!downloadUrl || !encryptedDEK || !iv) {
        throw new Error("Missing encryption metadata in share info");
      }

      // 1. Fetch encrypted blob
      let encryptedBuffer;
      try {
        const url = `${downloadUrl}${password ? `?password=${encodeURIComponent(password)}` : ""}`;
        const response = await api.get(url, { responseType: 'arraybuffer' });
        encryptedBuffer = response.data;
      } catch (err) {
        throw new Error(`Failed to fetch encrypted file: ${err.response?.data?.message || err.message}`);
      }

      // 2. Unwrap DEK
      let dek;
      try {
        dek = await unwrapDEK(encryptedDEK);
      } catch (err) {
        throw new Error(`Failed to unwrap encryption key: ${err.message}`);
      }

      // 3. Decrypt
      let decryptedBuffer;
      try {
        decryptedBuffer = await decryptData(encryptedBuffer, dek, iv);
      } catch (err) {
        throw new Error(`Decryption failed: ${err.message}`);
      }

      // 4. Trigger browser download
      const blob = new Blob([decryptedBuffer], { type: mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docMetadata.name;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

      toast.success("File decrypted and downloaded!");
    } catch (err) {
      console.error("Download error:", err);
      toast.error(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-vault-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-dark-400 font-medium">Validating secure link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-900 border border-dark-700 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HiOutlineExclamationCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-dark-400 mb-8">{error}</p>
          <div className="pt-6 border-t border-dark-800">
            <p className="text-xs text-dark-600 uppercase tracking-widest font-bold">AegisVault Security Protocol</p>
          </div>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-900 border border-dark-700 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-vault-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HiOutlineLockClosed className="w-12 h-12 text-vault-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Required</h1>
          <p className="text-dark-400 mb-8">This shared file is protected by a password.</p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-vault-500 outline-none"
                required
              />
              {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-vault-600 hover:bg-vault-500 text-white font-bold transition-all"
            >
              Unlock File
            </button>
          </form>
          
          <div className="pt-6 mt-8 border-t border-dark-800">
            <p className="text-xs text-dark-600 uppercase tracking-widest font-bold">AegisVault Security Protocol</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vault-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vault-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center shadow-xl animate-pulse-glow mb-4">
            <HiOutlineShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Secure File Share</h1>
          <p className="text-dark-500 text-sm mt-1 uppercase tracking-widest">End-to-End Encrypted</p>
        </div>

        {/* Share Card */}
        <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-700/50 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-start gap-6 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center shrink-0">
              <HiOutlineDocumentText className="w-8 h-8 text-vault-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate" title={fileDoc.document.name}>
                {fileDoc.document.name}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded-md border border-dark-700">
                  {(fileDoc.document.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <span className="text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded-md border border-dark-700">
                  {fileDoc.document.mimeType}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-dark-800/50 rounded-2xl border border-dark-700/30 flex items-center gap-3">
              <HiOutlineLockClosed className="text-emerald-500 w-5 h-5 shrink-0" />
              <p className="text-sm text-dark-300">
                This file is encrypted. Decryption happens <span className="text-white font-bold">locally</span> in your browser.
              </p>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-vault-600 to-vault-700 text-white font-bold text-lg hover:from-vault-500 hover:to-vault-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-vault-600/20 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <HiOutlineCloudDownload className="w-6 h-6" />
                  Download & Decrypt
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-dark-600 uppercase tracking-[0.3em] font-bold">
          Powered by AegisVault Zero-Knowledge Engine
        </p>
      </div>
    </div>
  );
}
