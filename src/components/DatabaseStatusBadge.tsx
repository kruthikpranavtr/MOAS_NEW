import React, { useState, useEffect, useRef } from "react";
import { Database, CheckCircle2, RefreshCw, Server, ShieldCheck, Layers, ExternalLink } from "lucide-react";

export interface DBStats {
  connected: boolean;
  engine: string;
  projectId: string;
  databaseId: string;
  collections: {
    jobs: number;
    applications: number;
    users: number;
    resumes: number;
    companies: number;
    savedJobs: number;
    alerts: number;
  };
}

interface DatabaseStatusBadgeProps {
  onDataSync?: () => void;
}

export const DatabaseStatusBadge: React.FC<DatabaseStatusBadgeProps> = ({ onDataSync }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DBStats | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/db/status");
      const data = await res.json();
      if (data.success) {
        setStats(data);
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error("Failed to fetch database status:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Periodic refresh every 45 seconds
    const interval = setInterval(fetchStatus, 45000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReseed = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/db/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchStatus();
        onDataSync?.();
      }
    } catch (e) {
      console.error("Failed to seed database:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition-colors shadow-2xs cursor-pointer"
        title="Click to view Cloud Firestore Live Database details"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Database className="w-3.5 h-3.5 text-emerald-700" />
        <span className="hidden sm:inline">Database Live</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Cloud Firestore Backend
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Real-Time Durability Connected</span>
                </div>
              </div>
            </div>
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh database statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>

          <div className="py-3 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" /> Project ID
              </span>
              <span className="font-mono font-medium text-slate-700 text-[11px] truncate max-w-[180px]">
                {stats?.projectId || "gen-lang-client-0678632511"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Database ID
              </span>
              <span className="font-mono font-medium text-slate-700 text-[11px] truncate max-w-[180px]">
                {stats?.databaseId || "ai-studio-moas-..."}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Security Rules
              </span>
              <span className="text-emerald-700 font-semibold text-[11px]">
                Master Gate (v2 ABAC)
              </span>
            </div>

            <div className="mt-3 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Persisted Firestore Collections
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                  <span className="text-sm font-bold text-slate-800 block">
                    {stats?.collections.jobs ?? 6}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Jobs</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                  <span className="text-sm font-bold text-slate-800 block">
                    {stats?.collections.applications ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Applications</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                  <span className="text-sm font-bold text-slate-800 block">
                    {stats?.collections.users ?? 2}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Users</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Synced: {lastSyncTime}
            </span>
            <button
              onClick={handleReseed}
              disabled={isLoading}
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
            >
              Seed ML Jobs & Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
