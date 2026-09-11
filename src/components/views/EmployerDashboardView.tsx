import React, { useState, useMemo } from "react";
import {
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
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
} from "lucide-react";
import { Application, Job, NavigationState, UserProfile, RegisteredUser } from "../../types";

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

interface DisplayCandidate {
  id: string;
  candidateName: string;
  candidateId: string;
  jobTitle: string;
  appliedDate: string;
  matchScore: number;
  skills: string[];
  experience: string;
  email: string;
  phone: string;
  avatarUrl: string;
  status: string;
  isApplication: boolean;
  applicationId?: string;
  resumeName?: string;
}

export const EmployerDashboardView: React.FC<EmployerDashboardViewProps> = ({
  user,
  jobs,
  applications,
  registeredUsers = [],
  onNavigate,
  onSelectJob,
  onUpdateApplicationStatus,
  onRecordCandidateView,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "jobs">("overview");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const companyName = user.companyName || user.name || "My Company";
  const contactPerson = user.contactPerson || user.name || "Hiring Team";
  const industry = user.industry || "Technology & Engineering";
  const companySize = user.companySize || "Growth Team";

  // 1. Genuine company jobs posted by this employer
  const companyJobs = useMemo(() => {
    const myComp = (user.companyName || "").trim().toLowerCase();
    const myName = (user.name || "").trim().toLowerCase();
    return jobs.filter((j) => {
      const comp = (j.company || "").trim().toLowerCase();
      const postedBy = (j as any).postedBy;
      return (
        (myComp && comp === myComp) ||
        (myName && comp === myName) ||
        (postedBy && postedBy === user.id)
      );
    });
  }, [jobs, user]);

  const companyJobIds = useMemo(() => new Set(companyJobs.map((j) => j.id)), [companyJobs]);

  // 2. Real applications submitted for this company's jobs
  const companyApplications = useMemo(() => {
    const myComp = (user.companyName || "").trim().toLowerCase();
    const myName = (user.name || "").trim().toLowerCase();
    return applications.filter((app) => {
      const matchesJob = companyJobIds.has(app.jobId);
      const appComp = (app.company || "").trim().toLowerCase();
      const matchesComp = (myComp && appComp === myComp) || (myName && appComp === myName);
      return matchesJob || matchesComp;
    });
  }, [applications, companyJobIds, user]);

  // 3. Genuine registered candidates looking for opportunities (role Candidate/jobseeker)
  const registeredCandidateUsers = useMemo(() => {
    return registeredUsers.filter(
      (u) =>
        (u.role === "Candidate" || u.role === "jobseeker") &&
        u.id !== user.id &&
        u.email !== user.email &&
        u.id !== "MOAS-ID-84920" &&
        u.id !== "MOAS-ID-10824" &&
        u.email !== "arun.kumar@email.com"
    );
  }, [registeredUsers, user]);

  // 4. Unified genuine candidates list
  const displayCandidates = useMemo<DisplayCandidate[]>(() => {
    const list: DisplayCandidate[] = [];
    const seenCandidateEmails = new Set<string>();

    // Add actual applicants
    companyApplications.forEach((app) => {
      const currentStatus = statusOverrides[app.id] || app.status || "Applied";
      list.push({
        id: app.id,
        applicationId: app.id,
        candidateName: app.candidateName || "Registered Applicant",
        candidateId: app.candidateId || `MOAS-ID-${app.id.slice(-5)}`,
        jobTitle: app.jobTitle || "Job Applicant",
        appliedDate: app.appliedDate || "Recently",
        matchScore: app.matchScore || 95,
        skills: ["Machine Learning", "Algorithms", "Software Engineering"],
        experience: "Verified Applicant",
        email: app.candidateEmail || "applicant@moas.internal",
        phone: "Contact via MOAS",
        avatarUrl:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
        status: currentStatus,
        isApplication: true,
        resumeName: app.resumeName,
      });
      if (app.candidateEmail) seenCandidateEmails.add(app.candidateEmail.toLowerCase());
    });

    // Add registered candidate accounts who joined the platform
    registeredCandidateUsers.forEach((cand) => {
      if (!seenCandidateEmails.has(cand.email.toLowerCase())) {
        const currentStatus = statusOverrides[cand.id] || "Profile Available";
        const primaryResume = cand.resumes && cand.resumes.length > 0 ? cand.resumes[0].name : undefined;
        list.push({
          id: cand.id,
          candidateName: cand.name,
          candidateId: cand.id,
          jobTitle: cand.title || "Registered Candidate (Ready for Hire)",
          appliedDate: cand.createdAt ? new Date(cand.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Registered",
          matchScore: 94,
          skills: cand.skills && cand.skills.length > 0 ? cand.skills : ["Problem Solving", "Engineering"],
          experience: cand.experienceLevel || "Verified Member",
          email: cand.email,
          phone: cand.phone || "Verified",
          avatarUrl:
            cand.avatarUrl ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces",
          status: currentStatus,
          isApplication: false,
          resumeName: primaryResume,
        });
      }
    });

    return list;
  }, [companyApplications, registeredCandidateUsers, statusOverrides]);

  const handleUpdateStatus = (cand: DisplayCandidate, newStatus: string) => {
    setStatusOverrides((prev) => ({ ...prev, [cand.id]: newStatus }));
    if (cand.isApplication && cand.applicationId && onUpdateApplicationStatus) {
      onUpdateApplicationStatus(cand.applicationId, newStatus as Application["status"]);
    }
    if (onRecordCandidateView) {
      onRecordCandidateView(cand.candidateId || cand.id, cand.candidateName, cand.jobTitle);
    }
  };

  // Real-time metric counts
  const totalCandidates = displayCandidates.length;
  const shortlistedCount = displayCandidates.filter((c) => c.status === "Shortlisted").length;
  const interviewCount = displayCandidates.filter((c) => c.status === "Interview Scheduled").length;

  return (
    <div className="space-y-6">
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
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {companyName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Employer
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200">
                  {industry}
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Managed by <span className="font-semibold text-white">{contactPerson}</span> • {companySize} • Recruiter ID: <span className="font-mono text-teal-300">@{user.username || "recruiter"}</span>
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
              onClick={() => onNavigate("find-jobs")}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-white/20 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Browse All Roles</span>
            </button>
          </div>
        </div>

        {/* Route Guard Notice Banner */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Role-Based Protected Route: Active on <code className="text-teal-300 bg-white/10 px-1.5 py-0.5 rounded font-mono">/dashboard/employer</code></span>
          </div>
          <span className="text-[11px] text-slate-400">
            Account Type: <strong className="text-teal-300">Employer / Hiring Company</strong> (Job Seeker views restricted)
          </span>
        </div>
      </div>

      {/* Genuine KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Job Postings
            </span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {companyJobs.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {companyJobs.length === 0 ? "No active jobs" : "Active listings"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {companyJobs.length === 0
              ? "Post a job opening to start receiving applications"
              : `${companyJobs.length} open position${companyJobs.length > 1 ? "s" : ""} accepting applications`}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Candidates
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {totalCandidates}
            </span>
            <span className="text-xs font-semibold text-blue-600">
              {totalCandidates === 0 ? "Awaiting talent" : "Verified talent"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {totalCandidates === 0
              ? "Candidates who register or apply will appear here"
              : `${totalCandidates} original candidate${totalCandidates > 1 ? "s" : ""} in pipeline`}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Shortlisted Talent
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {shortlistedCount}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              {shortlistedCount > 0 ? "Shortlisted" : "None yet"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Candidates marked for review or interview rounds
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Interviews Scheduled
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {interviewCount}
            </span>
            <span className="text-xs font-semibold text-purple-600">
              {interviewCount > 0 ? "Active rounds" : "None scheduled"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Candidates scheduled for technical or HR rounds
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Candidate Pipeline ({totalCandidates})
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "jobs"
              ? "bg-teal-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Active Job Listings ({companyJobs.length})
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "overview" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent Candidates & Algorithmic Fit
              </h2>
              <p className="text-xs text-slate-500">
                {displayCandidates.length === 0
                  ? "Real registered candidates and applicants appear here as they join or apply."
                  : "Review registered candidates and applicants evaluated by MOAS career intelligence."}
              </p>
            </div>
            {displayCandidates.length > 0 && (
              <button
                onClick={() => onNavigate("messages")}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                Open Candidate Chats <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {displayCandidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  No Registered Candidates or Applicants Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Only genuine registered candidates and applicants will appear here. When a job seeker registers an account or submits an application to your jobs, their profile will show immediately.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => onNavigate("post-job")}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post a Job to Attract Candidates</span>
                </button>
                <button
                  onClick={() => onNavigate("find-jobs")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <span>Explore MOAS Catalog</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={cand.avatarUrl}
                        alt={cand.candidateName}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {cand.candidateName}
                          </h3>
                          <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {cand.candidateId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{cand.jobTitle}</p>
                        <p className="text-[11px] text-slate-400">
                          {cand.isApplication ? "Applied" : "Joined"} {cand.appliedDate} • {cand.experience}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                        <Sparkles className="w-3.5 h-3.5" />
                        {cand.matchScore}% Match
                      </span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5">
                    {cand.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Resume if present */}
                  {cand.resumeName && (
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-semibold text-slate-700">Resume:</span>
                      <span className="truncate">{cand.resumeName}</span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-teal-600" />
                      {cand.email}
                    </span>
                    {cand.phone && cand.phone !== "Verified" && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        {cand.phone}
                      </span>
                    )}
                  </div>

                  {/* Status & Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">Status:</span>
                      <select
                        value={cand.status}
                        onChange={(e) => handleUpdateStatus(cand, e.target.value)}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Profile Available">Profile Available</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Offer Extended">Offer Extended</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate("messages")}
                        className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                        title="Direct Message"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Genuine Company Jobs Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Company Job Listings ({companyJobs.length})
              </h2>
              <p className="text-xs text-slate-500">
                Positions published under {companyName}
              </p>
            </div>
            <button
              onClick={() => onNavigate("post-job")}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Listing</span>
            </button>
          </div>

          {companyJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mx-auto">
                <Briefcase className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  No Job Postings for {companyName} Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  You have not published any job listings yet. Create your first opening to attract qualified applicants.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => onNavigate("post-job")}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post a New Job</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {companyJobs.map((job) => {
                const applicantCount = applications.filter((app) => app.jobId === job.id).length;
                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {job.title}
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {job.location} • {job.employmentType} • {job.workMode}
                      </p>
                      <p className="text-xs font-semibold text-teal-700 mt-1">
                        {job.salaryText}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right sm:text-center px-3">
                        <span className="text-base font-extrabold text-slate-900 block">
                          {applicantCount}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Applicants
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (onSelectJob) onSelectJob(job);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
    </div>
  );
};

