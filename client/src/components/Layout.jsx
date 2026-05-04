import { Outlet, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/slices/authSlice.js";
import {
  HiOutlineHome,
  HiOutlineCloudUpload,
  HiOutlineLogout,
  HiOutlineShieldCheck,
} from "react-icons/hi";

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-dark-950 text-dark-50">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="w-64 flex flex-col bg-dark-900 border-r border-dark-700/50">
        {/* Brand */}
        <div className="p-6 border-b border-dark-700/50">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center shadow-lg animate-pulse-glow">
              <HiOutlineShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white group-hover:text-vault-300 transition-colors">
                AegisVault
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-dark-400">
                Zero-Knowledge
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-dark-300 hover:text-white hover:bg-dark-800 transition-all duration-200"
          >
            <HiOutlineHome className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-dark-700/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-vault-600/30 border border-vault-500/40 flex items-center justify-center text-vault-300 font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-dark-400 truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
          >
            <HiOutlineLogout className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
