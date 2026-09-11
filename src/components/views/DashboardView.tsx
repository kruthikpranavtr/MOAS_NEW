import React, { useState } from "react";
import {
  FileText,
  Bookmark,
  Eye,
  Bell,
  Plus,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Briefcase,
  ChevronRight,
  Sparkles,
  Award,
  AlertCircle,
  Play,
  RotateCcw,
  GraduationCap,
  X,
  Check,
} from "lucide-react";
import { Application, Job, JobAlert, NavigationState, UserProfile, ProfileViewEvent } from "../../types";

interface DashboardViewProps {
  user: UserProfile;
  applications: Application[];
  jobs: Job[];
  alerts?: JobAlert[];
  profileViews?: number;
  viewEvents?: ProfileViewEvent[];
  onNavigate: (nav: NavigationState) => void;
  onSelectJob: (job: Job) => void;
  onToggleSaveJob: (jobId: string) => void;
  onUpdateUser?: (updated: UserProfile) => void;
  onUpdateApplicationStatus?: (appId: string, status: Application["status"]) => void;
  onQuickApplySample?: (count: number) => void;
  onOpenLiveViewsModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  applications,
  jobs,
  alerts = [],
  profileViews = 0,
  viewEvents = [],
  onNavigate,
  onSelectJob,
  onToggleSaveJob,
  onUpdateUser,
  onUpdateApplicationStatus,
  onQuickApplySample,
  onOpenLiveViewsModal,
}) => {
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [eduDegree, setEduDegree] = useState("");
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduYear, setEduYear] = useState("2024");
  const [changingAppId, setChangingAppId] = useState<string | null>(null);

  const totalApplications = applications.length;
  const savedJobsCount = jobs.filter((j) => j.isSaved).length;
  const activeAlertsCount = alerts.filter((a) => a.active).length;

  // Real-time dynamic status breakdown
  const appliedCount = applications.filter((a) => a.status === "Applied").length;
  const underReviewCount = applications.filter((a) => a.status === "Under Review").length;
  const shortlistedCount = applications.filter((a) => a.status === "Shortlisted").length;
  const interviewCount = applications.filter((a) => a.status === "Interview Scheduled").length;
  const rejectedCount = applications.filter((a) => a.status === "Rejected").length;

  const statusBreakdown = [
    {
      label: "Applied",
      count: appliedCount,
      pct: totalApplications > 0 ? Math.round((appliedCount / totalApplications) * 100) : 0,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      barBg: "bg-blue-500",
    },
    {
      label: "Under Review",
      count: underReviewCount,
      pct: totalApplications > 0 ? Math.round((underReviewCount / totalApplications) * 100) : 0,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      barBg: "bg-amber-500",
    },
    {
      label: "Shortlisted",
      count: shortlistedCount,
      pct: totalApplications > 0 ? Math.round((shortlistedCount / totalApplications) * 100) : 0,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
      barBg: "bg-emerald-500",
    },
    {
      label: "Interview Scheduled",
      count: interviewCount,
      pct: totalApplications > 0 ? Math.round((interviewCount / totalApplications) * 100) : 0,
      color: "bg-teal-500",
      textColor: "text-teal-600",
      barBg: "bg-teal-500",
    },
    {
      label: "Rejected",
      count: rejectedCount,
      pct: totalApplications > 0 ? Math.round((rejectedCount / totalApplications) * 100) : 0,
      color: "bg-rose-500",
      textColor: "text-rose-600",
      barBg: "bg-rose-500",
    },
  ];

  // Dynamic Profile Strength calculation
  const hasWorkExp = Boolean(user.experienceLevel && user.experienceLevel.trim());
  const hasResume = Boolean(user.resumes && user.resumes.length > 0);
  const hasSkills = Boolean(user.skills && user.skills.length >= 3);
  const hasEducation = Boolean(user.education && user.education.length > 0);

  const checklistItems = [
    {
      id: "exp",
      title: "Add Work Experience",
      completed: hasWorkExp,
      valueText: user.experienceLevel || "Experience Listed",
      actionText: "+ Add Experience",
      onClick: () => onNavigate("profile"),
    },
    {
      id: "resume",
      title: "Upload Resume / CV",
      completed: hasResume,
      valueText: user.resumes && user.resumes.length > 0 ? `${user.resumes.length} Uploaded` : "Active CV",
      actionText: "+ Upload Resume",
      onClick: () => onNavigate("resume-cv"),
    },
    {
      id: "skills",
      title: "Add Core Technical Skills",
      completed: hasSkills,
      valueText: user.skills && user.skills.length > 0 ? `${user.skills.length} Skills Added` : "Skills Set",
      actionText: "+ Add Skills",
      onClick: () => onNavigate("profile"),
    },
    {
      id: "education",
      title: "Add Higher Education Details",
      completed: hasEducation,
      valueText: user.education && user.education.length > 0 ? user.education[0].degree : "Completed",
      actionText: "+ Add Now",
      onClick: () => setIsEducationModalOpen(true),
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const calculatedStrength = Math.round((completedCount / checklistItems.length) * 100);

  const handleSaveEducation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduDegree.trim() || !eduInstitution.trim()) return;

    const newEdu = {
      id: `edu-${Date.now()}`,
      degree: eduDegree.trim(),
      institution: eduInstitution.trim(),
      year: eduYear,
    };

    const updatedUser: UserProfile = {
      ...user,
      education: [...(user.education || []), newEdu],
      profileStrength: 100,
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
    setIsEducationModalOpen(false);
    setEduDegree("");
    setEduInstitution("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-teal-800 via-teal-900 to-[#0F2E4D] rounded-3xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-400/20 text-teal-200 rounded-full text-xs font-semibold mb-2 border border-teal-300/30">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>MOAS Candidate Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
            {totalApplications === 0
              ? "Welcome to your MOAS portal. Browse verified tech roles, submit applications with 1-click, and track your interview pipeline in real-time."
              : `Here's your live career pipeline today: ${totalApplications} application${
                  totalApplications === 1 ? "" : "s"
                } submitted, ${savedJobsCount} saved role${
                  savedJobsCount === 1 ? "" : "s"
                }, and ${profileViews} recruiter view${profileViews === 1 ? "" : "s"}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => onNavigate("find-jobs")}
            className="px-4 py-2.5 bg-teal-700/80 hover:bg-teal-700 border border-teal-500/40 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>Browse Jobs</span>
          </button>
          <button
            onClick={() => onNavigate("post-job")}
            className="px-5 py-2.5 bg-teal-400 hover:bg-teal-300 active:bg-teal-500 text-teal-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post a Job</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Applications */}
        <div
          onClick={() => onNavigate("my-applications")}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Applications
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {totalApplications}
            </span>
            {totalApplications > 0 ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {totalApplications} Active
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">0 Active</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total jobs applied</p>
        </div>

        {/* Saved Jobs */}
        <div
          onClick={() => onNavigate("saved-jobs")}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-blue-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saved Jobs
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bookmark className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {savedJobsCount}
            </span>
            {savedJobsCount > 0 ? (
              <span className="text-xs font-semibold text-blue-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {savedJobsCount} Saved
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">0 Saved</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Bookmarked opportunities</p>
        </div>

        {/* Profile Views */}
        <div
          onClick={() => (onOpenLiveViewsModal ? onOpenLiveViewsModal() : onNavigate("profile"))}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Profile Views
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Eye className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {profileViews}
            </span>
            {profileViews > 0 ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{profileViews} Verified
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">0 Live Views</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Recruiter impressions</span>
            <span className="text-emerald-700 font-semibold group-hover:underline text-[10px]">Live Audit →</span>
          </p>
        </div>

        {/* Job Alerts */}
        <div
          onClick={() => onNavigate("job-alerts")}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Job Alerts
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bell className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {activeAlertsCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {activeAlertsCount > 0 ? "Active" : "None"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Real-time matching filters</p>
        </div>
      </div>

      {/* Quick Test & Verification Toolbar */}
      {onQuickApplySample && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                Live Pipeline Verification Toolbar
              </p>
              <p className="text-[11px] text-slate-400">
                Test real metric calculation with 1 application or 20 applications:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onQuickApplySample(1)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Test 1 Job (Shows 1)
            </button>
            <button
              onClick={() => onQuickApplySample(20)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Test 20 Jobs (Shows 20)
            </button>
            <button
              onClick={() => onQuickApplySample(0)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              title="Reset applications to zero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset (0)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Application Overview Donut & Status Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Application Overview Donut / Bar Breakdown */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Application Overview</h3>
              <p className="text-xs text-slate-500">Distribution by pipeline phase</p>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-3 py-1 rounded-full">
              {totalApplications} Total
            </span>
          </div>

          {/* Graphical Representation */}
          <div className="mt-5 space-y-3.5">
            {statusBreakdown.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="font-bold text-slate-900">
                    {item.count} ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {totalApplications === 0 && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-center">
              <p className="text-xs text-slate-500">
                You haven't applied to any jobs yet. Browse openings to see live pipeline analytics.
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {totalApplications > 0
                ? `${totalApplications} active application${totalApplications === 1 ? "" : "s"} tracked`
                : "No applications active"}
            </span>
            <button
              onClick={() => onNavigate("my-applications")}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Tracker</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Profile Strength Card */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Profile Strength</h3>
                <p className="text-xs text-slate-500">MOAS Algorithmic Match Index</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                {calculatedStrength}% {calculatedStrength >= 100 ? "Complete" : calculatedStrength >= 75 ? "Strong" : "In Progress"}
              </span>
            </div>

            {/* Checklist */}
            <div className="mt-5 space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                    item.completed
                      ? "bg-slate-50/80 border border-slate-100"
                      : "bg-teal-50/70 border border-teal-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.completed ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4.5 h-4.5 text-teal-700 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {item.title}
                      </span>
                      {item.completed && (
                        <span className="text-[11px] text-slate-500">
                          {item.valueText}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.completed ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={item.onClick}
                      className="text-xs font-bold text-teal-800 hover:text-teal-900 underline cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs"
                    >
                      {item.actionText}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {calculatedStrength === 100
                ? "Profile 100% complete! Recruiter reach maximized."
                : "Complete remaining items to reach 100% recruiter visibility."}
            </span>
            <button
              onClick={() => onNavigate("resume-cv")}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Optimize Resume</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Applications & Recommended Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Applications List */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-500">
                {totalApplications > 0
                  ? `Showing latest of ${totalApplications} active application${totalApplications === 1 ? "" : "s"}`
                  : "Track active recruitment updates"}
              </p>
            </div>
            {totalApplications > 0 && (
              <button
                onClick={() => onNavigate("my-applications")}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
              >
                View All ({totalApplications})
              </button>
            )}
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {applications.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No applications submitted yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When you apply to jobs, your real-time status updates and pipeline breakdown will appear here.
                </p>
                <button
                  onClick={() => onNavigate("find-jobs")}
                  className="mt-3 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Browse Available Jobs
                </button>
              </div>
            ) : (
              applications.slice(0, 5).map((app) => (
                <div key={app.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={app.logo}
                      alt={app.company}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl p-1 border border-slate-100 object-contain bg-slate-50 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {app.jobTitle}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">
                        {app.company} • {app.location}
                      </p>
                      <span className="text-[10px] text-slate-400">Applied {app.appliedDate}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        app.status === "Shortlisted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : app.status === "Under Review"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : app.status === "Interview Scheduled"
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : app.status === "Rejected"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {app.status}
                    </span>

                    {/* Fast Status Switcher to test pipeline */}
                    {onUpdateApplicationStatus && (
                      <select
                        value={app.status}
                        onChange={(e) =>
                          onUpdateApplicationStatus(
                            app.id,
                            e.target.value as Application["status"]
                          )
                        }
                        className="text-[10px] py-0.5 px-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        title="Update application status to test pipeline analytics"
                      >
                        <option value="Applied">Move to Applied</option>
                        <option value="Under Review">Move to Under Review</option>
                        <option value="Shortlisted">Move to Shortlisted</option>
                        <option value="Interview Scheduled">Move to Interview</option>
                        <option value="Rejected">Move to Rejected</option>
                      </select>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recommended Jobs */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recommended for You</h3>
              <p className="text-xs text-slate-500">Verified algorithmic and tech positions</p>
            </div>
            <button
              onClick={() => onNavigate("find-jobs")}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              Explore All ({jobs.length})
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {jobs.length === 0 ? (
              <div className="py-8 text-center">
                <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No jobs posted yet</p>
                <p className="text-[11px] text-slate-400 mt-1">Employers can post verified jobs anytime.</p>
                <button
                  onClick={() => onNavigate("post-job")}
                  className="mt-3 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Post a Job
                </button>
              </div>
            ) : (
              jobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="p-3.5 bg-slate-50 hover:bg-teal-50/40 border border-slate-200/80 rounded-2xl transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={job.logo}
                      alt={job.company}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-xl p-1 border border-slate-200 object-contain bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{job.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {job.company} • {job.salaryText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onToggleSaveJob(job.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-600 bg-white cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5" fill={job.isSaved ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => onSelectJob(job)}
                      className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions List */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate("resume-cv")}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                📄 Update Resume
              </button>
              <button
                onClick={() => onNavigate("job-alerts")}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                🔔 Manage Alerts
              </button>
              <button
                onClick={() => onNavigate("messages")}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                💬 View Messages
              </button>
              <button
                onClick={() => onNavigate("profile")}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                👤 Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Higher Education Modal */}
      {isEducationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <GraduationCap className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Higher Education</h3>
                  <p className="text-[11px] text-slate-500">Reaches 100% Profile Strength index</p>
                </div>
              </div>
              <button
                onClick={() => setIsEducationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEducation} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Degree / Qualification *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech in Computer Science & Engineering"
                  value={eduDegree}
                  onChange={(e) => setEduDegree(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  University / College *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Institute of Technology"
                  value={eduInstitution}
                  onChange={(e) => setEduInstitution(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Graduation Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024"
                  value={eduYear}
                  onChange={(e) => setEduYear(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEducationModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Save & Complete Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
