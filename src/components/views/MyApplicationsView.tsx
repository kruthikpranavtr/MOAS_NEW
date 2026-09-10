import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  Calendar,
  XCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  Lightbulb,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Application, NavigationState } from "../../types";

interface MyApplicationsViewProps {
  applications: Application[];
  onNavigate: (nav: NavigationState) => void;
  onSelectApplication: (app: Application) => void;
  onUpdateStatus?: (appId: string, status: Application["status"]) => void;
  onDeleteApplication?: (appId: string) => void;
  onQuickApplySample?: (count: number) => void;
}

export const MyApplicationsView: React.FC<MyApplicationsViewProps> = ({
  applications,
  onNavigate,
  onSelectApplication,
  onUpdateStatus,
  onDeleteApplication,
  onQuickApplySample,
}) => {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { label: "All", count: applications.length },
    { label: "Applied", count: applications.filter((a) => a.status === "Applied").length },
    { label: "Under Review", count: applications.filter((a) => a.status === "Under Review").length },
    { label: "Shortlisted", count: applications.filter((a) => a.status === "Shortlisted").length },
    { label: "Interview Scheduled", count: applications.filter((a) => a.status === "Interview Scheduled").length },
    { label: "Rejected", count: applications.filter((a) => a.status === "Rejected").length },
  ];

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesTab = activeTab === "All" || app.status === activeTab;
      const matchesSearch =
        app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [applications, activeTab, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Applications Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status updates and candidate pipeline tracking ({applications.length} total active)
          </p>
        </div>

        <button
          onClick={() => onNavigate("find-jobs")}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>Find More Roles</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Test Toolbar */}
      {onQuickApplySample && (
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm border border-slate-800">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300">
              Live Application Testing:
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onQuickApplySample(1)}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Test 1 Job
            </button>
            <button
              onClick={() => onQuickApplySample(20)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Test 20 Jobs
            </button>
            <button
              onClick={() => onQuickApplySample(0)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset (0)</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? "bg-teal-900 text-teal-100" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Application List + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Applications List (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search bar inside list */}
          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center gap-2 shadow-2xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title or company..."
              className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-slate-400 hover:text-slate-600 mr-2"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={app.logo}
                    alt={app.company}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl p-1.5 border border-slate-100 object-contain bg-slate-50 shrink-0"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{app.jobTitle}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.company} • {app.location}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Applied on {app.appliedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
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

                    {onDeleteApplication && (
                      <button
                        onClick={() => onDeleteApplication(app.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Withdraw application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onUpdateStatus && (
                      <select
                        value={app.status}
                        onChange={(e) =>
                          onUpdateStatus(app.id, e.target.value as Application["status"])
                        }
                        className="text-[11px] py-1 px-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        title="Simulate recruitment phase advance"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    )}

                    <button
                      onClick={() => onSelectApplication(app)}
                      className="px-3 py-1 bg-slate-100 hover:bg-teal-50 text-teal-800 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredApplications.length === 0 && (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No applications in this view</h4>
                <p className="text-xs text-slate-500 mt-1">Explore verified job postings and submit your application.</p>
                <button
                  onClick={() => onNavigate("find-jobs")}
                  className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Browse Jobs
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Tips & Insights */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Application Pipeline Insights
            </h3>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-900 mb-0.5">Real-time Pipeline Tracking</h4>
                <p>Applications automatically advance through Applied, Under Review, Shortlisted, Interview, or Decision.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-900 mb-0.5">Recruiter Messages</h4>
                <p>When recruiters review your application, you receive interactive messages and notifications in MOAS.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-900 mb-0.5">Interview Preparation</h4>
                <p>Use the MOAS AI Assistant in Messages to practice system design, algorithms, and behavioral questions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
