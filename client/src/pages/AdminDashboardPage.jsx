import { useState, useEffect } from "react";
import api from "../services/api.js";
import { HiOutlineUsers, HiOutlineDocumentText, HiOutlineShare, HiOutlineServer } from "react-icons/hi";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get("/admin/analytics");
      setData(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-white text-center py-20">Loading Analytics...</div>;
  if (!data) return <div className="text-white text-center py-20">No data available</div>;

  const stats = [
    { label: "Total Users", value: data.totalUsers, icon: HiOutlineUsers, color: "text-blue-400" },
    { label: "Total Files", value: data.totalFiles, icon: HiOutlineDocumentText, color: "text-emerald-400" },
    { label: "Active Shares", value: data.activeShares, icon: HiOutlineShare, color: "text-purple-400" },
    { label: "Storage Used", value: (data.totalStorageBytes / 1024 / 1024).toFixed(2) + " MB", icon: HiOutlineServer, color: "text-vault-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Overview</h1>
          <p className="text-dark-400 mt-1">System-wide analytics and audit trail</p>
        </div>
        <Link 
          to="/admin/users" 
          className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg border border-dark-600 transition-colors"
        >
          Manage Users &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-dark-900/60 border border-dark-700/40 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-dark-800 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-dark-900/60 border border-dark-700/40 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-dark-700/40">
          <h2 className="text-xl font-bold text-white">Recent System Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-dark-300">
            <thead className="text-xs text-dark-400 uppercase bg-dark-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">File</th>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Log Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/40">
              {data.recentLogs.map((log) => (
                <tr key={log._id} className="hover:bg-dark-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-vault-400">{log.action}</td>
                  <td className="px-6 py-4">{log.userId?.name || "System"}</td>
                  <td className="px-6 py-4">{log.fileId?.name || log.fileId?.originalName || "N/A"}</td>
                  <td className="px-6 py-4">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-dark-500 max-w-[150px] truncate" title={log.currentHash}>
                    {log.currentHash}
                  </td>
                </tr>
              ))}
              {data.recentLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-dark-500">No recent activity</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
