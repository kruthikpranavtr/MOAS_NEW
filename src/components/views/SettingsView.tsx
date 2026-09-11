import React, { useState } from "react";
import {
  Settings,
  User,
  Bell,
  Lock,
  Shield,
  CreditCard,
  Check,
  Globe,
  Smartphone,
  Save,
} from "lucide-react";
import { UserProfile } from "../../types";
import { useLanguage } from "../../context/LanguageContext";

interface SettingsViewProps {
  user: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdateUser }) => {
  const { currentLanguage, setLanguage, supportedLanguages, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    "account" | "language" | "notifications" | "privacy" | "billing"
  >("account");

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [location, setLocation] = useState(user.location || "");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [jobMatchAlerts, setJobMatchAlerts] = useState(true);
  const [recruiterMessages, setRecruiterMessages] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        name,
        email,
        phone,
        location,
      });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">{t("nav.settings", "Settings")}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your account preferences, language, security settings, and alerts
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Main Layout: Left Tabs + Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Settings Navigation (3 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-2">
          <button
            onClick={() => setActiveTab("account")}
            className={`w-full p-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
              activeTab === "account"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Account Details</span>
          </button>

          <button
            onClick={() => setActiveTab("language")}
            className={`w-full p-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
              activeTab === "language"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Language & Region</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full p-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
              activeTab === "notifications"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`w-full p-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
              activeTab === "privacy"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Privacy & Security</span>
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full p-3.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer text-left ${
              activeTab === "billing"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>MOAS Pro Membership</span>
          </button>
        </div>

        {/* Right Content Panel (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9">
          <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
            {activeTab === "language" && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Language & Internationalization</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    MOAS supports all languages. Select your preferred display and AI interaction language below:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {supportedLanguages.map((lang) => {
                    const isSelected = lang.code === currentLanguage;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-teal-50 border-teal-500 shadow-xs"
                            : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{lang.flag}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{lang.nativeName}</p>
                            <p className="text-[11px] text-slate-500">{lang.name}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-700" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab === "account" && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Account Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Primary Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Notification Preferences
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Email Job Match Alerts</p>
                      <p className="text-[11px] text-slate-500">Get daily digests when new ML roles are posted</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={jobMatchAlerts}
                      onChange={(e) => setJobMatchAlerts(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Direct Recruiter Messages</p>
                      <p className="text-[11px] text-slate-500">Instant notification when a recruiter messages you</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={recruiterMessages}
                      onChange={(e) => setRecruiterMessages(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-slate-900">SMS / WhatsApp Verification Alerts</p>
                      <p className="text-[11px] text-slate-500">Receive OTP and critical account security updates via SMS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Privacy & Profile Visibility
                </h3>

                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-slate-900">Candidate Search Visibility</p>
                    <p className="text-[11px] text-slate-500">Choose who can find your resume in the MOAS talent index</p>
                    <select className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700">
                      <option>Open to all verified tech recruiters (Recommended)</option>
                      <option>Only companies I submit applications to</option>
                      <option>Completely private (Ghost mode)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  MOAS Pro Candidate Plan
                </h3>

                <div className="p-6 bg-gradient-to-r from-teal-800 to-[#0F2E4D] text-white rounded-2xl space-y-2">
                  <span className="px-2.5 py-0.5 bg-teal-400/20 text-teal-200 rounded-full text-xs font-bold">
                    Active Plan
                  </span>
                  <h4 className="text-lg font-extrabold">MOAS Pro Engineer Tier</h4>
                  <p className="text-xs text-teal-100">
                    Unlimited algorithmic match scoring, AI resume enhancements, and direct messaging with top tier recruiters.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
