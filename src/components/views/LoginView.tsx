import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  UserCheck,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { MoasLogo } from "../MoasLogo";
import { RegisteredUser } from "../../types";

interface LoginViewProps {
  initialEmail?: string;
  registeredUsers: RegisteredUser[];
  onDirectLoginSuccess: (user: RegisteredUser) => void;
  onNewUserDetected: (email: string) => void;
  onNavigateRegister: (email?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  initialEmail = "arun.kumar@email.com",
  registeredUsers,
  onDirectLoginSuccess,
  onNewUserDetected,
  onNavigateRegister,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [routingStatus, setRoutingStatus] = useState<{
    type: "existing" | "new";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    const cleanInput = email.trim().toLowerCase();

    // Check if account already exists in registered accounts database
    const existing = registeredUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanInput ||
        u.name.toLowerCase() === cleanInput
    );

    if (existing) {
      // Existing User: Log in directly, bypassing registration and OTP
      setRoutingStatus({
        type: "existing",
        message: `Existing account verified! Welcome back, ${existing.name}. Logging in directly...`,
      });

      setTimeout(() => {
        setIsLoading(false);
        onDirectLoginSuccess(existing);
      }, 450);
    } else {
      // New User: Recognize they do not have an account and trigger registration + OTP flow
      setRoutingStatus({
        type: "new",
        message: `No account found for "${email}". Redirecting to Account Creation & OTP verification...`,
      });

      setTimeout(() => {
        setIsLoading(false);
        onNewUserDetected(email.trim());
      }, 550);
    }
  };

  const handleQuickPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setRoutingStatus(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Bar with Brand */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MoasLogo size="sm" showSubtitle={false} />
          <span className="text-xs font-bold text-teal-800 tracking-wider hidden sm:inline uppercase">
            ML Opportunities & Algorithmic Services
          </span>
        </div>
        <button
          onClick={() => onNavigateRegister(email)}
          className="text-xs sm:text-sm font-semibold text-teal-700 hover:text-teal-800 px-4 py-2 rounded-xl hover:bg-teal-50 border border-teal-200/80 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Create Account</span>
        </button>
      </header>

      {/* Main Split Section */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Left Decorative Banner */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#0F2E4D] via-[#133C64] to-[#0D9488] p-8 sm:p-12 text-white flex flex-col justify-center relative overflow-hidden">
            {/* Background geometric accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-navy-900/30 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <MoasLogo size="md" lightMode={true} showSubtitle={true} className="items-start" />

              <div className="mt-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-300/30 text-teal-200 text-xs font-semibold uppercase tracking-wider mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  Intelligent Algorithmic Matching
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Find Opportunities. <br />
                  <span className="text-teal-300">Build Your Future.</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto">
              <div className="text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-3">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Single Login Portal</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Login to MOAS
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-normal">
                  Enter your email to log in directly, or create a new verified account.
                </p>
              </div>

              {/* Status Alert Notification */}
              {routingStatus && (
                <div
                  className={`mt-5 p-3.5 rounded-2xl border text-xs font-medium flex items-start gap-2.5 transition-all ${
                    routingStatus.type === "existing"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  {routingStatus.type === "existing" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span>{routingStatus.message}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Email / Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (routingStatus) setRoutingStatus(null);
                      }}
                      required
                      placeholder="e.g. arun.kumar@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition-all placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Password reset link sent to registered email.")}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition-all placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">
                      Remember Me
                    </span>
                  </label>
                </div>

                {/* Primary Login button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Testing Presets */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span>Quick Test Routing:</span>
                  <span className="text-teal-700 font-semibold lowercase">click to test</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset("arun.kumar@email.com")}
                    className={`px-3 py-2 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                      email === "arun.kumar@email.com"
                        ? "bg-teal-50 border-teal-300 text-teal-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Existing User</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      arun.kumar@email.com
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-1">
                      Direct Login Bypass
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPreset("priya.sharma@mltech.ai")}
                    className={`px-3 py-2 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                      email === "priya.sharma@mltech.ai"
                        ? "bg-teal-50 border-teal-300 text-teal-900"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>New User</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      priya.sharma@mltech.ai
                    </div>
                    <div className="text-[10px] text-amber-700 font-medium mt-1">
                      Triggers Register + OTP
                    </div>
                  </button>
                </div>
              </div>

              {/* Bottom Notice */}
              <div className="mt-5 text-center">
                <p className="text-xs text-slate-500">
                  New to MOAS?{" "}
                  <button
                    type="button"
                    onClick={() => onNavigateRegister(email)}
                    className="font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer"
                  >
                    Create your account directly
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MOAS Platform Inc. All rights reserved. • ML Opportunities & Algorithmic Services
      </footer>
    </div>
  );
};
