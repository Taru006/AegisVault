import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { login, verifyMfa, clearError, resetMfaState } from "../store/slices/authSlice.js";
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineMail, HiOutlineKey } from "react-icons/hi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token, mfaRequired } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) navigate("/");
  }, [token, navigate]);

  useEffect(() => {
    dispatch(resetMfaState());
    return () => dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mfaRequired) {
      dispatch(verifyMfa({ email, totp: otp }));
    } else {
      dispatch(login({ email, password }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vault-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vault-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vault-500 to-vault-700 flex items-center justify-center shadow-xl shadow-vault-500/20 animate-pulse-glow mb-4">
            <HiOutlineShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {mfaRequired ? "Security Verification" : "Welcome Back"}
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            {mfaRequired ? "Enter your 6-digit authenticator code" : "Sign in to your secure vault"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-700/50 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!mfaRequired ? (
              <>
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-dark-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      id="login-email"
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
                  <label htmlFor="login-password" className="block text-sm font-medium text-dark-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="login-otp" className="block text-sm font-medium text-dark-300 mb-2">
                  Authenticator Code
                </label>
                <div className="relative">
                  <HiOutlineKey className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    id="login-otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 bg-dark-800 border border-dark-600/50 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-vault-500/50 focus:border-vault-500 transition-all tracking-[0.5em] text-center"
                    placeholder="000000"
                  />
                </div>
              </div>
            )}

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
                  {mfaRequired ? "Verifying..." : "Authenticating..."}
                </span>
              ) : (
                mfaRequired ? "Verify & Sign In" : "Sign In"
              )}
            </button>
          </form>

          {!mfaRequired && (
            <p className="mt-6 text-center text-sm text-dark-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-vault-400 hover:text-vault-300 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          )}

          {mfaRequired && (
            <button 
              onClick={() => dispatch(resetMfaState())}
              className="mt-6 w-full text-center text-sm text-dark-500 hover:text-dark-300 transition-colors"
            >
              ← Back to login
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-dark-600">
          🔒 End-to-end encrypted · AES-256-GCM · Zero-Knowledge
        </p>
      </div>
    </div>
  );
}
