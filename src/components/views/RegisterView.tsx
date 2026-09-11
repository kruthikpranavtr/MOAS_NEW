import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
  AtSign,
  XCircle,
  Check,
  Building2,
  Briefcase,
  Globe,
  Users,
} from "lucide-react";
import { MoasLogo } from "../MoasLogo";

export interface RegisterFormData {
  name: string;
  username: string;
  email: string;
  phone: string;
  role: "jobseeker" | "employer" | "Candidate" | "Employer";
  companyName?: string;
  companyEmail?: string;
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  companyWebsite?: string;
  skills?: string[];
  experienceLevel?: string;
  resumeName?: string;
  password: string;
}

interface RegisterViewProps {
  initialEmail?: string;
  notice?: string;
  onRegisterSubmit: (data: RegisterFormData) => void;
  onNavigateLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  initialEmail = "",
  notice,
  onRegisterSubmit,
  onNavigateLogin,
}) => {
  // Two explicit roles: "jobseeker" (Looking for a job) and "employer" (Posting a job / Hiring)
  const [selectedRole, setSelectedRole] = useState<"jobseeker" | "employer">("jobseeker");

  // Derive reasonable initial name from email
  const deriveNameFromEmail = (em: string) => {
    if (!em || !em.includes("@")) return "";
    const prefix = em.split("@")[0] || "";
    return prefix
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const deriveUsernameFromEmail = (em: string) => {
    if (!em) return "";
    const prefix = em.includes("@") ? em.split("@")[0] : em;
    return prefix.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  };

  // Common fields & Job Seeker Fields
  const [name, setName] = useState(() => (initialEmail ? deriveNameFromEmail(initialEmail) : ""));
  const [username, setUsername] = useState(() => (initialEmail ? deriveUsernameFromEmail(initialEmail) : ""));
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState("");

  // Employer / Company Fields
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [employerUsername, setEmployerUsername] = useState("");
  const [employerPhone, setEmployerPhone] = useState("");
  const [industry, setIndustry] = useState("Artificial Intelligence & ML");
  const [companySize, setCompanySize] = useState("1-10 employees (Early Startup)");
  const [companyWebsite, setCompanyWebsite] = useState("");

  // Strong password state (11+ chars, uppercase, number, special char)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Strong Password Criteria
  const hasMinLength = password.length >= 11;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isPasswordMatch = password.length > 0 && password === confirmPassword;

  // Strength calculation
  const strengthScore = [hasMinLength, hasUppercase, hasNumber, hasSpecialChar, isPasswordMatch].filter(Boolean).length;

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setName(deriveNameFromEmail(initialEmail));
      setUsername(deriveUsernameFromEmail(initialEmail));
    }
  }, [initialEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const activeUsername = selectedRole === "jobseeker" ? username.trim().toLowerCase() : employerUsername.trim().toLowerCase();

    // 1. Username validation
    if (!activeUsername || activeUsername.length < 3) {
      setValidationError("Username must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(activeUsername)) {
      setValidationError("Username can only contain letters, numbers, underscores, dots, or hyphens (no spaces).");
      return;
    }

    // Role-specific validation
    if (selectedRole === "jobseeker") {
      if (!name.trim()) {
        setValidationError("Full Name is required for Job Seeker signup.");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setValidationError("A valid Email Address is required.");
        return;
      }
      if (!phone.trim()) {
        setValidationError("Mobile number is required for OTP verification.");
        return;
      }
    } else {
      // Employer validation
      if (!companyName.trim()) {
        setValidationError("Company Name is required.");
        return;
      }
      if (!companyEmail.trim() || !companyEmail.includes("@")) {
        setValidationError("Company Work Email is required.");
        return;
      }
      if (!contactPerson.trim()) {
        setValidationError("Contact Person / Recruiter name is required.");
        return;
      }
      if (!employerPhone.trim()) {
        setValidationError("Work phone number is required for OTP verification.");
        return;
      }
    }

    // 2. Strong Password Validation (11+ chars, uppercase, number, special char)
    if (!hasMinLength) {
      setValidationError("Password must be at least 11 characters long.");
      return;
    }
    if (!hasUppercase) {
      setValidationError("Password must contain at least one uppercase letter (A-Z).");
      return;
    }
    if (!hasNumber) {
      setValidationError("Password must contain at least one number (0-9).");
      return;
    }
    if (!hasSpecialChar) {
      setValidationError("Password must contain at least one special character (!@#$%^&*...).");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match. Please re-enter to confirm.");
      return;
    }

    // 3. Terms agreement
    if (!agreeTerms) {
      setValidationError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      if (selectedRole === "jobseeker") {
        onRegisterSubmit({
          name: name.trim(),
          username: activeUsername,
          email: email.trim(),
          phone: phone.trim(),
          role: "jobseeker",
          skills: [],
          experienceLevel: "Entry-level",
          resumeName: "",
          password,
        });
      } else {
        onRegisterSubmit({
          name: contactPerson.trim(),
          username: activeUsername,
          email: companyEmail.trim(),
          phone: employerPhone.trim(),
          role: "employer",
          companyName: companyName.trim(),
          companyEmail: companyEmail.trim(),
          industry,
          companySize,
          contactPerson: contactPerson.trim(),
          companyWebsite: companyWebsite.trim(),
          password,
        });
      }
    }, 350);
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
      <main className="w-full max-w-2xl mx-auto px-4 my-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-10">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold">
              Step 1 of 2
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Select Role & Account Setup (OTP verification follows)
            </span>
          </div>

          {/* Dynamic Notice if redirected from Login */}
          {notice && (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {/* Validation Error Box */}
          {validationError && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 font-medium animate-in fade-in duration-200">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="inline-flex p-2.5 rounded-2xl bg-teal-50 text-teal-700 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Create Your MOAS Account
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Choose your account type to set up the appropriate dashboard & verification pipeline.
            </p>
          </div>

          {/* ROLE SELECTION STEP: Two prominent selectable cards */}
          <div className="mb-8">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Choose How You Want to Use MOAS:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option 1: Looking for a job */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("jobseeker");
                  setValidationError(null);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedRole === "jobseeker"
                    ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20 shadow-xs"
                    : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${selectedRole === "jobseeker" ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedRole === "jobseeker" ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white"}`}>
                    {selectedRole === "jobseeker" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className={`text-base font-bold ${selectedRole === "jobseeker" ? "text-teal-900" : "text-slate-800"}`}>
                    Looking for a job
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Job Seeker • Upload resume, test skills, discover opportunities, and apply with 1-click.
                  </p>
                  <span className="inline-block mt-2.5 text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    Routes to /dashboard/jobseeker
                  </span>
                </div>
              </button>

              {/* Option 2: Posting a job / Hiring */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("employer");
                  setValidationError(null);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  selectedRole === "employer"
                    ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20 shadow-xs"
                    : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${selectedRole === "employer" ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedRole === "employer" ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white"}`}>
                    {selectedRole === "employer" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className={`text-base font-bold ${selectedRole === "employer" ? "text-teal-900" : "text-slate-800"}`}>
                    Posting a job / Hiring
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Employer & Company • Post job openings, review candidate pipelines, and hire talent.
                  </p>
                  <span className="inline-block mt-2.5 text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    Routes to /dashboard/employer
                  </span>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* CONDITIONAL FORM FIELDS BASED ON ROLE */}
            {selectedRole === "jobseeker" ? (
              /* ======================================================== */
              /* JOB SEEKER SIGNUP FIELDS                                 */
              /* ======================================================== */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-200/60 flex items-center gap-2 text-xs text-teal-800 font-semibold">
                  <User className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Job Seeker Details: Profile, Skills & Resume Setup</span>
                </div>

                {/* Full Name & Create User Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Legal Name <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        required
                        placeholder="e.g. Priya Sharma"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Create Username <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
                          if (validationError) setValidationError(null);
                        }}
                        required
                        placeholder="e.g. priyasharma24"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {username.trim() && (
                  <p className="text-[11px] text-slate-500 font-mono pl-1">
                    Your candidate User ID login handle: <span className="text-teal-700 font-bold">@{username.trim()}</span>
                  </p>
                )}

                {/* Email Address & Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Personal Email <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        required
                        placeholder="candidate@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number (for OTP) <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* EMPLOYER / COMPANY SIGNUP FIELDS                         */
              /* ======================================================== */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 bg-teal-50/50 rounded-2xl border border-teal-200/60 flex items-center gap-2 text-xs text-teal-800 font-semibold">
                  <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Employer & Company Details: Organization, Industry & Hiring Lead</span>
                </div>

                {/* Company Name & Official Work Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Company / Organization Name <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        required
                        placeholder="e.g. Nexus AI Innovations"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Company Email <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={companyEmail}
                        onChange={(e) => {
                          setCompanyEmail(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        required
                        placeholder="talent@company.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Person & Create Recruiter Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Contact Person / Hiring Lead <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => {
                          setContactPerson(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        required
                        placeholder="e.g. Vikram Malhotra (Head of Talent)"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Create Recruiter Username <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600" />
                      <input
                        type="text"
                        value={employerUsername}
                        onChange={(e) => {
                          setEmployerUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
                          if (validationError) setValidationError(null);
                        }}
                        required
                        placeholder="e.g. vikram_nexus"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {employerUsername.trim() && (
                  <p className="text-[11px] text-slate-500 font-mono pl-1">
                    Your recruiter User ID login handle: <span className="text-teal-700 font-bold">@{employerUsername.trim()}</span>
                  </p>
                )}

                {/* Industry & Company Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Industry / Sector <span className="text-teal-600">*</span>
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    >
                      <option value="Artificial Intelligence & ML">Artificial Intelligence & ML</option>
                      <option value="Software & Cloud Infrastructure">Software & Cloud Infrastructure</option>
                      <option value="Fintech & Digital Banking">Fintech & Digital Banking</option>
                      <option value="Healthcare & Biotechnology">Healthcare & Biotechnology</option>
                      <option value="Cybersecurity & Defense">Cybersecurity & Defense</option>
                      <option value="E-commerce & Logistics">E-commerce & Logistics</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Company Size <span className="text-teal-600">*</span>
                    </label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    >
                      <option value="1-10 employees (Early Startup)">1-10 employees (Early Startup)</option>
                      <option value="11-50 employees (Seed)">11-50 employees (Seed)</option>
                      <option value="51-200 employees (Growth)">51-200 employees (Growth)</option>
                      <option value="201-1000 employees">201-1000 employees</option>
                      <option value="1000+ Enterprise">1000+ Enterprise</option>
                    </select>
                  </div>
                </div>

                {/* Work Phone & Company Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Work Phone (for OTP) <span className="text-teal-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={employerPhone}
                        onChange={(e) => setEmployerPhone(e.target.value)}
                        required
                        placeholder="+91 98110 55432"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Company Website / Careers URL
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="https://company.com"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STRONG PASSWORD POLICY (Shared across both roles)        */}
            {/* ======================================================== */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Create Strong Password <span className="text-teal-600">*</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  Compulsory: 11+ characters, uppercase, number & symbol
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      required
                      placeholder="Enter 11+ char password"
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 text-slate-800 transition-all ${
                        hasMinLength && hasUppercase && hasNumber && hasSpecialChar
                          ? "border-emerald-300 focus:ring-emerald-500"
                          : "border-slate-200 focus:ring-teal-500"
                      }`}
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
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      required
                      placeholder="Confirm your password"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 text-slate-800 transition-all ${
                        isPasswordMatch
                          ? "border-emerald-300 focus:ring-emerald-500"
                          : "border-slate-200 focus:ring-teal-500"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Password Strength Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                  <span>Password Security Score:</span>
                  <span
                    className={
                      strengthScore <= 2
                        ? "text-rose-600"
                        : strengthScore <= 3
                        ? "text-amber-600"
                        : strengthScore <= 4
                        ? "text-teal-600"
                        : "text-emerald-700 font-bold"
                    }
                  >
                    {strengthScore <= 2
                      ? "Weak (incomplete criteria)"
                      : strengthScore <= 3
                      ? "Moderate"
                      : strengthScore <= 4
                      ? "Strong"
                      : "Exceptional & Fully Compliant"}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full flex-1 transition-all rounded-full ${
                      strengthScore >= 1 ? (strengthScore <= 2 ? "bg-rose-500" : "bg-teal-500") : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 transition-all rounded-full ${
                      strengthScore >= 2 ? (strengthScore <= 2 ? "bg-rose-500" : "bg-teal-500") : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 transition-all rounded-full ${
                      strengthScore >= 3 ? "bg-amber-500" : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 transition-all rounded-full ${
                      strengthScore >= 4 ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 transition-all rounded-full ${
                      strengthScore >= 5 ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Rule Checklist */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Strong Password Requirements (Compulsory):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {/* Rule 1: 11+ chars */}
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {hasMinLength ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">
                        11
                      </span>
                    )}
                    <span>11 or more characters ({password.length}/11)</span>
                  </div>

                  {/* Rule 2: 1 Uppercase */}
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasUppercase ? "text-emerald-700 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {hasUppercase ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">
                        A
                      </span>
                    )}
                    <span>At least 1 uppercase letter (A-Z)</span>
                  </div>

                  {/* Rule 3: 1 Number */}
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasNumber ? "text-emerald-700 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {hasNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">
                        9
                      </span>
                    )}
                    <span>At least 1 number (0-9)</span>
                  </div>

                  {/* Rule 4: 1 Special Character */}
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasSpecialChar ? "text-emerald-700 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {hasSpecialChar ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">
                        #
                      </span>
                    )}
                    <span>At least 1 special character (!@#$%...)</span>
                  </div>

                  {/* Rule 5: Password Match */}
                  <div
                    className={`flex items-center gap-1.5 sm:col-span-2 pt-1 border-t border-slate-200/50 ${
                      isPasswordMatch ? "text-emerald-700 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {isPasswordMatch ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold shrink-0">
                        =
                      </span>
                    )}
                    <span>Confirm password matches</span>
                  </div>
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
                  <span>
                    {selectedRole === "jobseeker"
                      ? "Create Job Seeker Account & Verify OTP"
                      : "Create Company Account & Verify OTP"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MOAS Platform Inc. • Secure Role-Based Career & Hiring Infrastructure
      </footer>
    </div>
  );
};
