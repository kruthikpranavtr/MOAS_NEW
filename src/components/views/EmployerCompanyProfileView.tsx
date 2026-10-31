import React, { useState, useEffect } from "react";
import {
  Building2,
  User,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  Camera,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { UserProfile, Company, CompanyMember } from "../../types";

interface EmployerCompanyProfileViewProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigate?: (nav: any) => void;
}

export const EmployerCompanyProfileView: React.FC<EmployerCompanyProfileViewProps> = ({
  user,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "company" | "team">("company");

  // Employer Profile State
  const [empName, setEmpName] = useState(user.name || "");
  const [designation, setDesignation] = useState(user.contactPerson || "Talent Acquisition Partner");
  const [businessEmail, setBusinessEmail] = useState(user.companyEmail || user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [location, setLocation] = useState(user.location || "Bengaluru, India");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  // Company Profile State
  const [companyId, setCompanyId] = useState<string>("");
  const [companyName, setCompanyName] = useState(user.companyName || "");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState(user.industry || "Artificial Intelligence & Software");
  const [size, setSize] = useState(user.companySize || "51-200");
  const [website, setWebsite] = useState(user.companyWebsite || "");
  const [headquarters, setHeadquarters] = useState("Bengaluru, Karnataka");
  const [contactEmail, setContactEmail] = useState(user.companyEmail || user.email || "");
  const [contactPhone, setContactPhone] = useState(user.phone || "");
  const [culture, setCulture] = useState("");
  const [benefits, setBenefits] = useState<string[]>([
    "Comprehensive Health & Dental Coverage",
    "Hybrid / Remote Work Flexibility",
    "Equity Grants & Performance Bonus",
    "Annual Learning & Conference Stipend",
  ]);
  const [newBenefit, setNewBenefit] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");
  const [verificationNotes, setVerificationNotes] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");

  // Team & Recruiter State
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "recruiter" | "member">("recruiter");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");

  // UI status
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch employer profile and primary company
  useEffect(() => {
    let isMounted = true;
    const loadEmployerData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("moas_auth_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // 1. Fetch employer profile
        const profRes = await fetch("/api/v1/employer/profile", { headers, credentials: "include" });
        if (profRes.ok) {
          const profData = await profRes.json();
          const prof = profData?.profile || profData?.data?.profile;
          if (prof && isMounted) {
            setDesignation(prof.designation || prof.jobTitle || designation);
            setBusinessEmail(prof.businessEmail || prof.email || businessEmail);
            setPhone(prof.phone || phone);
            setLocation(prof.location || location);
            if (prof.companyName && !companyName) {
              setCompanyName(prof.companyName);
            }
          }
        }

        // 2. Fetch company details via dashboard or search
        const dashRes = await fetch("/api/v1/employer/dashboard", { headers, credentials: "include" });
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          const comp = dashData?.companyProfile || dashData?.data?.companyProfile;
          if (comp && isMounted) {
            setCompanyId(comp.id);
            setCompanyName(comp.name);
            setDescription(comp.description || "");
            setIndustry(comp.industry || industry);
            setSize(comp.size || size);
            setWebsite(comp.website || "");
            setHeadquarters(comp.headquarters || comp.location || headquarters);
            setContactEmail(comp.contactEmail || contactEmail);
            setContactPhone(comp.contactPhone || contactPhone);
            setCulture(comp.culture || "");
            if (Array.isArray(comp.benefits) && comp.benefits.length > 0) {
              setBenefits(comp.benefits);
            }
            setVerificationStatus(comp.verificationStatus || dashData?.verificationStatus || dashData?.data?.verificationStatus || "pending");
            setVerificationNotes(comp.verificationNotes || "");
            if (comp.logoStorageKey) {
              setLogoUrl(`/api/v1/companies/${comp.id}/logo?t=${Date.now()}`);
            }

            // Fetch members
            const memRes = await fetch(`/api/v1/companies/${comp.id}/members`, { headers, credentials: "include" });
            if (memRes.ok) {
              const memData = await memRes.json();
              const memList = memData?.members || memData?.data?.members;
              if (Array.isArray(memList) && isMounted) {
                setMembers(memList);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn("[EmployerCompanyProfileView] load error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadEmployerData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save Employer Profile
  const handleSaveEmployerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/employer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: empName,
          designation,
          businessEmail,
          phone,
          location,
          preferences: {
            notificationChannel: "email",
            emailAlerts,
            dailyDigest,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setSaveSuccess("Employer profile updated successfully!");
      onUpdateUser({
        ...user,
        name: empName,
        phone,
        location,
        companyEmail: businessEmail,
        contactPerson: designation,
      });

      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving employer profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Company Profile
  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess("");
    setErrorMessage("");

    try {
      const payload = {
        name: companyName.trim(),
        description: description.trim(),
        industry,
        size,
        website: website.trim(),
        headquarters: headquarters.trim(),
        location: headquarters.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        culture: culture.trim(),
        benefits,
      };

      let res: Response;
      if (companyId) {
        res = await fetch(`/api/v1/companies/${companyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/v1/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || (!data.success && !data.company && !data.data?.company)) {
        throw new Error(data.message || data.error || "Failed to save company profile.");
      }

      const savedComp = data.company || data.data?.company;
      if (savedComp?.id) {
        setCompanyId(savedComp.id);
        setVerificationStatus(savedComp.verificationStatus || "pending");
      }

      setSaveSuccess("Company profile saved and synced to PostgreSQL!");
      onUpdateUser({
        ...user,
        companyName,
        industry,
        companySize: size,
        companyWebsite: website,
      });

      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error updating company profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Company logo cannot exceed 2MB.");
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);

    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/companies/${companyId}/logo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload logo.");
      }

      setLogoUrl(`/api/v1/companies/${companyId}/logo?t=${Date.now()}`);
      setSaveSuccess("Branding logo updated successfully!");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Logo upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Logo
  const handleDeleteLogo = async () => {
    if (!companyId) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/companies/${companyId}/logo`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setLogoUrl("");
        setSaveSuccess("Company logo removed.");
        setTimeout(() => setSaveSuccess(""), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove logo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Recruiter Invitation
  const handleInviteRecruiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteSuccess("");
    setErrorMessage("");

    try {
      const res = await fetch(`/api/v1/companies/${companyId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || (!data.success && !data.invitationToken && !data.data?.invitationToken)) {
        throw new Error(data.message || data.error || "Failed to send recruiter invitation.");
      }

      const invToken = data.invitationToken || data.data?.invitationToken || data.membership?.invitationToken || data.data?.membership?.invitationToken;
      setInviteSuccess(`Invitation token generated for ${inviteEmail}: ${invToken || "Invitation recorded"}`);
      setInviteEmail("");

      // Refresh members
      const memRes = await fetch(`/api/v1/companies/${companyId}/members`, { credentials: "include" });
      if (memRes.ok) {
        const memData = await memRes.json();
        const memList = memData?.members || memData?.data?.members;
        if (Array.isArray(memList)) {
          setMembers(memList);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invitation failed.");
    } finally {
      setIsInviting(false);
    }
  };

  // Add / Remove Benefit tag
  const handleAddBenefit = () => {
    if (newBenefit.trim() && !benefits.includes(newBenefit.trim())) {
      setBenefits([...benefits, newBenefit.trim()]);
      setNewBenefit("");
    }
  };

  const handleRemoveBenefit = (item: string) => {
    setBenefits(benefits.filter((b) => b !== item));
  };

  const getVerificationBadge = () => {
    switch (verificationStatus.toLowerCase()) {
      case "verified":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Business</span>
          </div>
        );
      case "under_review":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Under Review</span>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/40">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Verification Rejected</span>
          </div>
        );
      case "suspended":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            <span>Suspended</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Verification Pending</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 overflow-hidden shadow-inner">
                {logoUrl ? (
                  <img src={logoUrl} alt={companyName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10" />
                )}
              </div>
              {companyId && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {companyName || "Company & Employer Management"}
                </h1>
                {getVerificationBadge()}
              </div>
              <p className="text-sm text-slate-300">
                {designation} • <span className="font-semibold text-white">{empName}</span> • Recruiter ID: <span className="font-mono text-teal-300">@{user.username || "recruiter"}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  {businessEmail}
                </span>
                {phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-teal-400" />
                      {phone}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  {headquarters}
                </span>
              </div>
            </div>
          </div>

          {/* Quick status callout */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 text-xs space-y-1.5 shrink-0 max-w-xs">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>PostgreSQL Sync</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Company profile and recruiter memberships are enforced with role-based PostgreSQL persistence.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("company")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "company"
                ? "bg-teal-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            Company Profile & Branding
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-teal-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            Employer Contact & Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "team"
                ? "bg-teal-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            Hiring Team & Recruiters ({members.length})
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-bold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-bold shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Corporate Identity & Presence</h2>
                <p className="text-xs text-slate-500">
                  Visible to candidates exploring your organization and active openings on MOAS
                </p>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Company Profile"}</span>
              </button>
            </div>

            {/* Logo Management */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Company Brand Logo</h3>
                  <p className="text-[11px] text-slate-500">
                    Supported formats: PNG, JPEG, WebP. Maximum file size: 2MB. Validated via magic bytes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs transition-colors">
                  <Camera className="w-4 h-4 text-teal-600" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteLogo}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Verification Status Banner */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-teal-950 block">
                    Verification Status: {verificationStatus.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-teal-800">
                    {verificationNotes ||
                      "Verification is audited by platform compliance administrators before granting verified corporate badges."}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                Managed in PostgreSQL
              </span>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="e.g. DeepMind Robotics India"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Industry / Domain</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Robotics, Artificial Intelligence, Fintech"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Company Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                >
                  <option value="1-10">1 – 10 employees (Early Stage)</option>
                  <option value="11-50">11 – 50 employees (Growth Startup)</option>
                  <option value="51-200">51 – 200 employees (Scaleup)</option>
                  <option value="201-500">201 – 500 employees (Mid-Market)</option>
                  <option value="501-1000">501 – 1,000 employees (Enterprise)</option>
                  <option value="1000+">1,000+ employees (Global Corporation)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Company Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.ai"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Headquarters / Location</label>
                <input
                  type="text"
                  value={headquarters}
                  onChange={(e) => setHeadquarters(e.target.value)}
                  placeholder="e.g. Bengaluru, Karnataka"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Corporate Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="careers@company.ai"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Company Mission & Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your core product offerings, algorithmic problem spaces, and engineering mission..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Culture */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">Workplace Culture & Engineering Principles</label>
              <textarea
                rows={2}
                value={culture}
                onChange={(e) => setCulture(e.target.value)}
                placeholder="High autonomy, technical rigor, peer code reviews, continuous deployment..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Benefits & Perks */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">Key Benefits & Perks</label>
              <div className="flex flex-wrap gap-2">
                {benefits.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-medium border border-slate-200"
                  >
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(b)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 max-w-md pt-1">
                <input
                  type="text"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddBenefit())}
                  placeholder="Add a perk (e.g. Parental leave, Gym membership)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: EMPLOYER PROFILE & PREFERENCES */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveEmployerProfile} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Employer Profile & Contact Details</h2>
                <p className="text-xs text-slate-500">
                  Your designated identity representing {companyName || "the organization"}
                </p>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Employer Profile"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Your Full Name *</label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Job Title / Designation *</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                  placeholder="e.g. Chief Technology Officer, VP of Engineering"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Business Email *</label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-800">Work Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, India"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recruitment Notification Preferences
              </h3>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Instant Applicant Alerts</span>
                  <span className="text-[11px] text-slate-500">
                    Receive an email when a qualified candidate applies to your active jobs
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Daily Candidate Pipeline Digest</span>
                  <span className="text-[11px] text-slate-500">
                    Summary of shortlisted candidates and scheduled interview stages
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: TEAM & RECRUITER MANAGEMENT */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Invite Recruiter Box */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-700" />
                <span>Invite Hiring Team Member or Recruiter</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Grant access to manage jobs and evaluate candidates under {companyName}. Invitations are cryptographically signed.
              </p>
            </div>

            {inviteSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="break-all">{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInviteRecruiter} className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="recruiter@company.ai"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
              />
              <select
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
              >
                <option value="recruiter">Recruiter (Post jobs & manage applicants)</option>
                <option value="admin">Administrator (Full team management)</option>
                <option value="member">Hiring Member (View applicants only)</option>
              </select>
              <button
                type="submit"
                disabled={isInviting || !companyId}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isInviting ? "Sending..." : "Send Invitation"}</span>
              </button>
            </form>
          </div>

          {/* Active Members Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Authorized Company Members ({members.length})
            </h3>

            {members.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No secondary recruiters currently enrolled. Send an invitation above.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 font-bold flex items-center justify-center text-xs">
                        {m.userName ? m.userName.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {m.userName || m.invitationEmail || "Hiring Team Member"}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {m.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {m.userEmail || m.invitationEmail || "Verified Account"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {m.status || "active"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
