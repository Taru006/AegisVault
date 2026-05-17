import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { HiOutlineUser, HiOutlineShieldCheck, HiOutlineTrash, HiOutlineUserGroup, HiOutlineMail, HiOutlineBadgeCheck } from "react-icons/hi";
import api from "../services/api.js";
import toast from "react-hot-toast";

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data.users || []);
    } catch (err) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      toast.success("User role updated");
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role");
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/users/${userId}`);
      toast.success("User deleted");
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <HiOutlineShieldCheck className="w-20 h-20 text-red-500/20 mb-4" />
        <h2 className="text-2xl font-bold text-white">Access Denied</h2>
        <p className="text-dark-500 mt-2">Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HiOutlineUserGroup className="text-vault-400" />
            User Management
          </h1>
          <p className="text-dark-400 mt-1">Manage platform access and roles</p>
        </div>
        <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">{users.length} Registered Users</span>
        </div>
      </div>

      <div className="bg-dark-900/60 border border-dark-700/40 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dark-800/80 border-b border-dark-700/50">
              <th className="px-6 py-4 text-xs font-bold text-dark-400 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-xs font-bold text-dark-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-dark-400 uppercase tracking-widest">MFA Status</th>
              <th className="px-6 py-4 text-xs font-bold text-dark-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700/30">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-20 text-center">
                  <div className="flex justify-center">
                    <svg className="animate-spin h-8 w-8 text-vault-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-10 text-center text-dark-500 italic">No other users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-dark-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-vault-600/20 border border-vault-500/30 flex items-center justify-center text-vault-400 font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{u.name}</p>
                        <p className="text-xs text-dark-500 flex items-center gap-1">
                          <HiOutlineMail className="w-3 h-3" /> {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role || 'Viewer'}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-vault-500 outline-none cursor-pointer"
                    >
                      <option value="Viewer">Viewer</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <HiOutlineBadgeCheck className={`w-5 h-5 ${u.mfaEnabled ? 'text-emerald-500' : 'text-dark-600'}`} />
                      <span className={`text-xs ${u.mfaEnabled ? 'text-emerald-500' : 'text-dark-500'}`}>
                        {u.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteUser(u._id, u.name)}
                      className="p-2 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete User"
                    >
                      <HiOutlineTrash className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-900/40 border border-dark-700/30 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-dark-400 uppercase tracking-widest mb-4">Admin Role</h3>
          <p className="text-xs text-dark-500 leading-relaxed">
            Full access to all documents, audit logs, and user management. Can change roles and delete users.
          </p>
        </div>
        <div className="bg-dark-900/40 border border-dark-700/30 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-dark-400 uppercase tracking-widest mb-4">Manager Role</h3>
          <p className="text-xs text-dark-500 leading-relaxed">
            Can upload, download, and share documents. Can view audit logs but cannot manage users.
          </p>
        </div>
        <div className="bg-dark-900/40 border border-dark-700/30 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-dark-400 uppercase tracking-widest mb-4">Viewer Role</h3>
          <p className="text-xs text-dark-500 leading-relaxed">
            Read-only access. Can view and download files but cannot upload, delete, or share them.
          </p>
        </div>
      </div>
    </div>
  );
}
