import React, { useState } from "react";
import {
  Briefcase,
  Sparkles,
  MapPin,
  DollarSign,
  Layers,
  HelpCircle,
  Eye,
  CheckCircle,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { Job } from "../../types";

interface PostJobViewProps {
  onJobPublished: (job: Job) => void;
  defaultCompany?: string;
}

export const PostJobView: React.FC<PostJobViewProps> = ({ onJobPublished, defaultCompany = "" }) => {
  const [jobTitle, setJobTitle] = useState("Senior Machine Learning Engineer");
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [category, setCategory] = useState("Data & Machine Learning");
  const [employmentType, setEmploymentType] = useState<any>("Full Time");
  const [experienceLevel, setExperienceLevel] = useState("3 – 5 Yrs");
  const [jobLocation, setJobLocation] = useState("Bangalore, India");
  const [workMode, setWorkMode] = useState<any>("Hybrid");

  const [jobSummary, setJobSummary] = useState(
    "Join our high-throughput algorithmic systems team to build low-latency machine learning pipelines and real-time distributed recommendation models."
  );
  const [jobDescription, setJobDescription] = useState(
    "### Role Overview\nLead the development of scalable ML pipelines, model inference servers, and feature stores.\n\n### Key Responsibilities\n- Design and deploy distributed ML models with sub-50ms latency\n- Collaborate with backend engineers to integrate REST & gRPC endpoints\n- Monitor model drift and implement automated continuous training pipelines\n\n### Qualifications\n- BS/MS in Computer Science, Mathematics, or equivalent practical experience\n- 3+ years experience with Python, PyTorch/TensorFlow, and Docker\n- Familiarity with Vector Databases and transformer architectures"
  );

  const [skills, setSkills] = useState<string[]>([
    "Python",
    "Machine Learning",
    "PyTorch",
    "Docker",
    "FastAPI",
    "SQL",
  ]);
  const [newSkill, setNewSkill] = useState("");
  const [education, setEducation] = useState("Bachelor's Degree in CS/IT");
  const [noticePeriod, setNoticePeriod] = useState("30 Days");

  const [minSalary, setMinSalary] = useState("24");
  const [maxSalary, setMaxSalary] = useState("38");
  const [benefits, setBenefits] = useState<string[]>([
    "Comprehensive Health Insurance",
    "Flexible Remote / Hybrid Schedule",
    "Annual Learning & Conference Stipend",
    "Performance Bonus & RSUs",
  ]);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Gemini AI Job Generator integration
  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/moas/ai-generate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          category,
          experience: experienceLevel,
          workMode,
          company: "Tech Innovators",
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.summary) setJobSummary(data.summary);
        if (data.description) setJobDescription(data.description);
        if (data.suggestedSkills?.length) setSkills(data.suggestedSkills);
        if (data.benefits?.length) setBenefits(data.benefits);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCompanyName = companyName.trim() || "Independent Employer";
    const initialChar = finalCompanyName.charAt(0).toUpperCase();
    const dynamicLogo = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%230f766e'/><text x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-weight='bold' font-size='22'>${encodeURIComponent(initialChar)}</text></svg>`;

    const newJob: Job = {
      id: `job-${Date.now()}`,
      title: jobTitle,
      company: finalCompanyName,
      logo: dynamicLogo,
      location: jobLocation,
      employmentType,
      workMode,
      experience: experienceLevel,
      salaryMin: Number(minSalary) || 20,
      salaryMax: Number(maxSalary) || 35,
      salaryText: `₹ ${minSalary} – ${maxSalary} LPA`,
      postedTime: "Just now",
      tags: skills.slice(0, 5),
      description: jobSummary,
      requirements: skills,
      benefits,
      isNew: true,
      matchScore: 96,
    };

    onJobPublished(newJob);
    setPublishSuccess(true);
    setTimeout(() => setPublishSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Post a Job on MOAS</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reach verified machine learning and algorithmic software engineers across India
          </p>
        </div>

        {/* MOAS AI Assistant Trigger */}
        <button
          type="button"
          onClick={handleGenerateWithAI}
          disabled={isGeneratingAI}
          className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75"
        >
          <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
          <span>{isGeneratingAI ? "MOAS AI Generating..." : "Generate Description with MOAS AI"}</span>
        </button>
      </div>

      {publishSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>Job published successfully! It is now live in the MOAS candidate search catalog.</span>
        </div>
      )}

      {/* Main Grid: Form + Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handlePublish} className="space-y-6">
            {/* Step 1: Job Details */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Job Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                    placeholder="e.g. Senior Machine Learning Engineer"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Company / Employer Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="e.g. Algorithmic Solutions Ltd or Freelance Recruiter"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
                  >
                    <option>Data & Machine Learning</option>
                    <option>Software Engineering</option>
                    <option>UI/UX Design</option>
                    <option>Product Management</option>
                    <option>DevOps & Cloud</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
                  >
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    placeholder="e.g. 2 - 4 Yrs"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Location
                  </label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="e.g. Bangalore, India"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Work Mode
                  </label>
                  <div className="flex gap-4">
                    {["On-site", "Hybrid", "Remote"].map((mode) => (
                      <label key={mode} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="radio"
                          name="workMode"
                          value={mode}
                          checked={workMode === mode}
                          onChange={() => setWorkMode(mode)}
                          className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                        />
                        <span>{mode}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Job Description */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  Job Description & Scope
                </h3>
                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-fill with MOAS AI
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Job Summary (Short Overview)
                </label>
                <textarea
                  rows={2}
                  value={jobSummary}
                  onChange={(e) => setJobSummary(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Comprehensive Role Description
                </label>
                <textarea
                  rows={6}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Step 3: Requirements & Skills */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Candidate Requirements
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Required Skills & Technologies
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
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

                <div className="flex gap-2 max-w-sm">
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
                    placeholder="Add skill tag..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Minimum Education
                  </label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Notice Period
                  </label>
                  <select
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
                  >
                    <option>Immediate / 15 Days</option>
                    <option>30 Days</option>
                    <option>60 Days</option>
                    <option>90 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Compensation */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">
                  4
                </span>
                Compensation & Benefits (LPA)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Minimum Salary (₹ LPA)
                  </label>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={(e) => setMinSalary(e.target.value)}
                    placeholder="e.g. 18"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Maximum Salary (₹ LPA)
                  </label>
                  <input
                    type="number"
                    value={maxSalary}
                    onChange={(e) => setMaxSalary(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setJobTitle("");
                  setJobSummary("");
                  setJobDescription("");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Clear All
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => alert("Draft saved in your employer dashboard.")}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Publish Job
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Live Preview & Tips */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Preview Card */}
          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-teal-600" />
                Live Candidate Card Preview
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  M
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {jobTitle || "Job Title Preview"}
                  </h4>
                  <p className="text-xs text-slate-500">Your Company • {jobLocation}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">
                  ₹ {minSalary || "0"} – {maxSalary || "0"} LPA
                </span>
                <span className="px-2 py-0.5 bg-white text-slate-700 font-medium rounded-md border border-slate-200">
                  {employmentType}
                </span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 font-medium rounded-md">
                  {workMode}
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-3">
                {jobSummary || "Job summary preview will display here..."}
              </p>

              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tips for a Great Job Post */}
          <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50/50 border border-teal-200/70 rounded-3xl space-y-3">
            <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              Tips for a Great Job Post
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-teal-700 font-bold">•</span>
                <span>Use standard job titles so candidate algorithmic filters discover your role.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-700 font-bold">•</span>
                <span>Be transparent with LPA salary ranges to increase applicant conversion by 45%.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-700 font-bold">•</span>
                <span>Specify exact machine learning libraries (e.g. PyTorch, TensorFlow, HuggingFace).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
