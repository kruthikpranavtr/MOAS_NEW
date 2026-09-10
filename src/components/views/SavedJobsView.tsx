import React, { useState, useMemo } from "react";
import {
  Bookmark,
  Search,
  MapPin,
  Briefcase,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Job, NavigationState } from "../../types";

interface SavedJobsViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onToggleSaveJob: (jobId: string) => void;
  onNavigate: (nav: NavigationState) => void;
}

export const SavedJobsView: React.FC<SavedJobsViewProps> = ({
  jobs,
  onSelectJob,
  onToggleSaveJob,
  onNavigate,
}) => {
  const [activeFilterPill, setActiveFilterPill] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const savedJobs = useMemo(() => jobs.filter((j) => j.isSaved), [jobs]);

  const pills = [
    { label: "All", count: savedJobs.length },
    { label: "Full Time", count: savedJobs.filter((j) => j.employmentType === "Full Time").length },
    { label: "Remote", count: savedJobs.filter((j) => j.workMode === "Remote").length },
    { label: "Hybrid", count: savedJobs.filter((j) => j.workMode === "Hybrid").length },
  ];

  const filteredJobs = useMemo(() => {
    return savedJobs.filter((job) => {
      if (activeFilterPill === "Full Time" && job.employmentType !== "Full Time") return false;
      if (activeFilterPill === "Remote" && job.workMode !== "Remote") return false;
      if (activeFilterPill === "Hybrid" && job.workMode !== "Hybrid") return false;

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
  }, [savedJobs, activeFilterPill, searchQuery]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Bookmark className="w-5 h-5" fill="currentColor" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Saved Jobs</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review and apply to jobs you've bookmarked for later
          </p>
        </div>

        <button
          onClick={() => onNavigate("find-jobs")}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Find More Jobs</span>
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
              placeholder="Search saved jobs..."
              className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={job.logo}
                    alt={job.company}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl p-1.5 border border-slate-100 object-contain bg-slate-50 shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{job.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {job.company} • {job.location} • {job.experience}
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

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleSaveJob(job.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}

            {filteredJobs.length === 0 && (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No saved jobs found</h4>
                <p className="text-xs text-slate-500 mt-1">Bookmark jobs in Find Jobs to review them here.</p>
                <button
                  onClick={() => onNavigate("find-jobs")}
                  className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Explore Jobs
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Recommended Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recommended for You
            </h3>
            <div className="space-y-3">
              {jobs.slice(0, 3).map((job) => (
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
          </div>
        </div>
      </div>
    </div>
  );
};
