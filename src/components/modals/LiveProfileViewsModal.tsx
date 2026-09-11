import React, { useState } from "react";
import {
  Eye,
  X,
  Building2,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { ProfileViewEvent, UserProfile } from "../../types";

interface LiveProfileViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewsCount: number;
  viewEvents: ProfileViewEvent[];
  user: UserProfile;
  onSimulateView: (companyName?: string, recruiterRole?: string) => Promise<void>;
  onResetViews: () => Promise<void>;
}

export const LiveProfileViewsModal: React.FC<LiveProfileViewsModalProps> = ({
  isOpen,
  onClose,
  viewsCount,
  viewEvents,
  user,
  onSimulateView,
  onResetViews,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("Anthropic AI");

  if (!isOpen) return null;

  const handleTriggerSimulation = async () => {
    setIsSimulating(true);
    try {
      await onSimulateView(selectedCompany);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTriggerReset = async () => {
    if (!window.confirm("Reset all profile views to 0 to verify clean live tracking?")) return;
    setIsResetting(true);
    try {
      await onResetViews();
    } finally {
      setIsResetting(false);
    }
  };

  // Compute live metrics
  const uniqueCompanies = new Set(viewEvents.map((v) => v.viewerCompany)).size;
  const verifiedRecruitersCount = viewEvents.filter((v) => v.isVerifiedRecruiter).length;
  const avgDuration =
    viewEvents.length > 0
      ? Math.round(
          viewEvents.reduce((acc, v) => acc + (v.durationSeconds || 60), 0) / viewEvents.length
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-start justify-between border-b border-teal-500/20">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE RECRUITER TRACKING ACTIVE
                </span>
                <span className="text-xs text-slate-400">Cloud Firestore Synced</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">Live Profile Impressions & Activity</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Authentic, real-time views registered when employers & recruiters inspect {user.name}&apos;s profile.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200/80">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Live Views</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">{viewsCount}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Live
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hiring Companies</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">{uniqueCompanies}</span>
              <span className="text-[10px] text-slate-500 font-medium">Distinct</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Avg. Inspection</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {avgDuration > 0 ? `${avgDuration}s` : "--"}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Duration</span>
            </div>
          </div>
        </div>

        {/* Live Event Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Verified Recruiter Views Audit Trail</h3>
            </div>
            <span className="text-xs text-slate-500">
              {viewEvents.length} recorded event{viewEvents.length === 1 ? "" : "s"}
            </span>
          </div>

          {viewEvents.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                <Eye className="w-6 h-6 text-slate-300" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No profile views recorded yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Your live counter starts strictly at 0. When verified recruiters or employers view your candidate profile or review your applications, real live views will record here instantly.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={handleTriggerSimulation}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isSimulating ? "Pinging Recruiter..." : "Test Recruiter Live View"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {viewEvents.map((evt) => {
                const formattedTime = new Date(evt.viewedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const formattedDate = new Date(evt.viewedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={evt.id}
                    className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-teal-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={
                          evt.viewerAvatar ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                        }
                        alt={evt.viewerCompany}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{evt.viewerName}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-bold text-teal-700">{evt.viewerCompany}</span>
                          {evt.isVerifiedRecruiter && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{evt.viewerRole}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            {evt.source}
                          </span>
                          {evt.durationSeconds && (
                            <span>{evt.durationSeconds}s inspection</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <span className="text-xs font-bold text-slate-700 block">{formattedTime}</span>
                      <span className="text-[10px] text-slate-400">{formattedDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer / Interactive Live Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="Anthropic AI">Anthropic AI</option>
              <option value="Google DeepMind">Google DeepMind</option>
              <option value="Cursor / Anysphere">Cursor / Anysphere</option>
              <option value="Mistral Systems">Mistral Systems</option>
              <option value="NVIDIA Corp">NVIDIA Corp</option>
              <option value="Databricks Mosaic">Databricks Mosaic</option>
            </select>
            <button
              onClick={handleTriggerSimulation}
              disabled={isSimulating}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Record a live verified recruiter view in real-time"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSimulating ? "Recording..." : "Simulate Recruiter View"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleTriggerReset}
              disabled={isResetting}
              className="px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              title="Clear all views back to 0 to test clean baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to 0</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
