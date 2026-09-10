import React, { useState } from "react";
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
} from "lucide-react";
import { Application, Job, NavigationState, UserProfile } from "../../types";
import { PhotoUploadModal } from "../modals/PhotoUploadModal";

interface ProfileViewProps {
  user: UserProfile;
  applications: Application[];
  jobs: Job[];
  profileViews?: number;
  alertsCount?: number;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigate: (nav: NavigationState) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  applications,
  jobs,
  profileViews = 0,
  alertsCount = 0,
  onUpdateUser,
  onNavigate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [location, setLocation] = useState(user.location);
  const [quote, setQuote] = useState(user.quote);
  const [aboutMe, setAboutMe] = useState(user.aboutMe);
  const [newSkill, setNewSkill] = useState("");
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name,
      role,
      location,
      quote,
      aboutMe,
    });
    setIsEditing(false);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !user.skills.includes(newSkill.trim())) {
      onUpdateUser({
        ...user,
        skills: [...user.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (s: string) => {
    onUpdateUser({
      ...user,
      skills: user.skills.filter((sk) => sk !== s),
    });
  };

  const savedJobs = jobs.filter((j) => j.isSaved);

  return (
    <div className="space-y-6 pb-16">
      {/* Permanent ID Verification Banner & Photo Notice */}
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
            "{user.quote}"
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
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-md"
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
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Permanent Record
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-teal-800 font-semibold">{user.role}</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-end"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{isEditing ? "Cancel Edit" : "Edit Profile"}</span>
            </button>
          </div>

          {/* Quick Meta Row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {user.location}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {user.phone}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Member since {user.memberSince}
            </span>
          </div>

          {/* Inline Edit Form */}
          {isEditing && (
            <form onSubmit={handleSave} className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Edit Basic Details
                </h3>
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
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Headline Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Quote Banner</label>
                  <input
                    type="text"
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">About Me</label>
                  <textarea
                    rows={3}
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
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
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profile Views</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{profileViews}</p>
        </div>
        <div
          onClick={() => onNavigate("job-alerts")}
          className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs cursor-pointer hover:border-teal-500 transition-colors"
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job Alerts</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{alertsCount}</p>
        </div>
      </div>

      {/* Resume & Skills Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* About Me */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900">About Candidate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{user.aboutMe}</p>
          </div>

          {/* Skills Tag Management */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Technical Skills & Expertise</h3>
              <span className="text-xs text-slate-400">{user.skills.length} skills listed</span>
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
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add skill input */}
            <div className="flex gap-2 max-w-sm pt-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add skill (e.g. PyTorch, Next.js)..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3.5 py-1.5 bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Strength & Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
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
                <span>Basic Profile Info Added</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Primary Resume Uploaded</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>10+ Technical Skills Tagged</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate("resume-cv")}
              className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Analyze with MOAS AI
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
          onUpdateUser({
            ...user,
            avatarUrl: newPhotoUrl,
          });
          fetch("/api/moas/update-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id || "MOAS-ID-84920",
              email: user.email,
              avatarUrl: newPhotoUrl,
            }),
          }).catch(console.error);
          setPhotoNotice(`Profile photo permanently bound to Candidate ID ${user.id || "MOAS-ID-84920"}!`);
          setTimeout(() => setPhotoNotice(null), 4000);
        }}
      />
    </div>
  );
};
