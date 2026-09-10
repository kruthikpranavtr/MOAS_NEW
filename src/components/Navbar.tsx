import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  MessageSquare,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Sparkles,
  Briefcase,
  Globe,
  Check,
  CheckCircle,
  Building2,
} from "lucide-react";
import { NavigationState, UserProfile, AppNotification, LanguageCode } from "../types";
import { MoasLogo } from "./MoasLogo";
import { useLanguage } from "../context/LanguageContext";
import { DatabaseStatusBadge } from "./DatabaseStatusBadge";

interface NavbarProps {
  currentNav: NavigationState;
  onNavigate: (nav: NavigationState) => void;
  user: UserProfile;
  unreadMessagesCount: number;
  unreadAlertsCount?: number;
  onLogout: () => void;
  onSearch?: (query: string) => void;
  aiConnected?: boolean;
  notifications?: AppNotification[];
  onClearNotifications?: () => void;
  onDataSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentNav,
  onNavigate,
  user,
  unreadMessagesCount,
  unreadAlertsCount = 0,
  onLogout,
  onSearch,
  aiConnected = true,
  notifications = [],
  onClearNotifications,
  onDataSync,
}) => {
  const { currentLanguage, setLanguage, supportedLanguages, currentLanguageOption, t } =
    useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
      onNavigate("find-jobs");
    }
  };

  const navItems: { label: string; state: NavigationState; key: string }[] = [
    { label: "Home", state: "home", key: "nav.home" },
    { label: "Find Jobs", state: "find-jobs", key: "nav.findJobs" },
    { label: "Post a Job", state: "post-job", key: "nav.postJob" },
  ];

  const filteredLanguages = supportedLanguages.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3 sm:gap-4">
        {/* Logo and Global Search */}
        <div className="flex items-center gap-4 sm:gap-6 flex-1 max-w-xl">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg p-1 shrink-0"
            title="MOAS Home"
          >
            <MoasLogo size="sm" showSubtitle={false} />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-widest leading-none">
                Algorithmic
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider">
                Services
              </span>
            </div>
          </button>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 hidden md:block"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("nav.searchPlaceholder", "Search jobs, roles, skills...")}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-800 placeholder-slate-400"
            />
          </form>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navItems.map((item) => {
            const isActive = currentNav === item.state;
            return (
              <button
                key={item.state}
                onClick={() => onNavigate(item.state)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                {t(item.key, item.label)}
              </button>
            );
          })}

          <button
            onClick={() => onNavigate("job-alerts")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              currentNav === "job-alerts"
                ? "bg-teal-700 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{t("nav.jobAlerts", "Job Alerts")}</span>
          </button>
        </nav>

        {/* Right Section: Language Selector, Notifications, Messages, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Multi-Language Selector Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/80 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Select Language / सभी भाषाएं"
            >
              <Globe className="w-4 h-4 text-teal-700" />
              <span className="text-base leading-none">{currentLanguageOption.flag}</span>
              <span className="hidden sm:inline-block uppercase tracking-wider text-[11px]">
                {currentLanguageOption.code}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {languageDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-teal-600" />
                      Select Language
                    </span>
                    <span className="text-[10px] text-teal-700 font-semibold">
                      {supportedLanguages.length} Available
                    </span>
                  </div>
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search language..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
                  {filteredLanguages.map((lang) => {
                    const isSelected = lang.code === currentLanguage;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLanguageDropdownOpen(false);
                          setLangSearch("");
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-teal-50/70 transition-colors cursor-pointer ${
                          isSelected ? "bg-teal-50 text-teal-900 font-bold" : "text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{lang.flag}</span>
                          <div>
                            <p className="font-semibold text-slate-900">{lang.nativeName}</p>
                            <p className="text-[10px] text-slate-400">{lang.name}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Live Cloud Database Status Badge */}
          <DatabaseStatusBadge onDataSync={onDataSync} />

          {/* AI Status Badge */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800"
            title="MOAS Multilingual AI Engine Active"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>MOAS AI</span>
          </div>

          {/* Notifications button (Strictly Real Company / Real Updates) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Job Alerts & Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 min-w-4.5 h-4.5 px-1 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {t("nav.notifications", "Notifications")}
                  </span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && onClearNotifications && (
                      <button
                        onClick={() => {
                          onClearNotifications();
                          setNotificationsOpen(false);
                        }}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setNotificationsOpen(false);
                        onNavigate("job-alerts");
                      }}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                    >
                      View Alerts
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (notif.type === "application") {
                            onNavigate("my-applications");
                          } else {
                            onNavigate("find-jobs");
                          }
                        }}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex gap-3 items-start"
                      >
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                          {notif.type === "application" ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Building2 className="w-4 h-4 text-teal-700" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{notif.description}</p>
                          <span className="text-[10px] text-slate-400">{notif.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center space-y-1.5">
                      <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No Notifications Yet</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Alerts are strictly generated when verified employers publish genuine job openings or update your applications.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages button */}
          <button
            onClick={() => onNavigate("messages")}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Messages & AI"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4.5 h-4.5 px-1 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none"
            >
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border-2 border-teal-600/30"
              />
              <span className="hidden md:inline-block text-sm font-semibold text-slate-800">
                Hi, {user.name.split(" ")[0]}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {/* Profile Dropdown */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate("profile");
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    {t("nav.profile", "Profile")}
                  </button>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate("dashboard");
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    {t("nav.dashboard", "Dashboard")}
                  </button>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate("settings");
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    {t("nav.settings", "Settings")}
                  </button>
                </div>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    {t("nav.logout", "Logout")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
