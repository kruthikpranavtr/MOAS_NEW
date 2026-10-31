import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Bookmark,
  Search,
  MapPin,
  Briefcase,
  ChevronRight,
  Trash2,
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Job, NavigationState } from "../../types";

interface SavedJobsViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onToggleSaveJob: (jobId: string) => void;
  onNavigate: (nav: NavigationState) => void;
}

export const SavedJobsView: React.FC<SavedJobsViewProps> = ({
  jobs: propJobs,
  onSelectJob,
  onToggleSaveJob,
  onNavigate,
}) => {
  const [activeFilterPill, setActiveFilterPill] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [serverSavedJobs, setServerSavedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch candidate's bookmarked jobs directly from PostgreSQL
  const fetchSavedJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("moas_auth_token");
      const res = await fetch("/api/v1/jobs/saved", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.savedJobs)) {
          const mappedJobs: Job[] = data.data.savedJobs
            .filter((sj: any) => sj.job)
            .map((sj: any) => {
              const j = sj.job;
              return {
                id: j.id,
                title: j.title,
                company: j.company,
                companyId: j.companyId,
                verified: j.isVerified ?? true,
                location: j.location || "Remote",
                employmentType: j.type || "Full Time",
                workMode: j.workMode || "Hybrid",
                experience: j.experience || "1-3 years",
                salaryMin: j.salaryMin || 10,
                salaryMax: j.salaryMax || 25,
                salaryText: j.salaryText || j.salary || "Competitive",
                postedTime: j.postedDate || "Recently",
                tags: j.skills || j.tags || [],
                description: j.description || "",
                responsibilities: j.responsibilities || [],
                qualifications: j.qualifications || [],
                skills: j.skills || [],
                benefits: j.benefits || [],
                logo: j.logoUrl || j.logo || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%230f766e'/><text x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-weight='bold' font-size='20'>${encodeURIComponent(j.company ? j.company.charAt(0).toUpperCase() : "M")}</text></svg>`,
                status: j.status || "open",
                isFeatured: j.isFeatured ?? false,
                isSaved: true,
                applicationDeadline: j.applicationDeadline,
                openingsCount: j.openingsCount || 1,
              };
            });
          setServerSavedJobs(mappedJobs);
          return;
        }
      }
      // Graceful fallback to client props
      setServerSavedJobs(propJobs.filter((j) => j.isSaved));
    } catch (err) {
      console.warn("Could not load saved jobs from server, fallback to memory:", err);
      setServerSavedJobs(propJobs.filter((j) => j.isSaved));
    } finally {
      setIsLoading(false);
    }
  }, [propJobs]);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const handleRemove = async (jobId: string) => {
    try {
      const token = localStorage.getItem("moas_auth_token");
      await fetch(`/api/v1/jobs/saved/${jobId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      setServerSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
      onToggleSaveJob(jobId);
    } catch (err) {
      console.error("Failed to remove saved job:", err);
    }
  };

  const pills = [
    { label: "All", count: serverSavedJobs.length },
    { label: "Active Openings", count: serverSavedJobs.filter((j) => j.status === "open" || j.status === "published" || j.status === "active").length },
    { label: "Closed Positions", count: serverSavedJobs.filter((j) => j.status === "closed" || j.status === "archived").length },
    { label: "Remote", count: serverSavedJobs.filter((j) => (j.workMode || "").toLowerCase() === "remote").length },
    { label: "Hybrid", count: serverSavedJobs.filter((j) => (j.workMode || "").toLowerCase() === "hybrid").length },
  ];

  const filteredJobs = useMemo(() => {
    return serverSavedJobs.filter((job) => {
      const s = (job.status || "open").toLowerCase();
      if (activeFilterPill === "Active Openings" && (s === "closed" || s === "archived" || s === "draft")) return false;
      if (activeFilterPill === "Closed Positions" && s !== "closed" && s !== "archived") return false;
      if (activeFilterPill === "Remote" && (job.workMode || "").toLowerCase() !== "remote") return false;
      if (activeFilterPill === "Hybrid" && (job.workMode || "").toLowerCase() !== "hybrid") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [serverSavedJobs, activeFilterPill, searchQuery]);

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Bookmark className="w-5 h-5" fill="currentColor" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Saved Jobs</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative PostgreSQL-persisted bookmarked job opportunities with live status tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("find-jobs")}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span>Find More Opportunities</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Stat Pills */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none">
        {pills.map((pill) => {
          const isActive = activeFilterPill === pill.label;
          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => setActiveFilterPill(pill.label)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? "bg-teal-900 text-teal-100" : "bg-slate-100 text-slate-500"
                }`}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Saved Jobs List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-2 shadow-2xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, company, or location..."
              className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
                <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Retrieving saved jobs from database...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No saved jobs found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || activeFilterPill !== "All"
                    ? "No saved jobs match your current filter. Try resetting filters."
                    : "Bookmark jobs in Find Jobs to review and track them here."}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate("find-jobs")}
                  className="mt-4 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors inline-block"
                >
                  Explore Jobs Market
                </button>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const s = (job.status || "open").toLowerCase();
                const isClosed = s === "closed" || s === "archived";
                return (
                  <div
                    key={job.id}
                    className={`p-5 bg-white border rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isClosed ? "border-amber-200/80 bg-amber-50/20" : "border-slate-200/80 hover:border-teal-400"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={job.logo}
                        alt={job.company}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl p-1.5 border border-slate-100 object-contain bg-slate-50 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            onClick={() => onSelectJob(job)}
                            className="text-sm font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                          >
                            {job.title}
                          </h3>
                          {isClosed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              POSITION CLOSED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{job.company}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>{job.workMode}</span>
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md">
                            {job.salaryText}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                            {job.employmentType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleRemove(job.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                        title="Remove from saved jobs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectJob(job)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer ${
                          isClosed
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-teal-700 hover:bg-teal-800 text-white"
                        }`}
                      >
                        {isClosed ? "View Details" : "Apply Now"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Opportunities Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Recommended Active Jobs</span>
            </h3>
            <div className="space-y-3">
              {propJobs
                .filter((j) => j.status === "open" || j.status === "published" || j.status === "active")
                .slice(0, 3)
                .map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className="p-3 bg-slate-50 hover:bg-teal-50/50 rounded-xl border border-slate-200/60 transition-all cursor-pointer"
                  >
                    <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {job.company} • {job.salaryText}
                    </p>
                  </div>
                ))}
            </div>

            <button
              type="button"
              onClick={() => onNavigate("find-jobs")}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center block"
            >
              Browse All Opportunities
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
