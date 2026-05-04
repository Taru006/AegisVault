import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDocuments, deleteDocument } from "../store/slices/documentSlice.js";
import { Link } from "react-router-dom";
import {
  HiOutlineDocumentText,
  HiOutlineTrash,
  HiOutlineCloudUpload,
  HiOutlineLockClosed,
  HiOutlineClock,
} from "react-icons/hi";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { documents, loading } = useSelector((state) => state.documents);

  useEffect(() => {
    dispatch(fetchDocuments());
  }, [dispatch]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await dispatch(deleteDocument(id)).unwrap();
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err || "Failed to delete");
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Vault</h1>
          <p className="text-dark-400 mt-1">
            {documents.length} encrypted document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to="/upload" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-vault-600 to-vault-700 text-white font-medium hover:from-vault-500 hover:to-vault-600 transition-all shadow-lg shadow-vault-500/20">
          <HiOutlineCloudUpload className="w-5 h-5" />
          Upload
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-10 w-10 text-vault-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-800 border border-dark-700/50 flex items-center justify-center">
            <HiOutlineLockClosed className="w-10 h-10 text-dark-500" />
          </div>
          <h3 className="text-xl font-semibold text-dark-300 mb-2">Your vault is empty</h3>
          <p className="text-dark-500 mb-6 max-w-sm mx-auto">Upload your first document. It will be encrypted in your browser before leaving your device.</p>
          <Link to="/upload" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-vault-600 to-vault-700 text-white font-medium hover:from-vault-500 hover:to-vault-600 transition-all shadow-lg shadow-vault-500/20">
            <HiOutlineCloudUpload className="w-5 h-5" />
            Upload First Document
          </Link>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc._id} className="group bg-dark-900/60 border border-dark-700/40 rounded-xl p-5 hover:border-vault-500/40 hover:bg-dark-900/80 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-vault-600/20 border border-vault-500/30 flex items-center justify-center">
                  <HiOutlineDocumentText className="w-5 h-5 text-vault-400" />
                </div>
                <button onClick={() => handleDelete(doc._id, doc.title)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Delete">
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-white truncate mb-1">{doc.title}</h3>
              {doc.description && <p className="text-sm text-dark-400 truncate mb-3">{doc.description}</p>}
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
  );
}
