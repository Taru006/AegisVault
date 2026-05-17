import { useState, useEffect } from "react";
import { HiOutlineShieldCheck, HiOutlineExclamationCircle, HiOutlineClock, HiOutlineUser, HiOutlineTag } from "react-icons/hi";
import api from "../services/api.js";
import toast from "react-hot-toast";

export default function AuditLogModal({ file, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isValid, setIsValid] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && file?._id) {
      fetchLogs();
    }
  }, [isOpen, file]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/audit/${file._id}`);
      setLogs(data.logs || []);
      setIsValid(data.isChainValid);
    } catch (err) {
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-900 border border-dark-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-dark-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HiOutlineShieldCheck className="text-vault-400" />
              Audit Integrity Log
            </h2>
            <p className="text-sm text-dark-400 mt-1 truncate max-w-md">
              {file.originalName || file.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-dark-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Integrity Status */}
        <div className={`px-6 py-4 border-b flex items-center gap-3 ${isValid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          {isValid ? (
            <HiOutlineShieldCheck className="w-6 h-6 text-emerald-400" />
          ) : (
            <HiOutlineExclamationCircle className="w-6 h-6 text-red-400" />
          )}
          <div>
            <p className={`font-semibold ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
              {isValid ? 'Chain Integrity Verified' : 'Integrity Check Failed'}
            </p>
            <p className="text-xs text-dark-400">
              {isValid 
                ? 'All transactions for this file are cryptographically linked and untampered.' 
                : 'Warning: The audit chain for this file has been compromised.'}
            </p>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin h-8 w-8 text-vault-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-dark-500 py-10">No logs found for this file.</p>
          ) : (
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-dark-700 before:to-transparent">
              {logs.map((log, idx) => (
                <div key={log._id} className="relative flex items-start group">
                  <div className="absolute left-0 w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center z-10 group-hover:border-vault-500 transition-colors">
                    <HiOutlineTag className={`w-5 h-5 ${
                      log.action === 'UPLOAD' ? 'text-vault-400' : 
                      log.action === 'DOWNLOAD' ? 'text-emerald-400' : 
                      'text-red-400'
                    }`} />
                  </div>
                  <div className="ml-14 flex-1 bg-dark-800/50 border border-dark-700/50 rounded-xl p-4 hover:bg-dark-800 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white uppercase tracking-wider">{log.action}</span>
                      <div className="flex items-center gap-1 text-[10px] text-dark-500">
                        <HiOutlineClock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-dark-400">
                      <HiOutlineUser className="w-3 h-3" />
                      <span>User ID: {log.userId}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-dark-700/50 flex flex-col gap-1">
                      <p className="text-[10px] text-dark-500 font-mono truncate" title={log.currentHash}>
                        Hash: {log.currentHash}
                      </p>
                      <p className="text-[10px] text-dark-600 font-mono truncate">
                        Prev: {log.previousHash}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 bg-dark-900/50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-dark-800 border border-dark-700 text-white hover:bg-dark-700 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
