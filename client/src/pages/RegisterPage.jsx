import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { registerUser, clearError, resetMfaState } from "../store/slices/authSlice.js";
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineMail, HiOutlineUser, HiOutlineFingerPrint, HiOutlineChevronRight } from "react-icons/hi";
import { QRCodeSVG } from "qrcode.react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Viewer");
  const [localError, setLocalError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token, mfaSetup } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) navigate("/");
  }, [token, navigate]);

  useEffect(() => {
    dispatch(resetMfaState());
    return () => dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    dispatch(registerUser({ name, email, password, role }));
  };

  const displayError = localError || error;

  if (mfaSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
        <div className="relative w-full max-w-md animate-fade-in">
          <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-700/50 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-vault-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <HiOutlineFingerPrint className="w-10 h-10 text-vault-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Enable MFA</h1>
            <p className="text-dark-400 text-sm mb-8">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.) to secure your account.</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block mb-8 shadow-xl">
              <QRCodeSVG value={mfaSetup.otpAuthUrl} size={200} />
            </div>

            <div className="bg-dark-800/50 rounded-xl p-4 mb-8 text-left border border-dark-700/50">
              <p className="text-[10px] uppercase tracking-widest font-bold text-dark-500 mb-2">Manual Entry Key</p>
              <code className="text-vault-300 font-mono break-all">{mfaSetup.secret}</code>
            </div>

            <Link 
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-vault-600 text-white font-bold hover:bg-vault-500 transition-all"
            >
              Go to Login
              <HiOutlineChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-vault-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-vault-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center shadow-xl shadow-vault-500/20 animate-pulse-glow mb-4">
            <HiOutlineShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-dark-400 mt-1 text-sm">
            Start securing your documents today
          </p>
        </div>

        {/* Card */}
        <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-8 shadow-2xl">
          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-dark-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-dark-300 mb-2">
                Email
              </label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-dark-300 mb-2">
                Password
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm" className="block text-sm font-medium text-dark-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  id="register-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-role" className="block text-sm font-medium text-dark-300 mb-2">
                Account Role
              </label>
              <div className="relative">
                <HiOutlineShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <select
                  id="register-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Admin">Admin</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-dark-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-vault-600 to-vault-700 text-white font-semibold hover:from-vault-500 hover:to-vault-600 focus:outline-none focus:ring-2 focus:ring-vault-500/50 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-lg shadow-vault-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account…
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-dark-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-vault-400 hover:text-vault-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-dark-600">
          🔒 End-to-end encrypted · AES-256-GCM · Zero-Knowledge
        </p>
      </div>
    </div>
  );
}
