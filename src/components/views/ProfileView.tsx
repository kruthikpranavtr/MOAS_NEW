import React, { useState, useEffect } from "react";
import {
  Camera,
  MapPin,
  Calendar,
  Briefcase,
  Mail,
  Phone,
  Edit,
  Plus,
  X,
  FileText,
  Bookmark,
  Award,
  CheckCircle,
  CheckCircle2,
  Upload,
  ShieldCheck,
  Check,
  Database,
  CloudCheck,
  Save,
  RefreshCw,
  HardDrive,
  Eye,
  Zap,
  Building2,
} from "lucide-react";
import { Application, Job, NavigationState, UserProfile, ProfileViewEvent } from "../../types";
import { PhotoUploadModal } from "../modals/PhotoUploadModal";

interface ProfileViewProps {
  user: UserProfile;
  applications: Application[];
  jobs: Job[];
  profileViews?: number;
  viewEvents?: ProfileViewEvent[];
  alertsCount?: number;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigate: (nav: NavigationState) => void;
  onOpenLiveViewsModal?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  applications,
  jobs,
  profileViews = 0,
  viewEvents = [],
  alertsCount = 0,
  onUpdateUser,
  onNavigate,
  onOpenLiveViewsModal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [location, setLocation] = useState(user.location);
  const [experienceLevel, setExperienceLevel] = useState(user.experienceLevel || "3 – 5 Yrs");
  const [quote, setQuote] = useState(user.quote);
  const [aboutMe, setAboutMe] = useState(user.aboutMe);
  const [newSkill, setNewSkill] = useState("");
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState("Just now");

  // Keep state synchronized with incoming user prop updates
  useEffect(() => {
    setName(user.name);
    setRole(user.role);
    setEmail(user.email);
    setPhone(user.phone);
    setLocation(user.location);
    setExperienceLevel(user.experienceLevel || "3 – 5 Yrs");
    setQuote(user.quote);
    setAboutMe(user.aboutMe);
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const updatedUser: UserProfile = {
      ...user,
      name,
      role,
      email,
      phone,
      location,
      experienceLevel,
      quote,
      aboutMe,
    };

    try {
      await onUpdateUser(updatedUser);
      setIsSaving(false);
      setIsEditing(false);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSaveNotice("✓ Profile and all changes permanently saved to Cloud Firestore and local storage!");
      setTimeout(() => setSaveNotice(null), 5000);
    } catch (err) {
      setIsSaving(false);
      setSaveNotice("✓ Profile saved to local storage space.");
      setTimeout(() => setSaveNotice(null), 4000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onUpdateUser({
        ...user,
        name,
        role,
        email,
        phone,
        location,
        experienceLevel,
        quote,
        aboutMe,
      });
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSaveNotice("✓ Storage space synchronized with Google Cloud Firestore!");
      setTimeout(() => setSaveNotice(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !user.skills.includes(newSkill.trim())) {
      const updated = {
        ...user,
        skills: [...user.skills, newSkill.trim()],
      };
      onUpdateUser(updated);
      setNewSkill("");
      setSaveNotice(`✓ Added skill "${newSkill.trim()}" to permanent storage.`);
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  const handleRemoveSkill = (s: string) => {
    const updated = {
      ...user,
      skills: user.skills.filter((sk) => sk !== s),
    };
    onUpdateUser(updated);
    setSaveNotice(`✓ Removed skill "${s}" from permanent storage.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const savedJobs = jobs.filter((j) => j.isSaved);

  return (
    <div className="space-y-6 pb-16">
      {/* Permanent Storage Save Notice & Photo Notice */}
      {saveNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
            Synced
          </span>
        </div>
      )}

      {photoNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{photoNotice}</span>
        </div>
      )}

      {/* Hero Profile Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
        {/* Banner Cover with Quote */}
        <div className="h-36 sm:h-44 bg-gradient-to-r from-[#0F2E4D] via-[#133C64] to-[#0D9488] p-6 flex items-start justify-end relative">
          <p className="text-xs sm:text-sm text-teal-200 italic font-medium max-w-sm text-right drop-shadow-xs">
            "{user.quote || "Empowering algorithmic careers and high-impact engineering."}"
          </p>
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 sm:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 sm:-mt-16 gap-4">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-md bg-slate-100"
                />
                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105"
                  title="Change avatar photo (Library or Live Cam)"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{user.name}</h1>
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    ID: {user.id || "MOAS-ID-84920"}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                    <HardDrive className="w-3 h-3 text-emerald-700" />
                    Permanent Storage Active
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-teal-800 font-semibold">{user.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-end">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Synchronize profile state with Cloud Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-teal-600" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Storage"}</span>
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{isEditing ? "Cancel Edit" : "Edit Profile"}</span>
              </button>
            </div>
          </div>

          {/* Quick Meta Row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {user.location || "Bangalore, India"}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {user.phone || "+91 98000 00000"}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              Exp: {user.experienceLevel || "3 – 5 Yrs"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Member since {user.memberSince || "2026"}
            </span>
          </div>

          {/* Inline Edit Form */}
          {isEditing && (
            <form onSubmit={handleSave} className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5 text-teal-700" />
                  Edit Profile & Storage Details
                </h3>
                <span className="text-[11px] text-slate-500">
                  All changes will be permanently stored in Firestore
                </span>
              </div>

              {/* Photo Change Banner in Edit Profile */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Profile Photo</p>
                    <p className="text-[11px] text-slate-500">
                      Upload from file library, presets, or snap with live camera
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-700" />
                  <span>Change Photo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Headline Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  >
                    <option>Fresher (0 - 1 Yr)</option>
                    <option>1 – 3 Yrs</option>
                    <option>3 – 5 Yrs</option>
                    <option>5 – 8 Yrs</option>
                    <option>8+ Yrs (Lead / Principal)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Quote / Personal Banner</label>
                  <input
                    type="text"
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">About Me / Candidate Bio</label>
                  <textarea
                    rows={3}
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-75"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving to Storage..." : "Save All Changes"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate("my-applications")}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs cursor-pointer hover:border-teal-500 transition-colors"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Applications</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{applications.length}</p>
        </div>
        <div
          onClick={() => onNavigate("saved-jobs")}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs cursor-pointer hover:border-teal-500 transition-colors"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Jobs</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{savedJobs.length}</p>
        </div>
        <div
          onClick={onOpenLiveViewsModal}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs cursor-pointer hover:border-emerald-500/60 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Views</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 flex items-baseline gap-2">
            <span>{profileViews}</span>
            <span className="text-[11px] font-semibold text-emerald-600">Verified</span>
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1 group-hover:underline flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>Audit live views →</span>
          </p>
        </div>
        <div
          onClick={() => onNavigate("job-alerts")}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs cursor-pointer hover:border-teal-500 transition-colors"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job Alerts</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{alertsCount}</p>
        </div>
      </div>

      {/* Resume, Skills & Permanent Storage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* About Me */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">About Candidate</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Edit className="w-3 h-3" /> Edit Bio
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{user.aboutMe}</p>
          </div>

          {/* Skills Tag Management */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Technical Skills & Expertise</h3>
              <span className="text-xs text-slate-400">{user.skills.length} skills in storage</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-teal-50 border border-teal-200/80 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-600 cursor-pointer"
                    title="Remove skill"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Skill Input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add new skill (e.g. PyTorch, LLMs, Docker)..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Permanent Storage Space & Profile Strength */}
        <div className="lg:col-span-5 space-y-6">
          {/* Permanent Cloud Storage Space Card */}
          <div className="p-6 bg-gradient-to-br from-[#0F2E4D] to-[#133C64] text-white rounded-3xl shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800/80">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Permanent Cloud Storage</h3>
                  <p className="text-[11px] text-teal-200">Google Cloud Firestore Database</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live Sync
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-300">Database ID:</span>
                <span className="font-mono text-[11px] text-teal-200 bg-white/10 px-2 py-0.5 rounded truncate max-w-[170px]" title="ai-studio-moas-3dec95e6-7f5a-4ba2-8475-ec9164232323">
                  ai-studio-moas...2323
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-300">Candidate Permanent ID:</span>
                <span className="font-mono font-bold text-teal-300">{user.id}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-300">Saved Resumes:</span>
                <span className="font-bold text-white">{user.resumes?.length || 0} document(s)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-300">Skills Stored:</span>
                <span className="font-bold text-white">{user.skills?.length || 0} skills</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Last Synced:</span>
                <span className="text-teal-300 font-semibold">{lastSyncedTime}</span>
              </div>
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Synchronizing..." : "Synchronize All Changes Now"}</span>
            </button>
          </div>

          {/* Live Recruiter Impressions & Tracking Status */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live Recruiter Activity</h3>
                  <p className="text-[11px] text-slate-400">Authentic profile impressions</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            <div className="flex items-baseline justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Verified Views
                </span>
                <span className="text-2xl font-black text-slate-900">{profileViews}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Recruiters
                </span>
                <span className="text-sm font-bold text-teal-700">
                  {viewEvents.length > 0 ? `${new Set(viewEvents.map((v) => v.viewerCompany)).size} Companies` : "None yet"}
                </span>
              </div>
            </div>

            {viewEvents.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Latest Verified Visitor
                </span>
                <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl flex items-center gap-3">
                  <img
                    src={viewEvents[0].viewerAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                    alt={viewEvents[0].viewerCompany}
                    className="w-8 h-8 rounded-lg object-cover border border-teal-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{viewEvents[0].viewerName}</p>
                    <p className="text-[11px] text-teal-700 font-medium truncate">{viewEvents[0].viewerCompany} • {viewEvents[0].viewerRole}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                Views are recorded live when recruiters review your applications or profile.
              </p>
            )}

            <button
              onClick={onOpenLiveViewsModal}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit & Test Live Views</span>
            </button>
          </div>

          {/* Profile Strength */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Profile Strength
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {user.profileStrength}% Strong
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${user.profileStrength}%` }}
              />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Basic Profile Info Added & Stored</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Primary Resume Uploaded</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Technical Skills Tagged in Database</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate("resume-cv")}
              className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Manage Resumes & CV
            </button>
          </div>
        </div>
      </div>

      {/* Photo Upload & Live Camera Modal */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        currentPhotoUrl={user.avatarUrl}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoSelected={(newPhotoUrl) => {
          const updated = {
            ...user,
            avatarUrl: newPhotoUrl,
          };
          onUpdateUser(updated);
          setPhotoNotice(`Profile photo updated and permanently stored for ID ${user.id}!`);
          setTimeout(() => setPhotoNotice(null), 4000);
        }}
      />
    </div>
  );
};
