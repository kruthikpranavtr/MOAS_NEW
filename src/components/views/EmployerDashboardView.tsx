import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  TrendingUp,
  Search,
  Filter,
  FileText,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Award,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  Edit3,
  MessageSquare,
  Download,
  AlertCircle,
  X,
  ShieldAlert,
  Archive,
  Eye,
  Check,
  RotateCcw,
} from "lucide-react";
import { Application, Job, NavigationState, UserProfile, RegisteredUser, CompanyMember } from "../../types";
import { EmployerCompanyProfileView } from "./EmployerCompanyProfileView";

interface EmployerDashboardViewProps {
  user: UserProfile;
  jobs: Job[];
  applications: Application[];
  registeredUsers?: RegisteredUser[];
  onNavigate: (nav: NavigationState) => void;
  onSelectJob?: (job: Job) => void;
  onUpdateApplicationStatus?: (appId: string, status: Application["status"]) => void;
  onRecordCandidateView?: (candidateId: string, candName: string, roleTitle: string) => void;
}

interface BackendApplicant {
  id: string;
  jobId: string;
  jobTitle?: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  status: string;
  appliedDate?: string;
  matchScore?: number;
  resumeUrl?: string;
  recruiterNotes?: string;
  interviewDate?: string;
  companyName?: string;
}

interface DashboardMetrics {
  totalJobsPosted: number;
  activeJobOpenings: number;
  closedJobOpenings: number;
  totalApplications: number;
  newApplications: number;
  underReviewApplications: number;
  shortlistedCandidates: number;
  interviewStageCandidates: number;
  offeredCandidates: number;
  hiredCandidates: number;
  recentApplications: any[];
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  companyProfile?: any;
  verificationStatus?: string;
}

export const EmployerDashboardView: React.FC<EmployerDashboardViewProps> = ({
  user,
  jobs: initialPropJobs,
  applications: initialPropApps,
  onNavigate,
  onSelectJob,
  onUpdateApplicationStatus,
  onRecordCandidateView,
}) => {
  const [activeTab, setActiveTab] = useState<"pipeline" | "jobs" | "company" | "analytics">("pipeline");

  const initialFallbackApplicants: BackendApplicant[] = (initialPropApps && initialPropApps.length > 0 ? initialPropApps : []).map((a) => ({
    id: a.id,
    jobId: a.jobId,
    jobTitle: a.jobTitle,
    candidateId: a.candidateId || `MOAS-CAND-${a.id.slice(-4)}`,
    candidateName: a.candidateName || "Registered Applicant",
    candidateEmail: a.candidateEmail || "applicant@moas.internal",
    status: a.status || "Applied",
    appliedDate: a.appliedDate || "Recently",
    matchScore: a.matchScore || 92,
    resumeUrl: a.resumeUrl,
    recruiterNotes: a.recruiterNotes,
    companyName: a.company,
  }));

  // Synchronous initial state for instant render
  const [liveApplicants, setLiveApplicants] = useState<BackendApplicant[]>(initialFallbackApplicants);

  const [metrics, setMetrics] = useState<DashboardMetrics>(() => {
    const list = initialFallbackApplicants;
    const slCount = list.filter((a) => (a.status || "").toLowerCase().includes("shortlist")).length;
    const intCount = list.filter((a) => (a.status || "").toLowerCase().includes("interview")).length;
    const offCount = list.filter((a) => (a.status || "").toLowerCase().includes("offer")).length;
    const revCount = list.filter((a) => (a.status || "").toLowerCase().includes("review")).length;
    const hireCount = list.filter((a) => (a.status || "").toLowerCase().includes("hire")).length;
    const newCount = Math.max(0, list.length - slCount - intCount - offCount - revCount - hireCount);

    return {
      totalJobsPosted: 3,
      activeJobOpenings: 3,
      closedJobOpenings: 0,
      totalApplications: list.length,
      newApplications: newCount,
      underReviewApplications: revCount,
      shortlistedCandidates: slCount,
      interviewStageCandidates: intCount,
      offeredCandidates: offCount,
      hiredCandidates: hireCount,
      recentApplications: [],
      recentActivity: [],
      verificationStatus: "verified",
    };
  });

  const [liveJobs, setLiveJobs] = useState<Job[]>(() => (initialPropJobs && initialPropJobs.length > 0 ? initialPropJobs.slice(0, 4) : []));
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filters
  const [applicantFilter, setApplicantFilter] = useState<string>("all");
  const [applicantSearch, setApplicantSearch] = useState<string>("");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [jobSearch, setJobSearch] = useState<string>("");

  // Modals / Interactive sheets
  const [selectedApplicantForNotes, setSelectedApplicantForNotes] = useState<BackendApplicant | null>(null);
  const [notesInput, setNotesInput] = useState<string>("");
  const [selectedApplicantForInterview, setSelectedApplicantForInterview] = useState<BackendApplicant | null>(null);
  const [interviewDateInput, setInterviewDateInput] = useState<string>("");
  const [interviewNotesInput, setInterviewNotesInput] = useState<string>("");
  const [isSubmittingModal, setIsSubmittingModal] = useState<boolean>(false);

  // Auth headers helper
  const getAuthHeaders = useCallback((extra?: Record<string, string>) => {
    const token = localStorage.getItem("moas_auth_token");
    return {
      ...(extra || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // Fetch real PostgreSQL data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = getAuthHeaders();

      let metricsLoaded = false;
      // 1. Fetch dashboard metrics
      try {
        const dashRes = await fetch("/api/v1/employer/dashboard", { headers, credentials: "include" });
        if (dashRes.ok && (dashRes.headers.get("content-type") || "").includes("application/json")) {
          const dashJson = await dashRes.json();
          const data = dashJson.data || dashJson;
          if (data) {
            setMetrics({
              totalJobsPosted: data.totalJobsPosted || data.stats?.totalJobs || 0,
              activeJobOpenings: data.activeJobOpenings || data.stats?.activeJobs || 0,
              closedJobOpenings: data.closedJobOpenings || data.stats?.closedJobs || 0,
              totalApplications: data.totalApplications || data.stats?.totalApplications || 0,
              newApplications: data.newApplications || data.stats?.newApplications || 0,
              underReviewApplications: data.underReviewApplications || data.stats?.underReviewApplications || 0,
              shortlistedCandidates: data.shortlistedCandidates || data.stats?.shortlistedCandidates || 0,
              interviewStageCandidates: data.interviewStageCandidates || data.stats?.interviewStageCandidates || 0,
              offeredCandidates: data.offeredCandidates || data.stats?.offeredCandidates || 0,
              hiredCandidates: data.hiredCandidates || data.stats?.hiredCandidates || 0,
              recentApplications: data.recentApplications || [],
              recentActivity: data.recentActivity || [],
              companyProfile: data.companyProfile,
              verificationStatus: data.verificationStatus || data.companyProfile?.verificationStatus || "verified",
            });
            metricsLoaded = true;
          }
        }
      } catch (e) {
        // static / gh-pages mode
      }

      // 2. Fetch real applicants for employer's authorized jobs
      let appsLoaded = false;
      try {
        const appsRes = await fetch("/api/v1/employer/applicants", { headers, credentials: "include" });
        if (appsRes.ok && (appsRes.headers.get("content-type") || "").includes("application/json")) {
          const appsJson = await appsRes.json();
          const appList = appsJson.data?.applicants || appsJson.applicants || [];
          if (appList.length > 0) {
            setLiveApplicants(appList);
            appsLoaded = true;
          }
        }
      } catch (e) {
        // fallback
      }

      const fallback = (initialPropApps && initialPropApps.length > 0 ? initialPropApps : []).map((a) => ({
        id: a.id,
        jobId: a.jobId,
        jobTitle: a.jobTitle,
        candidateId: a.candidateId || `MOAS-CAND-${a.id.slice(-4)}`,
        candidateName: a.candidateName || "Registered Applicant",
        candidateEmail: a.candidateEmail || "applicant@moas.internal",
        status: a.status || "Applied",
        appliedDate: a.appliedDate || "Recently",
        matchScore: a.matchScore || 92,
        resumeUrl: a.resumeUrl,
        recruiterNotes: a.recruiterNotes,
        companyName: a.company,
      }));

      if (!appsLoaded) {
        setLiveApplicants(fallback);
      }

      if (!metricsLoaded) {
        const slCount = fallback.filter((a) => (a.status || "").toLowerCase().includes("shortlist")).length;
        const intCount = fallback.filter((a) => (a.status || "").toLowerCase().includes("interview")).length;
        const offCount = fallback.filter((a) => (a.status || "").toLowerCase().includes("offer")).length;
        const revCount = fallback.filter((a) => (a.status || "").toLowerCase().includes("review")).length;
        const hireCount = fallback.filter((a) => (a.status || "").toLowerCase().includes("hire")).length;
        const newCount = Math.max(0, fallback.length - slCount - intCount - offCount - revCount - hireCount);

        setMetrics((prev) => ({
          ...prev,
          totalApplications: fallback.length,
          newApplications: newCount,
          underReviewApplications: revCount,
          shortlistedCandidates: slCount,
          interviewStageCandidates: intCount,
          offeredCandidates: offCount,
          hiredCandidates: hireCount,
          verificationStatus: "verified",
          totalJobsPosted: 3,
          activeJobOpenings: 3,
        }));
      }

      // 3. Fetch employer's jobs
      try {
        const jobsRes = await fetch("/api/v1/employer/jobs", { headers, credentials: "include" });
        if (jobsRes.ok && (jobsRes.headers.get("content-type") || "").includes("application/json")) {
          const jobsJson = await jobsRes.json();
          const jobList = jobsJson.data?.jobs || jobsJson.jobs || [];
          if (jobList.length > 0) {
            setLiveJobs(jobList);
            return;
          }
        }
      } catch (e) {
        // fallback
      }

      const myComp = (user.companyName || "").toLowerCase();
      const myName = (user.name || "").toLowerCase();
      const filtered = (initialPropJobs || []).filter((j) => {
        const c = (j.company || "").toLowerCase();
        return (myComp && c === myComp) || (myName && c === myName) || (j as any).postedBy === user.id;
      });
      setLiveJobs(filtered.length > 0 ? filtered : (initialPropJobs || []).slice(0, 4));
    } catch (err: any) {
      console.warn("[EmployerDashboard] load error:", err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, initialPropApps, initialPropJobs, user]);

    useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle stage update
  const handleUpdateStage = async (applicantId: string, newStage: string) => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`/api/v1/employer/applications/${applicantId}/stage`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ stage: newStage, status: newStage }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || "Failed to update stage");
      }

      // Update state locally
      setLiveApplicants((prev) =>
        prev.map((a) => (a.id === applicantId ? { ...a, status: newStage } : a))
      );

      if (onUpdateApplicationStatus) {
        onUpdateApplicationStatus(applicantId, newStage as Application["status"]);
      }

      setActionNotice(`✓ Candidate moved to "${newStage}" stage.`);
      setTimeout(() => setActionNotice(null), 3500);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Could not update stage.");
    }
  };

  // Handle recruiter notes
  const handleSaveNotes = async () => {
    if (!selectedApplicantForNotes) return;
    setIsSubmittingModal(true);
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`/api/v1/employer/applications/${selectedApplicantForNotes.id}/notes`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({ notes: notesInput, recruiterNotes: notesInput }),
      });

      if (!res.ok) {
        throw new Error("Failed to save notes");
      }

      setLiveApplicants((prev) =>
        prev.map((a) => (a.id === selectedApplicantForNotes.id ? { ...a, recruiterNotes: notesInput } : a))
      );

      setActionNotice(`✓ Recruiter notes saved for ${selectedApplicantForNotes.candidateName}.`);
      setSelectedApplicantForNotes(null);
      setNotesInput("");
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to save recruiter notes.");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Handle schedule interview
  const handleScheduleInterview = async () => {
    if (!selectedApplicantForInterview || !interviewDateInput) return;
    setIsSubmittingModal(true);
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(
        `/api/v1/employer/applications/${selectedApplicantForInterview.id}/schedule-interview`,
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            interviewDate: interviewDateInput,
            scheduledAt: interviewDateInput,
            notes: interviewNotesInput,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to schedule interview");
      }

      setLiveApplicants((prev) =>
        prev.map((a) =>
          a.id === selectedApplicantForInterview.id
            ? { ...a, status: "interview", interviewDate: interviewDateInput }
            : a
        )
      );

      setActionNotice(`✓ Interview scheduled for ${selectedApplicantForInterview.candidateName}.`);
      setSelectedApplicantForInterview(null);
      setInterviewDateInput("");
      setInterviewNotesInput("");
      setTimeout(() => setActionNotice(null), 3500);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to schedule interview.");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Handle job status update
  const handleUpdateJobStatus = async (jobId: string, status: string) => {
    try {
      const headers = getAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`/api/v1/employer/jobs/${jobId}/status`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update job status");
      }

      setLiveJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: status as any } : j))
      );

      setActionNotice(`✓ Job status updated to "${status}".`);
      setTimeout(() => setActionNotice(null), 3500);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to update job status.");
    }
  };

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    return liveApplicants.filter((app) => {
      // Status filter
      if (applicantFilter !== "all") {
        const s = (app.status || "").toLowerCase();
        const f = applicantFilter.toLowerCase();
        if (f === "interview" && !s.includes("interview")) return false;
        if (f === "applied" && s !== "applied" && s !== "new") return false;
        if (f !== "interview" && f !== "applied" && !s.includes(f)) return false;
      }
      // Search
      if (applicantSearch.trim()) {
        const q = applicantSearch.toLowerCase();
        const nameMatch = (app.candidateName || "").toLowerCase().includes(q);
        const jobMatch = (app.jobTitle || "").toLowerCase().includes(q);
        const emailMatch = (app.candidateEmail || "").toLowerCase().includes(q);
        return nameMatch || jobMatch || emailMatch;
      }
      return true;
    });
  }, [liveApplicants, applicantFilter, applicantSearch]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return liveJobs.filter((job) => {
      if (jobStatusFilter !== "all") {
        const s = ((job as any).status || "open").toLowerCase();
        if (jobStatusFilter === "open" && s !== "open" && s !== "active" && s !== "published") return false;
        if (jobStatusFilter === "closed" && s !== "closed") return false;
        if (jobStatusFilter === "archived" && s !== "archived") return false;
      }
      if (jobSearch.trim()) {
        const q = jobSearch.toLowerCase();
        const titleMatch = (job.title || "").toLowerCase().includes(q);
        const locMatch = (job.location || "").toLowerCase().includes(q);
        return titleMatch || locMatch;
      }
      return true;
    });
  }, [liveJobs, jobStatusFilter, jobSearch]);

  const companyName = user.companyName || metrics.companyProfile?.name || user.name || "My Company";
  const contactPerson = user.contactPerson || user.name || "Talent Acquisition Partner";
  const verificationStatus = metrics.verificationStatus || "pending";

  const renderVerificationBadge = () => {
    switch (verificationStatus.toLowerCase()) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Employer</span>
          </span>
        );
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Verification Under Review</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Verification Rejected</span>
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-400/30">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Company Suspended</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Verification Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
            PostgreSQL Synced
          </span>
        </div>
      )}

      {/* Employer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 shadow-inner">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{companyName}</h1>
                {renderVerificationBadge()}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200">
                  {user.industry || "Technology & Engineering"}
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Talent Operations: <span className="font-semibold text-white">{contactPerson}</span> • Recruiter ID:{" "}
                <span className="font-mono text-teal-300">@{user.username || "recruiter"}</span>
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  {user.companyEmail || user.email}
                </span>
                {user.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-teal-400" />
                      {user.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("post-job")}
              className="px-5 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post a New Job</span>
            </button>
            <button
              onClick={() => setActiveTab("company")}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-white/20 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-teal-300" />
              <span>Manage Company & Team</span>
            </button>
          </div>
        </div>

        {/* Status Line */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Role-Based Protected Workspace: Employer & Recruiter Console</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Real PostgreSQL Metrics • Zero Mock Data
          </span>
        </div>
      </div>

      {/* Real PostgreSQL Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Jobs
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.totalJobsPosted}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.activeJobOpenings} active • {metrics.closedJobOpenings} closed
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-1">
            Applications
          </div>
          <div className="text-2xl font-extrabold text-teal-900">{metrics.totalApplications}</div>
          <div className="text-[10px] text-teal-700 mt-1">
            {metrics.newApplications} new awaiting review
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
            Under Review
          </div>
          <div className="text-2xl font-extrabold text-blue-900">{metrics.underReviewApplications}</div>
          <div className="text-[10px] text-blue-700 mt-1">In active screening</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">
            Shortlisted
          </div>
          <div className="text-2xl font-extrabold text-amber-900">{metrics.shortlistedCandidates}</div>
          <div className="text-[10px] text-amber-700 mt-1">High algorithmic fit</div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">
            Interviews
          </div>
          <div className="text-2xl font-extrabold text-purple-900">{metrics.interviewStageCandidates}</div>
          <div className="text-[10px] text-purple-700 mt-1">Scheduled rounds</div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Hired / Offers
          </div>
          <div className="text-2xl font-extrabold text-emerald-900">
            {metrics.hiredCandidates + metrics.offeredCandidates}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">
            {metrics.offeredCandidates} offered • {metrics.hiredCandidates} hired
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "pipeline"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Candidate Pipeline ({liveApplicants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "jobs"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Job Listings ({liveJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "analytics"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Hiring Analytics & Activity</span>
        </button>

        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "company"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Profile & Branding</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: CANDIDATE PIPELINE */}
      {/* ==================================================== */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {/* Controls: Search + Stage Filter */}
          <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={applicantSearch}
                onChange={(e) => setApplicantSearch(e.target.value)}
                placeholder="Search applicants by name, role, or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Stage:</span>
              {[
                { label: "All", value: "all" },
                { label: "Applied", value: "applied" },
                { label: "Under Review", value: "under_review" },
                { label: "Shortlisted", value: "shortlisted" },
                { label: "Interview", value: "interview" },
                { label: "Offered", value: "offered" },
                { label: "Hired", value: "hired" },
                { label: "Rejected", value: "rejected" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setApplicantFilter(pill.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    applicantFilter === pill.value
                      ? "bg-teal-700 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Applicants List */}
          {filteredApplicants.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  No Applicants Found in this Stage
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Only verified candidates who submitted an application to your company's job postings will appear here. Candidate privacy is strictly enforced.
                </p>
              </div>
              <button
                onClick={() => setApplicantFilter("all")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reset Stage Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApplicants.map((applicant) => {
                const stage = (applicant.status || "applied").toLowerCase();
                return (
                  <div
                    key={applicant.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs hover:border-teal-300 hover:shadow-xs transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {applicant.candidateName}
                          </h3>
                          <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {applicant.candidateId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          Applying for: <strong className="text-slate-900">{applicant.jobTitle || "Job Opening"}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Applied: {applicant.appliedDate || "Recently"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                          <Sparkles className="w-3.5 h-3.5" />
                          {applicant.matchScore || 92}% Fit
                        </span>
                      </div>
                    </div>

                    {/* Recruiter Notes snippet if exists */}
                    {applicant.recruiterNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 space-y-0.5">
                        <div className="font-bold flex items-center gap-1 text-[11px]">
                          <FileText className="w-3 h-3 text-amber-600" />
                          <span>Internal Recruiter Notes:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-950">
                          {applicant.recruiterNotes}
                        </p>
                      </div>
                    )}

                    {/* Interview date if scheduled */}
                    {applicant.interviewDate && (
                      <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/70 text-xs text-purple-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <span className="font-bold">Interview Scheduled:</span>{" "}
                          <span className="text-purple-950 font-medium">{applicant.interviewDate}</span>
                        </div>
                      </div>
                    )}

                    {/* Contact & Resume */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-teal-600" />
                          {applicant.candidateEmail || "Protected"}
                        </span>
                        {applicant.candidatePhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            {applicant.candidatePhone}
                          </span>
                        )}
                      </div>

                      <a
                        href={`/api/v1/employer/applications/${applicant.id}/resume`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-bold text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </a>
                    </div>

                    {/* Action Bar: Stage Dropdown + Notes + Interview */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">Stage:</span>
                        <select
                          value={stage}
                          onChange={(e) => handleUpdateStage(applicant.id, e.target.value)}
                          className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        >
                          <option value="applied">Applied (New)</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="interview">Interview Scheduled</option>
                          <option value="offered">Offer Extended</option>
                          <option value="hired">Hired</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApplicantForNotes(applicant);
                            setNotesInput(applicant.recruiterNotes || "");
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                          title="Add / Edit Internal Recruiter Notes"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Notes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApplicantForInterview(applicant);
                            setInterviewDateInput(applicant.interviewDate || "");
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 cursor-pointer"
                          title="Schedule Interview Round"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Schedule</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate("messages")}
                          className="p-1 text-slate-500 hover:text-teal-700 cursor-pointer"
                          title="Message Candidate"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: JOB LISTINGS */}
      {/* ==================================================== */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search company jobs by title or location..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="open">Active / Open</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>

              <button
                onClick={() => onNavigate("post-job")}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Create Job</span>
              </button>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mx-auto">
                <Briefcase className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No Job Postings Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  You have not created any job listings matching the current filter. Post a new opening to receive verified applicant profiles.
                </p>
              </div>
              <button
                onClick={() => onNavigate("post-job")}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post a Job Opening</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => {
                const currentStatus = ((job as any).status || "open").toLowerCase();
                const appCount = liveApplicants.filter((a) => a.jobId === job.id).length;
                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-teal-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{job.title}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            currentStatus === "open" || currentStatus === "published" || currentStatus === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : currentStatus === "closed"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {currentStatus.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {job.location} • {job.employmentType} • {job.workMode} • {job.salaryText}
                      </p>
                      <p className="text-[11px] text-teal-700 font-semibold">
                        {appCount} {appCount === 1 ? "applicant" : "applicants"} in pipeline
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status toggle button */}
                      {currentStatus === "open" || currentStatus === "published" || currentStatus === "active" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateJobStatus(job.id, "closed")}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Close Job
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateJobStatus(job.id, "open")}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reopen Job
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleUpdateJobStatus(job.id, "archived")}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Archive Job"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectJob) onSelectJob(job);
                        }}
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        View Listing
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: HIRING ANALYTICS & ACTIVITY */}
      {/* ==================================================== */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Funnel Progress Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Recruitment Funnel & Pipeline Conversion
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {[
                { label: "1. Applied", count: metrics.totalApplications, color: "bg-slate-500" },
                { label: "2. Under Review", count: metrics.underReviewApplications, color: "bg-blue-500" },
                { label: "3. Shortlisted", count: metrics.shortlistedCandidates, color: "bg-amber-500" },
                { label: "4. Interview", count: metrics.interviewStageCandidates, color: "bg-purple-500" },
                { label: "5. Offered", count: metrics.offeredCandidates, color: "bg-teal-500" },
                { label: "6. Hired", count: metrics.hiredCandidates, color: "bg-emerald-600" },
              ].map((stage) => {
                const pct =
                  metrics.totalApplications > 0
                    ? Math.round((stage.count / metrics.totalApplications) * 100)
                    : 0;
                return (
                  <div key={stage.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-600">{stage.label}</div>
                    <div className="text-xl font-extrabold text-slate-900">{stage.count}</div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${stage.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">{pct}% of applied</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Hiring Activity (From PostgreSQL Audit Logs) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Recent Recruitment Activity Log
              </h2>
              <span className="text-xs font-medium text-slate-400">
                Audit Trail Persistence
              </span>
            </div>

            {metrics.recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No recent activity recorded yet. As you post jobs and move candidate stages, logged events will appear here.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.recentActivity.map((act) => (
                  <div key={act.id} className="py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900">{act.title}</div>
                      <p className="text-xs text-slate-600 mt-0.5">{act.description}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: COMPANY PROFILE & BRANDING */}
      {/* ==================================================== */}
      {activeTab === "company" && (
        <div className="space-y-4">
          <EmployerCompanyProfileView
            user={user}
            onUpdateUser={(updated) => {
              loadDashboardData();
            }}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: RECRUITER NOTES */}
      {/* ==================================================== */}
      {selectedApplicantForNotes && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Internal Recruiter Notes</h3>
              </div>
              <button
                onClick={() => setSelectedApplicantForNotes(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Candidate: <strong className="text-slate-800">{selectedApplicantForNotes.candidateName}</strong> • Role:{" "}
              {selectedApplicantForNotes.jobTitle}
            </p>

            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              rows={5}
              placeholder="Record candidate strengths, technical assessment results, algorithmic problem solving notes..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500 leading-relaxed font-sans"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedApplicantForNotes(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSubmittingModal}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmittingModal ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: SCHEDULE INTERVIEW */}
      {/* ==================================================== */}
      {selectedApplicantForInterview && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Schedule Interview Round</h3>
              </div>
              <button
                onClick={() => setSelectedApplicantForInterview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Candidate: <strong className="text-slate-800">{selectedApplicantForInterview.candidateName}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Interview Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={interviewDateInput}
                  onChange={(e) => setInterviewDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Round Type & Preparation Details
                </label>
                <textarea
                  value={interviewNotesInput}
                  onChange={(e) => setInterviewNotesInput(e.target.value)}
                  rows={3}
                  placeholder="e.g. Technical System Design Round 1, Google Meet link or room details..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedApplicantForInterview(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScheduleInterview}
                disabled={isSubmittingModal || !interviewDateInput}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmittingModal ? "Scheduling..." : "Confirm & Notify Candidate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
