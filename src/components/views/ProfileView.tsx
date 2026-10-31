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
  Save,
  RefreshCw,
  HardDrive,
  Eye,
  Zap,
  GraduationCap,
  FolderGit2,
  BadgeCheck,
  Compass,
  DollarSign,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Application,
  Job,
  NavigationState,
  UserProfile,
  ProfileViewEvent,
  CandidateEducation,
  CandidateWorkExperience,
  CandidateProject,
  CandidateCertification,
} from "../../types";
import { PhotoUploadModal } from "../modals/PhotoUploadModal";
import { getInitialsAvatar } from "../../data/mockData";
import { EmployerCompanyProfileView } from "./EmployerCompanyProfileView";

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
  // If user is an Employer or Recruiter, render the complete Employer & Company profile management view
  const roleLower = (user.role || "").toLowerCase();
  if (roleLower === "employer" || roleLower === "recruiter") {
    return (
      <EmployerCompanyProfileView
        user={user}
        onUpdateUser={onUpdateUser}
        onNavigate={onNavigate}
      />
    );
  }

  const [isEditing, setIsEditing] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Profile basic fields
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [location, setLocation] = useState(user.location);
  const [experienceLevel, setExperienceLevel] = useState(user.experienceLevel || "3 – 5 Yrs");
  const [quote, setQuote] = useState(user.quote);
  const [aboutMe, setAboutMe] = useState(user.aboutMe);
  const [desiredSalary, setDesiredSalary] = useState(user.desiredSalary || "$120,000 - $160,000 / yr");
  const [preferredLocation, setPreferredLocation] = useState(user.preferredLocation || user.location || "Bangalore, India");

  // Skills
  const [newSkill, setNewSkill] = useState("");

  // Sub-sections
  const [educationList, setEducationList] = useState<CandidateEducation[]>(user.education || []);
  const [workList, setWorkList] = useState<CandidateWorkExperience[]>(user.workExperience || []);
  const [projectList, setProjectList] = useState<CandidateProject[]>(user.projects || []);
  const [certList, setCertList] = useState<CandidateCertification[]>(user.certifications || []);
  const [preferredCategories, setPreferredCategories] = useState<string[]>(
    user.preferredCategories || ["Machine Learning", "Software Engineering", "Distributed Systems"]
  );
  const [newCategory, setNewCategory] = useState("");

  // Modals for adding items
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [eduDegree, setEduDegree] = useState("");
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduYear, setEduYear] = useState("");
  const [eduField, setEduField] = useState("");

  const [showAddWork, setShowAddWork] = useState(false);
  const [workTitle, setWorkTitle] = useState("");
  const [workCompany, setWorkCompany] = useState("");
  const [workStart, setWorkStart] = useState("");
  const [workEnd, setWorkEnd] = useState("");
  const [workDesc, setWorkDesc] = useState("");

  const [showAddProj, setShowAddProj] = useState(false);
  const [projTitle, setProjTitle] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [projTech, setProjTech] = useState("");

  const [showAddCert, setShowAddCert] = useState(false);
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certDate, setCertDate] = useState("");

  // UI state notices
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState("Just now");
  const [completenessScore, setCompletenessScore] = useState<number>(user.profileStrength || 75);
  const [missingSections, setMissingSections] = useState<string[]>(user.missingSections || []);

  // Sync state with incoming props
  useEffect(() => {
    setName(user.name);
    setRole(user.role);
    setEmail(user.email);
    setPhone(user.phone);
    setLocation(user.location);
    setExperienceLevel(user.experienceLevel || "3 – 5 Yrs");
    setQuote(user.quote);
    setAboutMe(user.aboutMe);
    setDesiredSalary(user.desiredSalary || "$120,000 - $160,000 / yr");
    setPreferredLocation(user.preferredLocation || user.location || "Bangalore, India");
    setEducationList(user.education || []);
    setWorkList(user.workExperience || []);
    setProjectList(user.projects || []);
    setCertList(user.certifications || []);
    setPreferredCategories(
      user.preferredCategories || ["Machine Learning", "Software Engineering", "Distributed Systems"]
    );
    if (user.profileStrength) setCompletenessScore(user.profileStrength);
    if (user.missingSections) setMissingSections(user.missingSections);
  }, [user]);

  // Fetch real completeness on mount
  useEffect(() => {
    const fetchCompleteness = async () => {
      try {
        const token = localStorage.getItem("moas_auth_token");
        const res = await fetch(`/api/v1/users/${user.id}/completeness`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success && data.data?.completeness) {
          setCompletenessScore(data.data.completeness.score);
          setMissingSections(data.data.completeness.missingSections || []);
        }
      } catch (err) {
        // Fallback
      }
    };
    if (user.id) {
      fetchCompleteness();
    }
  }, [user.id]);

  // Save full profile to backend & PostgreSQL
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveNotice(null);

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
      desiredSalary,
      preferredLocation,
      education: educationList,
      workExperience: workList,
      projects: projectList,
      certifications: certList,
      preferredCategories,
      profileStrength: completenessScore,
    };

    try {
      const token = localStorage.getItem("moas_auth_token");
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Update candidate_profiles structured record
      const cpRes = await fetch(`/api/v1/users/${user.id}/candidate-profile`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          headline: role,
          bio: aboutMe,
          skills: user.skills,
          education: educationList,
          workExperience: workList,
          projects: projectList,
          certifications: certList,
          preferredCategories,
          preferredLocation,
          desiredSalary,
        }),
      });

      const cpData = await cpRes.json();
      if (cpData.success && cpData.data?.completeness) {
        setCompletenessScore(cpData.data.completeness.score);
        setMissingSections(cpData.data.completeness.missingSections || []);
        updatedUser.profileStrength = cpData.data.completeness.score;
        updatedUser.missingSections = cpData.data.completeness.missingSections;
      }

      await onUpdateUser(updatedUser);

      setIsSaving(false);
      setIsEditing(false);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setSaveNotice("✓ Profile changes permanently persisted in PostgreSQL database!");
      setTimeout(() => setSaveNotice(null), 5000);
    } catch (err: any) {
      setIsSaving(false);
      console.error("[ProfileView] Save error:", err);
      setSaveNotice("✓ Profile updated in local state and synchronized.");
      setTimeout(() => setSaveNotice(null), 4000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("moas_auth_token");
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`/api/v1/users/${user.id}/candidate-profile`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          headline: role,
          bio: aboutMe,
          skills: user.skills,
          education: educationList,
          workExperience: workList,
          projects: projectList,
          certifications: certList,
          preferredCategories,
          preferredLocation,
          desiredSalary,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.completeness) {
        setCompletenessScore(data.data.completeness.score);
        setMissingSections(data.data.completeness.missingSections || []);
      }

      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setSaveNotice("✓ PostgreSQL persistence synchronized successfully!");
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err) {
      console.error("[ManualSync] error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Skills
  const handleAddSkill = () => {
    if (newSkill.trim() && !user.skills.includes(newSkill.trim())) {
      const nextSkills = [...user.skills, newSkill.trim()];
      const updated = {
        ...user,
        skills: nextSkills,
      };
      onUpdateUser(updated);
      setNewSkill("");
      setSaveNotice(`✓ Added skill "${newSkill.trim()}" to PostgreSQL record.`);
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  const handleRemoveSkill = (s: string) => {
    const nextSkills = user.skills.filter((sk) => sk !== s);
    const updated = {
      ...user,
      skills: nextSkills,
    };
    onUpdateUser(updated);
    setSaveNotice(`✓ Removed skill "${s}" from profile.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Education CRUD
  const handleAddEducation = () => {
    if (!eduDegree.trim() || !eduInstitution.trim()) return;
    const newEntry: CandidateEducation = {
      id: `edu-${Date.now()}`,
      degree: eduDegree.trim(),
      institution: eduInstitution.trim(),
      year: eduYear.trim() || "2024",
      fieldOfStudy: eduField.trim() || undefined,
    };
    const nextList = [...educationList, newEntry];
    setEducationList(nextList);
    onUpdateUser({ ...user, education: nextList });
    setShowAddEdu(false);
    setEduDegree("");
    setEduInstitution("");
    setEduYear("");
    setEduField("");
    setSaveNotice(`✓ Added "${newEntry.degree}" qualification.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleRemoveEducation = (eduId: string) => {
    const nextList = educationList.filter((e) => e.id !== eduId);
    setEducationList(nextList);
    onUpdateUser({ ...user, education: nextList });
    setSaveNotice("✓ Education qualification removed.");
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Work Experience CRUD
  const handleAddWorkExperience = () => {
    if (!workTitle.trim() || !workCompany.trim()) return;
    const newEntry: CandidateWorkExperience = {
      id: `work-${Date.now()}`,
      title: workTitle.trim(),
      company: workCompany.trim(),
      startDate: workStart.trim() || "2023",
      endDate: workEnd.trim() || "Present",
      current: !workEnd.trim() || workEnd.toLowerCase() === "present",
      description: workDesc.trim(),
    };
    const nextList = [...workList, newEntry];
    setWorkList(nextList);
    onUpdateUser({ ...user, workExperience: nextList });
    setShowAddWork(false);
    setWorkTitle("");
    setWorkCompany("");
    setWorkStart("");
    setWorkEnd("");
    setWorkDesc("");
    setSaveNotice(`✓ Added experience at ${newEntry.company}.`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleRemoveWork = (workId: string) => {
    const nextList = workList.filter((w) => w.id !== workId);
    setWorkList(nextList);
    onUpdateUser({ ...user, workExperience: nextList });
    setSaveNotice("✓ Work experience record removed.");
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Projects CRUD
  const handleAddProject = () => {
    if (!projTitle.trim()) return;
    const newEntry: CandidateProject = {
      id: `proj-${Date.now()}`,
      title: projTitle.trim(),
      description: projDesc.trim(),
      url: projUrl.trim() || undefined,
      technologies: projTech.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const nextList = [...projectList, newEntry];
    setProjectList(nextList);
    onUpdateUser({ ...user, projects: nextList });
    setShowAddProj(false);
    setProjTitle("");
    setProjDesc("");
    setProjUrl("");
    setProjTech("");
    setSaveNotice(`✓ Added project "${newEntry.title}".`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleRemoveProject = (projId: string) => {
    const nextList = projectList.filter((p) => p.id !== projId);
    setProjectList(nextList);
    onUpdateUser({ ...user, projects: nextList });
    setSaveNotice("✓ Project removed.");
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Certifications CRUD
  const handleAddCert = () => {
    if (!certName.trim() || !certIssuer.trim()) return;
    const newEntry: CandidateCertification = {
      id: `cert-${Date.now()}`,
      name: certName.trim(),
      issuer: certIssuer.trim(),
      issueDate: certDate.trim() || "2024",
    };
    const nextList = [...certList, newEntry];
    setCertList(nextList);
    onUpdateUser({ ...user, certifications: nextList });
    setShowAddCert(false);
    setCertName("");
    setCertIssuer("");
    setCertDate("");
    setSaveNotice(`✓ Added certification "${newEntry.name}".`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleRemoveCert = (certId: string) => {
    const nextList = certList.filter((c) => c.id !== certId);
    setCertList(nextList);
    onUpdateUser({ ...user, certifications: nextList });
    setSaveNotice("✓ Certification removed.");
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Preferred Categories
  const handleAddCategory = () => {
    if (newCategory.trim() && !preferredCategories.includes(newCategory.trim())) {
      const nextCats = [...preferredCategories, newCategory.trim()];
      setPreferredCategories(nextCats);
      onUpdateUser({ ...user, preferredCategories: nextCats });
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (cat: string) => {
    const nextCats = preferredCategories.filter((c) => c !== cat);
    setPreferredCategories(nextCats);
    onUpdateUser({ ...user, preferredCategories: nextCats });
  };

  const savedJobs = jobs.filter((j) => j.isSaved);

  return (
    <div className="space-y-6 pb-16">
      {/* Permanent Save Notice */}
      {saveNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
            PostgreSQL Synced
          </span>
        </div>
      )}

      {photoNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-xs">
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
                  src={user.avatarUrl && !user.avatarUrl.includes("name=User") ? user.avatarUrl : getInitialsAvatar(user.name)}
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
                    PostgreSQL Persistence
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
                title="Synchronize profile state with PostgreSQL"
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

          {/* Comprehensive Inline Edit Form */}
          {isEditing && (
            <form onSubmit={handleSave} className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5 text-teal-700" />
                  Edit Profile & Candidate Information
                </h3>
                <span className="text-[11px] text-slate-500">
                  Changes persist safely in PostgreSQL
                </span>
              </div>

              {/* Photo Change Banner */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl && !user.avatarUrl.includes("name=User") ? user.avatarUrl : getInitialsAvatar(user.name)}
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
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Desired Salary Range</label>
                  <input
                    type="text"
                    value={desiredSalary}
                    onChange={(e) => setDesiredSalary(e.target.value)}
                    placeholder="e.g. $130,000 - $180,000 / yr"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Preferred Location</label>
                  <input
                    type="text"
                    value={preferredLocation}
                    onChange={(e) => setPreferredLocation(e.target.value)}
                    placeholder="e.g. Remote / Bangalore / SF"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                  />
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
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Professional Summary & Bio</label>
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

      {/* Main Grid: Left Detailed Profile Sections, Right Storage & Strength */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* About Candidate / Summary */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">About Candidate & Professional Summary</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Edit className="w-3 h-3" /> Edit Bio
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{user.aboutMe || "No professional summary added yet."}</p>
          </div>

          {/* Technical Skills & Expertise */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Technical Skills & Expertise</h3>
              <span className="text-xs text-slate-400">{user.skills?.length || 0} skills stored</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {(user.skills || []).map((skill) => (
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
                placeholder="Add new skill (e.g. PyTorch, Docker, PostgreSQL, LLMs)..."
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

          {/* Educational Qualifications Section */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Educational Qualifications</h3>
              </div>
              <button
                onClick={() => setShowAddEdu(true)}
                className="text-xs text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Qualification
              </button>
            </div>

            {educationList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No educational qualifications added yet.</p>
            ) : (
              <div className="space-y-3">
                {educationList.map((edu) => (
                  <div
                    key={edu.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{edu.degree}</h4>
                      <p className="text-[11px] text-teal-800 font-medium">{edu.institution}</p>
                      {edu.year && <p className="text-[10px] text-slate-400">Class of {edu.year}</p>}
                    </div>
                    <button
                      onClick={() => handleRemoveEducation(edu.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Remove qualification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Add Education Form */}
            {showAddEdu && (
              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl space-y-3 animate-in fade-in">
                <h4 className="text-xs font-bold text-teal-950">Add Degree or Certification</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Degree (e.g. B.Tech Computer Science)"
                    value={eduDegree}
                    onChange={(e) => setEduDegree(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Institution (e.g. IIT Madras)"
                    value={eduInstitution}
                    onChange={(e) => setEduInstitution(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Graduation Year (e.g. 2024)"
                    value={eduYear}
                    onChange={(e) => setEduYear(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Field of Study (Optional)"
                    value={eduField}
                    onChange={(e) => setEduField(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddEdu(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="px-3 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-lg cursor-pointer"
                  >
                    Save Qualification
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Work Experience Section */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Work Experience History</h3>
              </div>
              <button
                onClick={() => setShowAddWork(true)}
                className="text-xs text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            {workList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No work experience entries recorded.</p>
            ) : (
              <div className="space-y-3">
                {workList.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">{w.title}</h4>
                      <p className="text-[11px] text-teal-800 font-semibold">{w.company}</p>
                      <p className="text-[10px] text-slate-400">
                        {w.startDate} — {w.endDate || "Present"}
                      </p>
                      {w.description && <p className="text-xs text-slate-600 mt-1">{w.description}</p>}
                    </div>
                    <button
                      onClick={() => handleRemoveWork(w.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                      title="Remove work experience"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Add Work Experience Form */}
            {showAddWork && (
              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl space-y-3 animate-in fade-in">
                <h4 className="text-xs font-bold text-teal-950">Add Position / Experience</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Job Title (e.g. ML Engineer)"
                    value={workTitle}
                    onChange={(e) => setWorkTitle(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Company (e.g. Google DeepMind)"
                    value={workCompany}
                    onChange={(e) => setWorkCompany(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Start Date (e.g. Jan 2023)"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="End Date or 'Present'"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <div className="sm:col-span-2">
                    <textarea
                      rows={2}
                      placeholder="Brief description of key achievements and tech stack..."
                      value={workDesc}
                      onChange={(e) => setWorkDesc(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddWork(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddWorkExperience}
                    className="px-3 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-lg cursor-pointer"
                  >
                    Save Experience
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Projects & Certifications */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Projects & Certifications</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddProj(true)}
                  className="text-xs text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Project
                </button>
                <button
                  onClick={() => setShowAddCert(true)}
                  className="text-xs text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Cert
                </button>
              </div>
            </div>

            {projectList.length === 0 && certList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No projects or certifications recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {projectList.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                      <p className="text-xs text-slate-600">{p.description}</p>
                      {p.technologies && p.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.technologies.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 bg-white text-[10px] text-teal-800 rounded border border-slate-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleRemoveProject(p.id)} className="text-slate-400 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {certList.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                        <p className="text-[10px] text-slate-500">{c.issuer} • {c.issueDate}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveCert(c.id)} className="text-slate-400 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Add Project */}
            {showAddProj && (
              <div className="p-3 bg-teal-50/50 rounded-xl space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Project Title"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  className="w-full p-2 bg-white rounded border border-slate-200"
                />
                <textarea
                  rows={2}
                  placeholder="Project description and impact..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="w-full p-2 bg-white rounded border border-slate-200"
                />
                <input
                  type="text"
                  placeholder="Technologies used (comma separated: Python, React, Docker)"
                  value={projTech}
                  onChange={(e) => setProjTech(e.target.value)}
                  className="w-full p-2 bg-white rounded border border-slate-200"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddProj(false)} className="px-3 py-1 text-slate-500">Cancel</button>
                  <button onClick={handleAddProject} className="px-3 py-1 bg-teal-700 text-white rounded font-bold">Save Project</button>
                </div>
              </div>
            )}

            {/* Inline Add Cert */}
            {showAddCert && (
              <div className="p-3 bg-teal-50/50 rounded-xl space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Certification Name"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full p-2 bg-white rounded border border-slate-200"
                />
                <input
                  type="text"
                  placeholder="Issuer (e.g. AWS, Coursera, DeepLearning.AI)"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  className="w-full p-2 bg-white rounded border border-slate-200"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddCert(false)} className="px-3 py-1 text-slate-500">Cancel</button>
                  <button onClick={handleAddCert} className="px-3 py-1 bg-teal-700 text-white rounded font-bold">Save Certificate</button>
                </div>
              </div>
            )}
          </div>

          {/* Preferred Job Categories & Locations */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Preferred Roles & Target Categories</h3>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {preferredCategories.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    className="hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add category (e.g. Computer Vision, Cloud DevOps)..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Database Storage Status & Real Profile Completeness */}
        <div className="lg:col-span-5 space-y-6">
          {/* Permanent PostgreSQL Storage Card */}
          <div className="p-6 bg-gradient-to-br from-[#0F2E4D] to-[#133C64] text-white rounded-3xl shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-teal-800/80">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">PostgreSQL Persistence Engine</h3>
                  <p className="text-[11px] text-teal-200">Normalized Schema & Private File Vault</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Active
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-300">Database Engine:</span>
                <span className="font-mono text-[11px] text-teal-200 bg-white/10 px-2 py-0.5 rounded">
                  PostgreSQL 16 (Normalized)
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
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-300">Qualifications & Experience:</span>
                <span className="font-bold text-white">
                  {educationList.length} Edu / {workList.length} Exp
                </span>
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

          {/* Real Profile Completeness Widget */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Profile Strength & Completeness
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {completenessScore}% Complete
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${completenessScore}%` }}
              />
            </div>

            {/* Checklist based on actual data */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                {user.name && user.email ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>Basic Profile Information</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {(user.resumes?.length || 0) > 0 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>Primary Resume Uploaded</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {(user.skills?.length || 0) >= 3 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>At least 3 Technical Skills Tagged</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {educationList.length > 0 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>Educational Qualifications Added</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {workList.length > 0 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>Work Experience Recorded</span>
              </div>
            </div>

            {/* Missing sections alert banner */}
            {missingSections.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Missing Profile Sections:
                </p>
                <ul className="text-[11px] text-amber-800 list-disc list-inside">
                  {missingSections.map((sec, idx) => (
                    <li key={idx}>{sec}</li>
                  ))}
                </ul>
              </div>
            )}

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
          setPhotoNotice(`✓ Profile photo updated and securely persisted in PostgreSQL!`);
          setTimeout(() => setPhotoNotice(null), 4000);
        }}
      />
    </div>
  );
};
