import React, { useState } from "react";
import {
  Bell,
  Plus,
  MapPin,
  CheckCircle,
  Building2,
  Trash2,
  Lightbulb,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { JobAlert, Job, AppNotification } from "../../types";
import { useLanguage } from "../../context/LanguageContext";

interface JobAlertsViewProps {
  alerts: JobAlert[];
  jobs?: Job[];
  notifications?: AppNotification[];
  onToggleAlert: (alertId: string) => void;
  onOpenCreateAlert: () => void;
  onDeleteAlert?: (alertId: string) => void;
}

export const JobAlertsView: React.FC<JobAlertsViewProps> = ({
  alerts,
  jobs = [],
  notifications = [],
  onToggleAlert,
  onOpenCreateAlert,
  onDeleteAlert,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"Active" | "Paused">("Active");

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === "Active") return a.active;
    return !a.active;
  });

  const activeCount = alerts.filter((a) => a.active).length;
  const pausedCount = alerts.filter((a) => !a.active).length;

  // Real calculation: how many posted jobs match existing alerts
  const matchingJobsCount = jobs.filter((job) =>
    alerts.some(
      (a) =>
        a.active &&
        (job.title.toLowerCase().includes(a.title.toLowerCase()) ||
          a.title.toLowerCase().includes(job.title.toLowerCase()))
    )
  ).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">{t("alerts.title", "Job Alerts")}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              "alerts.realCompanyNotice",
              "All job alerts are delivered strictly when genuine, verified companies publish matching opportunities."
            )}
          </p>
        </div>

        <button
          onClick={onOpenCreateAlert}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t("alerts.createBtn", "Create New Alert")}</span>
        </button>
      </div>

      {/* Verified Real Company Notice Banner */}
      <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-teal-900">Direct Employer Guarantee: </span>
          <span className="text-teal-800">
            MOAS does not generate artificial job messages or mock company notifications. You will only receive alerts when an actual company registers and publishes genuine openings matching your target roles.
          </span>
        </div>
      </div>

      {/* 4 Stat Cards based on REAL dynamic data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Alerts</p>
          <p className="text-2xl font-extrabold text-teal-700 mt-2">{activeCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Configured by you</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matching Jobs</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{matchingJobsCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">From real employer postings</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Real Jobs Live</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">{jobs.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Currently open on platform</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paused Alerts</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{pausedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Currently on hold</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("Active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Active"
              ? "bg-teal-700 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Active Alerts ({activeCount})
        </button>

        <button
          onClick={() => setActiveTab("Paused")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Paused"
              ? "bg-teal-700 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Paused Alerts ({pausedCount})
        </button>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-3.5">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      alert.active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {alert.active ? "Active" : "Paused"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {alert.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {alert.location}
                    </span>
                  )}
                  <span>•</span>
                  <span>{alert.type}</span>
                  {alert.salaryRange && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">{alert.salaryRange}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Notification: {alert.frequency}</span>
                  <span>•</span>
                  <span>Trigger: Real employer job posts</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {/* Toggle switch */}
                <button
                  onClick={() => onToggleAlert(alert.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    alert.active ? "bg-teal-600" : "bg-slate-200"
                  }`}
                  title={alert.active ? "Pause Alert" : "Activate Alert"}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform absolute top-1 ${
                      alert.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                {onDeleteAlert && (
                  <button
                    onClick={() => onDeleteAlert(alert.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                    title="Delete alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  {activeTab === "Active" ? "No Active Job Alerts Configured" : "No Paused Alerts"}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t(
                    "alerts.noAlerts",
                    "No active job alerts. Set up your preferences below to be notified when real employers post jobs."
                  )}
                </p>
              </div>
              <button
                onClick={onOpenCreateAlert}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t("alerts.createBtn", "Create New Alert")}</span>
              </button>
            </div>
          )}

          {/* Real Company Activity Log */}
          {notifications.length > 0 && (
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-600" />
                Real Employer Alert Notifications
              </h3>
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div key={notif.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{notif.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Tips Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              How Real Job Alerts Work
            </h3>
            <ul className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-teal-700 font-bold">•</span>
                <span>
                  <strong>100% Real Employers:</strong> You will only be alerted when legitimate hiring managers publish verified job openings.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-700 font-bold">•</span>
                <span>
                  <strong>Keyword Precision:</strong> Use specific role terms (e.g. "Machine Learning", "React Native", "Data Engineer") to ensure high relevance.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-700 font-bold">•</span>
                <span>
                  <strong>Instant Delivery:</strong> Matches trigger notifications immediately upon an employer publishing a new role.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
