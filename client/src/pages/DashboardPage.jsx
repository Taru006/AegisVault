import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFiles, deleteFile } from "../store/slices/fileSlice.js";
import { Link, useNavigate } from "react-router-dom";
import FileUpload from "../components/FileUpload.jsx";
import AuditLogModal from "../components/AuditLogModal.jsx";
import ShareModal from "../components/ShareModal.jsx";
import {
  HiOutlineDocumentText,
  HiOutlineTrash,
  HiOutlineCloudDownload,
  HiOutlineLockClosed,
  HiOutlineClock,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineShare,
  HiOutlineServer,
  HiOutlineCloudUpload,
} from "react-icons/hi";
import toast from "react-hot-toast";
import api from "../services/api.js";
import { decryptData, unwrapDEK } from "../utils/crypto.js";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { fileList, loading } = useSelector((state) => state.files);
  const { user } = useSelector((state) => state.auth);
  const [downloadingId, setDownloadingId] = useState(null);
  
  // Search, Sort, Filter, and Drag & Drop
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [filterFolder, setFilterFolder] = useState("all");
  const [dragActive, setDragActive] = useState(false);
  const [globalDroppedFile, setGlobalDroppedFile] = useState(null);
  
  // Versioning state
  const [versionTargetId, setVersionTargetId] = useState(null);
  const [versionFileName, setVersionFileName] = useState("");
  
  // Modals state
  const [auditFile, setAuditFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);

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
      
      // 1. Fetch metadata (includes DEK, IV, and downloadUrl)
      const { data } = await api.get(`/documents/${fileDoc._id}`);
      
      const encryptedDEKStr = data.encryptedDEK || fileDoc.encryptedDEK;
      const ivStr = data.iv || fileDoc.iv;
      const downloadUrl = data.downloadUrl;

      if (!downloadUrl || !encryptedDEKStr) {
        throw new Error("Missing download URL or DEK");
      }

      // 2. Fetch the actual encrypted blob using the downloadUrl
      const fileResponse = await api.get(downloadUrl, { responseType: 'arraybuffer' });
      const encryptedBuffer = fileResponse.data;

      // 3. Unwrap the DEK
      const dek = await unwrapDEK(encryptedDEKStr);

      // 4. Decrypt the file data locally
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

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isAdmin = user?.role === 'Admin';
  const isViewer = user?.role === 'Viewer';

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isViewer) setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (!isViewer && e.dataTransfer.files[0]) {
      setGlobalDroppedFile(e.dataTransfer.files[0]);
    }
  };

  const folders = ["all", ...new Set(fileList.map(doc => doc.folder || "root"))];

  const filteredFiles = fileList
    .filter(doc => {
      const name = doc.originalName || doc.name || "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = filterFolder === "all" || (doc.folder || "root") === filterFolder;
      return matchesSearch && matchesFolder;
    })
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      
      if (sortBy === 'date-desc') return dateB - dateA;
      if (sortBy === 'date-asc') return dateA - dateB;
      if (sortBy === 'size-desc') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'size-asc') return (a.size || 0) - (b.size || 0);
      if (sortBy === 'name-asc') return (a.originalName || a.name || "").localeCompare(b.originalName || b.name || "");
      if (sortBy === 'name-desc') return (b.originalName || b.name || "").localeCompare(a.originalName || a.name || "");
      return 0;
    });

  return (
    <div 
      className={`max-w-6xl mx-auto space-y-8 relative ${dragActive ? 'after:content-[""] after:absolute after:inset-0 after:bg-vault-500/10 after:border-2 after:border-dashed after:border-vault-500 after:rounded-2xl after:z-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Vault</h1>
          <p className="text-dark-400 mt-1">
            {fileList.length} encrypted file{fileList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-4">
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-dark-600 text-white font-medium hover:bg-dark-700 transition-all"
            >
              <HiOutlineServer className="w-5 h-5" />
              Admin Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 bg-dark-900/40 p-4 rounded-xl border border-dark-700/40">
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-vault-500 outline-none"
            />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-vault-500 outline-none"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
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
              {filteredFiles.map((doc) => (
                <div key={doc._id} className="group bg-dark-900/60 border border-dark-700/40 rounded-xl p-5 hover:border-vault-500/40 hover:bg-dark-900/80 transition-all duration-300 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-vault-600/20 border border-vault-500/30 flex items-center justify-center">
                      <HiOutlineDocumentText className="w-5 h-5 text-vault-400" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
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
                      <button 
                        onClick={() => setAuditFile(doc)}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-vault-300 hover:bg-vault-500/10" 
                        title="Audit Log"
                      >
                        <HiOutlineShieldCheck className="w-4 h-4" />
                      </button>
                      {!isViewer && (
                        <>
                          <button 
                            onClick={() => { setVersionTargetId(doc._id); setVersionFileName(doc.originalName || doc.name); }}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-blue-400 hover:bg-blue-500/10" 
                            title="Upload New Version"
                          >
                            <HiOutlineCloudUpload className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setShareFile(doc)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10" 
                            title="Share"
                          >
                            <HiOutlineShare className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(doc._id, doc.originalName || doc.name)} className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer" title="Delete">
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </>
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
        <div className="lg:col-span-1 space-y-6">
          {/* Folders List */}
          <div className="bg-dark-900/60 border border-dark-700/40 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">Folders</h3>
            <div className="space-y-2">
              {folders.map(folder => (
                <button
                  key={folder}
                  onClick={() => setFilterFolder(folder)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${filterFolder === folder ? 'bg-vault-600 text-white font-medium' : 'text-dark-300 hover:bg-dark-800'}`}
                >
                  {folder === 'all' ? 'All Files' : folder}
                </button>
              ))}
            </div>
          </div>

          {!isViewer && (
            <FileUpload 
              globalDroppedFile={globalDroppedFile} 
              onGlobalFileHandled={() => setGlobalDroppedFile(null)} 
              versionTargetId={versionTargetId}
              versionFileName={versionFileName}
              onCancelVersion={() => { setVersionTargetId(null); setVersionFileName(""); }}
              onUploadComplete={() => { setVersionTargetId(null); setVersionFileName(""); }}
            />
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

      {/* Modals */}
      <AuditLogModal 
        file={auditFile} 
        isOpen={!!auditFile} 
        onClose={() => setAuditFile(null)} 
      />
      <ShareModal 
        file={shareFile} 
        isOpen={!!shareFile} 
        onClose={() => setShareFile(null)} 
      />
    </div>
  );
}
