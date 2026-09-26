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
  ShieldCheck,
  Award,
} from "lucide-react";
import { NavigationState, UserProfile } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface SidebarProps {
  currentNav: NavigationState;
  onNavigate: (nav: NavigationState) => void;
  unreadMessagesCount: number;
  onLogout: () => void;
  user?: UserProfile;
  savedJobsCount?: number;
  activeAlertsCount?: number;
  onOpenHelpModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onNavigate,
  unreadMessagesCount,
  onLogout,
  user,
  savedJobsCount = 0,
  activeAlertsCount = 0,
  onOpenHelpModal,
}) => {
  const { t } = useLanguage();

  const isEmployer =
    user?.role?.toLowerCase() === "employer";

  // Job Seeker specific navigation
  const seekerNavItems = [
    {
      label: t("nav.dashboard", "Dashboard"),
      state: "dashboard/jobseeker" as NavigationState,
      icon: LayoutDashboard,
      match: ["dashboard", "dashboard/jobseeker"],
    },
    {
      label: t("nav.findJobs", "Find Jobs"),
      state: "find-jobs" as NavigationState,
      icon: Search,
      match: ["find-jobs"],
    },
    {
      label: "Top Companies",
      state: "top-companies" as NavigationState,
      icon: Award,
      match: ["top-companies"],
    },
    {
      label: "My Applications",
      state: "my-applications" as NavigationState,
      icon: FileText,
      match: ["my-applications"],
    },
    {
      label: "Saved Jobs",
      state: "saved-jobs" as NavigationState,
      icon: Bookmark,
      badge: savedJobsCount > 0 ? savedJobsCount : undefined,
      match: ["saved-jobs"],
    },
    {
      label: t("nav.jobAlerts", "Job Alerts"),
      state: "job-alerts" as NavigationState,
      icon: Bell,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
      match: ["job-alerts"],
    },
    {
      label: t("nav.messages", "Messages & AI"),
      state: "messages" as NavigationState,
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      match: ["messages"],
    },
    {
      label: t("nav.resume", "Resume / CV"),
      state: "resume-cv" as NavigationState,
      icon: FileCheck2,
      match: ["resume-cv"],
    },
    {
      label: t("nav.profile", "Profile"),
      state: "profile" as NavigationState,
      icon: User,
      match: ["profile"],
    },
    {
      label: t("nav.settings", "Settings"),
      state: "settings" as NavigationState,
      icon: Settings,
      match: ["settings"],
    },
  ];

  // Employer specific navigation
  const employerNavItems = [
    {
      label: "Employer Dashboard",
      state: "dashboard/employer" as NavigationState,
      icon: LayoutDashboard,
      match: ["dashboard", "dashboard/employer"],
    },
    {
      label: t("nav.postJob", "Post a Job"),
      state: "post-job" as NavigationState,
      icon: Briefcase,
      match: ["post-job"],
    },
    {
      label: "Find Jobs & Talent",
      state: "find-jobs" as NavigationState,
      icon: Search,
      match: ["find-jobs"],
    },
    {
      label: "Top Companies",
      state: "top-companies" as NavigationState,
      icon: Award,
      match: ["top-companies"],
    },
    {
      label: t("nav.messages", "Candidate Chats"),
      state: "messages" as NavigationState,
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      match: ["messages"],
    },
    {
      label: "Company Profile",
      state: "profile" as NavigationState,
      icon: Building2,
      match: ["profile"],
    },
    {
      label: t("nav.settings", "Settings"),
      state: "settings" as NavigationState,
      icon: Settings,
      match: ["settings"],
    },
  ];

  const activeNavItems = isEmployer ? employerNavItems : seekerNavItems;

  return (
    <aside className="w-full shrink-0 flex flex-col justify-between py-5 px-4 bg-[#0B1120]/80 border border-white/[0.08] rounded-2xl backdrop-blur-xl shadow-xl">
      <div className="space-y-6">
        {/* Role Identity Tag */}
        <div className="px-3.5 py-2 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
            {isEmployer ? <Building2 className="w-3.5 h-3.5 text-cyan-400" /> : <User className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isEmployer ? "Employer Portal" : "Candidate Portal"}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-mono">
            {isEmployer ? "Hiring" : "Talent"}
          </span>
        </div>

        {/* Main Navigation List */}
        <div className="space-y-1">
          {activeNavItems.map((item) => {
            const isActive = item.match.includes(currentNav);
            const Icon = item.icon;
            return (
              <button
                key={item.state}
                onClick={() => onNavigate(item.state)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500 text-slate-950 rounded-full font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-slate-500" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Need Help Card */}
      <div className="mt-6 p-4 bg-slate-900/60 border border-white/10 rounded-2xl text-center">
        <div className="w-10 h-10 mx-auto rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-2 shadow-2xs">
          <Headphones className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-200">Architecture Support</h4>
        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
          {isEmployer
            ? "Connect with your talent partner for automated engineering sourcing assistance."
            : "Review technical architecture guidelines or contact our 24/7 engineer support."}
        </p>
        <button
          onClick={onOpenHelpModal}
          className="mt-3 w-full py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 rounded-xl text-xs font-bold transition-colors cursor-pointer font-mono"
        >
          Open Support Center
        </button>
      </div>
    </aside>
  );
};
