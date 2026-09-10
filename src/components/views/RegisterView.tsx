import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { MoasLogo } from "../MoasLogo";

interface RegisterViewProps {
  initialEmail?: string;
  notice?: string;
  onRegisterSubmit: (data: {
    name: string;
    email: string;
    phone: string;
    role: "Candidate" | "Employer";
  }) => void;
  onNavigateLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  initialEmail = "",
  notice,
  onRegisterSubmit,
  onNavigateLogin,
}) => {
  // Derive reasonable initial name from email
  const deriveNameFromEmail = (em: string) => {
    if (!em) return "New User";
    const prefix = em.split("@")[0] || "";
    return prefix
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const [name, setName] = useState(() =>
    initialEmail && initialEmail !== "arun.kumar@email.com"
      ? deriveNameFromEmail(initialEmail)
      : "Priya Sharma"
  );
  const [email, setEmail] = useState(initialEmail || "priya.sharma@mltech.ai");
  const [phone, setPhone] = useState("+91 98450 67890");
  const [aadhar, setAadhar] = useState("5482 9102 3341");
  const [role, setRole] = useState<"Candidate" | "Employer">("Candidate");
  const [password, setPassword] = useState("Password@123");
  const [confirmPassword, setConfirmPassword] = useState("Password@123");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      if (initialEmail !== "arun.kumar@email.com") {
        setName(deriveNameFromEmail(initialEmail));
      }
    }
  }, [initialEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      alert("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please verify.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onRegisterSubmit({ name, email, phone, role });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-6">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-4 flex items-center justify-between">
        <button
          onClick={onNavigateLogin}
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <MoasLogo size="sm" showSubtitle={false} />
        </button>
        <button
          onClick={onNavigateLogin}
          className="text-xs sm:text-sm font-semibold text-teal-700 hover:text-teal-800 px-3.5 py-2 rounded-xl hover:bg-teal-50 border border-teal-200/80 cursor-pointer"
        >
          Already have an account? <span className="underline">Back to Login</span>
        </button>
      </header>

      {/* Registration Card */}
      <main className="w-full max-w-xl mx-auto px-4 my-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold">
              Step 2 of 3
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Create Account Details (OTP follows next)
            </span>
          </div>

          {/* Dynamic Notice if redirected from Login */}
          {notice && (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          <div className="text-center mb-8">
            <div className="inline-flex p-2.5 rounded-2xl bg-teal-50 text-teal-700 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Create Your Account
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Provide your details to set up your MOAS profile before OTP verification
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                I am joining as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("Candidate")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    role === "Candidate"
                      ? "bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-500"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Job Seeker / Candidate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("Employer")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    role === "Employer"
                      ? "bg-teal-50 border-teal-600 text-teal-900 ring-1 ring-teal-500"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Employer / Recruiter</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full legal name"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Number (for OTP SMS)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>
            </div>

            {/* Aadhar / National ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Aadhar / National ID Number
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={aadhar}
                  onChange={(e) => setAadhar(e.target.value)}
                  placeholder="5482 9102 3341"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the <span className="text-teal-700 font-semibold underline">Terms of Service</span>,{" "}
                  <span className="text-teal-700 font-semibold underline">Privacy Policy</span>, and consent to receive OTP authentication codes.
                </span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 mt-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue to OTP Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MOAS Platform Inc. • Encrypted Career & Identity Vault
      </footer>
    </div>
  );
};
