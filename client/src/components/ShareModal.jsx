import { useState } from "react";
import { HiOutlineShare, HiOutlineClipboardCopy, HiOutlineCheck, HiOutlineClock, HiOutlineDownload } from "react-icons/hi";
import api from "../services/api.js";
import toast from "react-hot-toast";

export default function ShareModal({ file, isOpen, onClose }) {
  const [expiration, setExpiration] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [password, setPassword] = useState("");
  const [shareLink, setShareLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateLink = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/share", {
        fileId: file._id,
        expirationHours: expiration,
        maxDownloads: maxDownloads,
        ...(password && { password })
      });
      
      const fullUrl = `${window.location.origin}/share/${data.shareLink.token}`;
      setShareLink({ ...data.shareLink, fullUrl });
      toast.success("Share link generated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create share link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink.fullUrl);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-dark-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HiOutlineShare className="text-vault-400" />
            Share Securely
          </h2>
          <button onClick={onClose} className="p-2 text-dark-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!shareLink ? (
            <>
              <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
                <div className="w-10 h-10 rounded-lg bg-vault-600/20 flex items-center justify-center">
                  <HiOutlineShare className="text-vault-400 w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.originalName || file.name}</p>
                  <p className="text-xs text-dark-500">Generate a one-time secure link</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <HiOutlineClock className="w-3 h-3" /> Expiry
                  </label>
                  <select 
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-vault-500 outline-none"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={6}>6 Hours</option>
                    <option value={24}>24 Hours</option>
                    <option value={168}>7 Days</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                    <HiOutlineDownload className="w-3 h-3" /> Max Uses
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="100"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-vault-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1">
                  <HiOutlineCheck className="w-3 h-3" /> Password (Optional)
                </label>
                <input 
                  type="password"
                  placeholder="Leave blank for no password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-vault-500 outline-none"
                />
              </div>

              <button
                onClick={handleCreateLink}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-vault-600 hover:bg-vault-500 text-white font-bold transition-all disabled:opacity-50"
              >
                {loading ? "Generating..." : "Create Secure Link"}
              </button>
            </>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <p className="text-sm text-emerald-400 font-medium">Link successfully generated!</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Share Link</label>
                <div className="flex gap-2">
                  <input 
                    readOnly
                    value={shareLink.fullUrl}
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-xs outline-none"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 bg-vault-600 rounded-lg text-white hover:bg-vault-500 transition-all"
                  >
                    {copied ? <HiOutlineCheck className="w-5 h-5" /> : <HiOutlineClipboardCopy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-dark-500 uppercase tracking-widest pt-2">
                <span>Expires: {new Date(shareLink.expiresAt).toLocaleString()}</span>
                <span>Limit: {shareLink.maxDownloads} uses</span>
              </div>

              <button
                onClick={() => setShareLink(null)}
                className="w-full py-2 text-sm text-dark-400 hover:text-white transition-colors"
              >
                Create another link
              </button>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-dark-950/30 border-t border-dark-700/50">
          <p className="text-[10px] text-dark-600 text-center uppercase tracking-widest">
            Links are monitored and logged in the audit trail
          </p>
        </div>
      </div>
    </div>
  );
}
