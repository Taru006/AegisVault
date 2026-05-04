import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFiles, deleteFile } from "../store/slices/fileSlice.js";
import { Link } from "react-router-dom";
import FileUpload from "../components/FileUpload.jsx";
import {
  HiOutlineDocumentText,
  HiOutlineTrash,
  HiOutlineCloudDownload,
  HiOutlineLockClosed,
  HiOutlineClock,
  HiOutlineUsers,
} from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../services/api.js";
import { decryptData, unwrapDEK } from "../utils/crypto.js";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { fileList, loading } = useSelector((state) => state.files);
  const { user } = useSelector((state) => state.auth);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    dispatch(fetchFiles());
  }, [dispatch]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await dispatch(deleteFile(id)).unwrap();
      toast.success("File deleted");
    } catch (err) {
      toast.error(err || "Failed to delete");
    }
  };

  const handleDownload = async (fileDoc) => {
    try {
      setDownloadingId(fileDoc._id);
      
      // 1. Fetch encrypted blob and encryptedDEK from backend
      // Assuming a GET /documents/:id/download or similar route exists that returns the encrypted payload
      // For this frontend implementation, let's assume we GET /documents/:id
      const { data } = await api.get(`/documents/${fileDoc._id}`);
      
      // The backend should return { encryptedData: 'base64...', encryptedDEK: '...', iv: '...', mimeType: '...' }
      // Using mock extraction if the exact schema fields differ
      const encryptedBase64 = data.encryptedData || fileDoc.encryptedData;
      const encryptedDEKStr = data.encryptedDEK || fileDoc.encryptedDEK;
      const ivStr = data.iv || fileDoc.iv;

      if (!encryptedBase64 || !encryptedDEKStr) {
        throw new Error("Missing encrypted data or DEK");
      }

      // Convert base64 back to ArrayBuffer
      const encryptedBuffer = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0)).buffer;

      // 2. Unwrap the DEK
      const dek = await unwrapDEK(encryptedDEKStr);

      // 3. Decrypt the file data locally
      const decryptedBuffer = await decryptData(encryptedBuffer, dek, ivStr);

      // 4. Trigger download
      const blob = new Blob([decryptedBuffer], { type: fileDoc.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileDoc.originalName || fileDoc.name || 'decrypted_file';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      URL.revokeObjectURL(url);
      a.remove();
      toast.success("File decrypted and downloaded!");

    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to download and decrypt file");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isAdmin = user?.role === 'Admin';
  const isViewer = user?.role === 'Viewer';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Vault</h1>
          <p className="text-dark-400 mt-1">
            {fileList.length} encrypted file{fileList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-4">
          {isAdmin && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-dark-600 text-white font-medium hover:bg-dark-700 transition-all">
              <HiOutlineUsers className="w-5 h-5" />
              Manage Users
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {loading && fileList.length === 0 ? (
            <div className="flex justify-center py-20">
              <svg className="animate-spin h-10 w-10 text-vault-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : fileList.length === 0 ? (
            <div className="text-center py-20 bg-dark-900/40 border border-dark-800 rounded-2xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-800 border border-dark-700/50 flex items-center justify-center">
                <HiOutlineLockClosed className="w-10 h-10 text-dark-500" />
              </div>
              <h3 className="text-xl font-semibold text-dark-300 mb-2">Your vault is empty</h3>
              <p className="text-dark-500 max-w-sm mx-auto">
                {!isViewer ? "Upload your first document securely." : "No files available."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fileList.map((doc) => (
                <div key={doc._id} className="group bg-dark-900/60 border border-dark-700/40 rounded-xl p-5 hover:border-vault-500/40 hover:bg-dark-900/80 transition-all duration-300 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-vault-600/20 border border-vault-500/30 flex items-center justify-center">
                      <HiOutlineDocumentText className="w-5 h-5 text-vault-400" />
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleDownload(doc)} 
                        disabled={downloadingId === doc._id}
                        className="p-1.5 rounded-lg text-vault-300 hover:text-vault-100 hover:bg-vault-500/20 disabled:opacity-50" 
                        title="Download & Decrypt"
                      >
                        {downloadingId === doc._id ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <HiOutlineCloudDownload className="w-4 h-4" />
                        )}
                      </button>
                      {!isViewer && (
                        <button onClick={() => handleDelete(doc._id, doc.originalName || doc.name)} className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer" title="Delete">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-white truncate mb-3">{doc.originalName || doc.name || 'Untitled Document'}</h3>
                  <div className="flex items-center justify-between text-xs text-dark-500">
                    <div className="flex items-center gap-1">
                      <HiOutlineLockClosed className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{formatSize(doc.size)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HiOutlineClock className="w-3.5 h-3.5" />
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar / Upload Area */}
        <div className="lg:col-span-1">
          {!isViewer && (
            <FileUpload />
          )}
          {isViewer && (
            <div className="bg-dark-900/60 border border-dark-700/40 rounded-2xl p-6 text-center">
              <HiOutlineLockClosed className="w-10 h-10 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-300 font-medium">Viewer Access Only</p>
              <p className="text-sm text-dark-500 mt-2">You do not have permission to upload new documents to the vault.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
