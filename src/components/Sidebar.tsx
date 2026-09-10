import React from "react";
import {
  LayoutDashboard,
  Search,
  FileText,
  Bookmark,
  Bell,
  MessageSquare,
  FileCheck2,
  User,
  Settings,
  LogOut,
  Building2,
  Headphones,
  Briefcase,
  Users,
} from "lucide-react";
import { NavigationState } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface SidebarProps {
  currentNav: NavigationState;
  onNavigate: (nav: NavigationState) => void;
  unreadMessagesCount: number;
  onLogout: () => void;
  savedJobsCount?: number;
  activeAlertsCount?: number;
  onOpenHelpModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onNavigate,
  unreadMessagesCount,
  onLogout,
  savedJobsCount = 0,
  activeAlertsCount = 0,
  onOpenHelpModal,
}) => {
  const { t } = useLanguage();

  const mainNavItems = [
    { label: t("nav.dashboard", "Dashboard"), state: "dashboard" as NavigationState, icon: LayoutDashboard },
    { label: t("nav.findJobs", "Find Jobs"), state: "find-jobs" as NavigationState, icon: Search },
    { label: "My Applications", state: "my-applications" as NavigationState, icon: FileText },
    {
      label: "Saved Jobs",
      state: "saved-jobs" as NavigationState,
      icon: Bookmark,
      badge: savedJobsCount > 0 ? savedJobsCount : undefined,
    },
    {
      label: t("nav.jobAlerts", "Job Alerts"),
      state: "job-alerts" as NavigationState,
      icon: Bell,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    },
    {
      label: t("nav.messages", "Messages & AI"),
      state: "messages" as NavigationState,
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { label: t("nav.resume", "Resume / CV"), state: "resume-cv" as NavigationState, icon: FileCheck2 },
    { label: t("nav.profile", "Profile"), state: "profile" as NavigationState, icon: User },
    { label: t("nav.settings", "Settings"), state: "settings" as NavigationState, icon: Settings },
  ];

  const employerNavItems = [
    { label: t("nav.postJob", "Post a Job"), state: "post-job" as NavigationState, icon: Briefcase },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col justify-between py-6 px-4 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4.5rem)]">
      <div className="space-y-6">
        {/* Main Navigation List */}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = currentNav === item.state;
            const Icon = item.icon;
            return (
              <button
                key={item.state}
                onClick={() => onNavigate(item.state)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-50 text-teal-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-teal-600 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            <span>Logout</span>
          </button>
        </div>

        {/* Employer Portal Section */}
        <div className="pt-4 border-t border-slate-100">
          <p className="px-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            For Employers
          </p>
          <div className="space-y-1">
            {employerNavItems.map((item) => {
              const isActive = currentNav === item.state;
              const Icon = item.icon;
              return (
                <button
                  key={item.state}
                  onClick={() => onNavigate(item.state)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                    isActive
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4.5 h-4.5 ${
                      isActive ? "text-teal-700" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Need Help Card */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl text-center">
        <div className="w-10 h-10 mx-auto rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-2 shadow-2xs">
          <Headphones className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-800">Need Help?</h4>
        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
          Visit our Help Center or contact our 24/7 career support.
        </p>
        <button
          onClick={onOpenHelpModal}
          className="mt-3 w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-teal-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Go to Help Center
        </button>
      </div>
    </aside>
  );
};
