import React, { useState, useEffect } from "react";
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
  Building,
  Calendar,
  Users,
  AlertCircle,
  Save,
} from "lucide-react";
import { Job } from "../../types";

interface PostJobViewProps {
  onJobPublished: (job: Job) => void;
  defaultCompany?: string;
  defaultCompanyId?: string;
}

export const PostJobView: React.FC<PostJobViewProps> = ({
  onJobPublished,
  defaultCompany = "",
  defaultCompanyId = "",
}) => {
  // Required Field 1: Job Title
  const [jobTitle, setJobTitle] = useState("Senior Machine Learning Engineer");

  // Required Field 2: Company ID & Company Name
  const [companyId, setCompanyId] = useState(defaultCompanyId);
  const [companyName, setCompanyName] = useState(defaultCompany);
  const [employerCompanies, setEmployerCompanies] = useState<Array<{ id: string; name: string; isVerified: boolean }>>([]);

  // Required Field 16: Job Category
  const [category, setCategory] = useState("Data & Machine Learning");

  // Required Field 15: Employment Type
  const [employmentType, setEmploymentType] = useState<string>("Full Time");

  // Required Field 14: Remote, Hybrid, Onsite
  const [workMode, setWorkMode] = useState<string>("Hybrid");

  // Required Field 8: Experience Requirements
  const [experienceLevel, setExperienceLevel] = useState("3 – 5 Yrs");

  // Required Field 13: Job Location
  const [jobLocation, setJobLocation] = useState("Bangalore, India");

  // Required Field 18: Number of Openings
  const [openingsCount, setOpeningsCount] = useState<number>(2);

  // Required Field 17: Application Deadline
  const [applicationDeadline, setApplicationDeadline] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Required Fields 9-12: Salary Min, Max, Currency, Period
  const [minSalary, setMinSalary] = useState("24");
  const [maxSalary, setMaxSalary] = useState("38");
  const [salaryCurrency, setSalaryCurrency] = useState("INR");
  const [salaryPeriod, setSalaryPeriod] = useState("yearly");

  // Required Field 3: Job Description
  const [jobDescription, setJobDescription] = useState(
    "Join our high-throughput algorithmic systems team to build low-latency machine learning pipelines and real-time distributed recommendation models."
  );

  // Required Field 4: Job Responsibilities
  const [responsibilities, setResponsibilities] = useState<string[]>([
    "Design and deploy distributed ML models with sub-50ms latency",
    "Collaborate with backend engineers to integrate REST & gRPC endpoints",
    "Monitor model drift and implement automated continuous training pipelines",
    "Optimize inference memory footprint using ONNX and TensorRT",
  ]);
  const [newResponsibility, setNewResponsibility] = useState("");

  // Required Field 5: Required Qualifications
  const [qualifications, setQualifications] = useState<string[]>([
    "Bachelor's or Master's degree in CS, Data Science, or related quantitative field",
    "3+ years hands-on production experience in machine learning systems",
    "Strong algorithmic problem-solving and clean code discipline",
  ]);
  const [newQualification, setNewQualification] = useState("");

  // Required Field 6: Required Technical Skills
  const [skills, setSkills] = useState<string[]>([
    "Python",
    "PyTorch",
    "Docker",
    "PostgreSQL",
    "FastAPI",
    "Machine Learning",
  ]);
  const [newSkill, setNewSkill] = useState("");

  // Required Field 7: Preferred Skills
  const [preferredSkills, setPreferredSkills] = useState<string[]>([
    "Kubernetes",
    "CUDA",
    "TensorRT",
    "Vector Databases",
  ]);
  const [newPreferredSkill, setNewPreferredSkill] = useState("");

  // Required Field 19: Benefits
  const [benefits, setBenefits] = useState<string[]>([
    "Comprehensive Health & Dental Insurance",
    "Flexible Remote / Hybrid Schedule",
    "Annual Learning & Conference Stipend",
    "Performance Bonus & Stock Options",
  ]);
  const [newBenefit, setNewBenefit] = useState("");

  // Status & Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load employer's authorized company memberships (Task 2 & Task 8)
  useEffect(() => {
    const fetchEmployerCompanies = async () => {
      try {
        const token = localStorage.getItem("moas_auth_token");
        const res = await fetch("/api/v1/employer/companies", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.companies) && data.companies.length > 0) {
            setEmployerCompanies(data.companies);
            if (!companyId) {
              setCompanyId(data.companies[0].id);
              setCompanyName(data.companies[0].name);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load employer companies list:", err);
      }
    };
    fetchEmployerCompanies();
  }, []);

  // Gemini AI Job Generator integration (Task 11)
  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    setFeedbackMessage(null);
    try {
      const token = localStorage.getItem("moas_auth_token");
      const res = await fetch("/api/v1/ai/generate-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          title: jobTitle,
          category,
          industry: category,
          experience: experienceLevel,
          workMode,
          location: jobLocation,
          employmentType,
          company: companyName || "Tech Innovators",
          skills,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.description) setJobDescription(data.description);
        if (Array.isArray(data.responsibilities) && data.responsibilities.length > 0) {
          setResponsibilities(data.responsibilities);
        }
        if (Array.isArray(data.qualifications) && data.qualifications.length > 0) {
          setQualifications(data.qualifications);
        }
        if (Array.isArray(data.requiredSkills) && data.requiredSkills.length > 0) {
          setSkills(data.requiredSkills);
        }
        if (Array.isArray(data.preferredSkills) && data.preferredSkills.length > 0) {
          setPreferredSkills(data.preferredSkills);
        }
        setFeedbackMessage({
          type: "success",
          text: "AI suggestions loaded! Review and edit the fields below before publishing.",
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text: data.error || "AI service currently unavailable. Please provide job details manually.",
        });
      }
    } catch (e: any) {
      setFeedbackMessage({
        type: "error",
        text: "Could not connect to AI generator. Please complete the form manually.",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Add/Remove Helpers
  const addItem = (
    value: string,
    setValue: (s: string) => void,
    list: string[],
    setList: (l: string[]) => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setValue("");
    }
  };

  const removeItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    setList(list.filter((x) => x !== item));
  };

  // Submission Handler (Task 2 & Task 3: Draft or Published)
  const handleSubmitJob = async (status: "draft" | "published") => {
    setFeedbackMessage(null);

    // Frontend validation
    if (!jobTitle.trim()) {
      setFeedbackMessage({ type: "error", text: "Job title is required." });
      return;
    }
    if (!companyName.trim()) {
      setFeedbackMessage({ type: "error", text: "Company name is required." });
      return;
    }
    if (!jobDescription.trim()) {
      setFeedbackMessage({ type: "error", text: "Job description is required." });
      return;
    }
    const min = Number(minSalary);
    const max = Number(maxSalary);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      setFeedbackMessage({ type: "error", text: "Minimum salary cannot exceed maximum salary." });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("moas_auth_token");
      const payload = {
        title: jobTitle.trim(),
        company: companyName.trim(),
        companyId: companyId || undefined,
        category,
        department: category,
        employmentType,
        type: employmentType,
        workMode,
        experience: experienceLevel,
        location: jobLocation.trim(),
        openingsCount: Number(openingsCount) || 1,
        applicationDeadline: applicationDeadline || undefined,
        salaryMin: isNaN(min) ? 0 : min,
        salaryMax: isNaN(max) ? 0 : max,
        salaryCurrency,
        salaryPeriod,
        salaryText: `${salaryCurrency === "INR" ? "₹" : "$"} ${minSalary} – ${maxSalary} ${salaryPeriod === "yearly" ? "LPA" : "/ " + salaryPeriod}`,
        description: jobDescription.trim(),
        responsibilities,
        qualifications,
        skills,
        preferredSkills,
        requirements: qualifications,
        benefits,
        tags: skills,
        status, // Required Field 20: 'draft' or 'published'
      };

      const res = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post job listing.");
      }

      setFeedbackMessage({
        type: "success",
        text: status === "draft" ? "Job successfully saved as draft." : "Job listing published live to PostgreSQL!",
      });

      if (data.data?.job) {
        onJobPublished(data.data.job);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "An unexpected error occurred while saving job.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800">
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
            Publish verified opportunities with full PostgreSQL backing, full-text discovery, and candidate matching
          </p>
        </div>

        {/* MOAS AI Assistant Trigger */}
        <button
          type="button"
          onClick={handleGenerateWithAI}
          disabled={isGeneratingAI}
          className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
          <span>{isGeneratingAI ? "Generating with Gemini..." : "Suggest Specs with MOAS AI"}</span>
        </button>
      </div>

      {/* Alert / Feedback message */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Form Formats */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmitJob("published"); }} className="space-y-6">
        {/* Section 1: Core Details */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-teal-700" />
            <span>1. Core Job & Company Identity</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Machine Learning Engineer"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Company Selection / ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Authorized Company <span className="text-rose-500">*</span>
              </label>
              {employerCompanies.length > 0 ? (
                <select
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    const matched = employerCompanies.find((c) => c.id === e.target.value);
                    if (matched) setCompanyName(matched.name);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {employerCompanies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.isVerified ? "✓ (Verified)" : "(Pending Verification)"}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme AI Systems"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="Data & Machine Learning">Data & Machine Learning</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Cloud Architecture">Cloud Architecture & DevOps</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Skilled Trade & Services">Skilled Trade & Services</option>
                <option value="Algorithmic Trading">Algorithmic Trading & Quant</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="e.g. Bangalore, India"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Experience Level</label>
              <input
                type="text"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                placeholder="e.g. 3 – 5 Yrs"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Number of Openings */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Number of Openings</label>
              <input
                type="number"
                min={1}
                value={openingsCount}
                onChange={(e) => setOpeningsCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Application Deadline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Application Deadline</label>
              <input
                type="date"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Compensation & Benefits */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-teal-700" />
            <span>2. Compensation & Benefits</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Min Salary</label>
              <input
                type="number"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                placeholder="24"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Salary</label>
              <input
                type="number"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
                placeholder="38"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
              <select
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Period</label>
              <select
                value={salaryPeriod}
                onChange={(e) => setSalaryPeriod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
                <option value="per_task">Per Task</option>
              </select>
            </div>
          </div>

          {/* Benefits List */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Offered Benefits & Perks</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {benefits.map((b, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>{b}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(b, benefits, setBenefits)}
                    className="text-teal-600 hover:text-teal-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(newBenefit, setNewBenefit, benefits, setBenefits);
                  }
                }}
                placeholder="Add custom perk (e.g. Stock options)..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => addItem(newBenefit, setNewBenefit, benefits, setBenefits)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Description, Responsibilities & Qualifications */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-teal-700" />
            <span>3. Description, Responsibilities & Qualifications</span>
          </h2>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Job Description / Role Overview <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Provide a thorough overview of the team, mission, and day-to-day work..."
              required
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Responsibilities */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Key Responsibilities</label>
            <div className="space-y-1.5 mb-2">
              {responsibilities.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium"
                >
                  <span className="text-slate-800">• {r}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(r, responsibilities, setResponsibilities)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newResponsibility}
                onChange={(e) => setNewResponsibility(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(newResponsibility, setNewResponsibility, responsibilities, setResponsibilities);
                  }
                }}
                placeholder="Add a key responsibility..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => addItem(newResponsibility, setNewResponsibility, responsibilities, setResponsibilities)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Qualifications */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Required Qualifications</label>
            <div className="space-y-1.5 mb-2">
              {qualifications.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium"
                >
                  <span className="text-slate-800">✓ {q}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(q, qualifications, setQualifications)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(newQualification, setNewQualification, qualifications, setQualifications);
                  }
                }}
                placeholder="Add required qualification..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => addItem(newQualification, setNewQualification, qualifications, setQualifications)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Technical Skills */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="w-4 h-4 text-teal-700" />
            <span>4. Technical Skills Criteria</span>
          </h2>

          {/* Required Skills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Required Technical Skills</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(s, skills, setSkills)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(newSkill, setNewSkill, skills, setSkills);
                  }
                }}
                placeholder="Add required skill (e.g. PyTorch)..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => addItem(newSkill, setNewSkill, skills, setSkills)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Preferred Skills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Preferred / Bonus Skills</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {preferredSkills.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(s, preferredSkills, setPreferredSkills)}
                    className="text-amber-700 hover:text-amber-950 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newPreferredSkill}
                onChange={(e) => setNewPreferredSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(newPreferredSkill, setNewPreferredSkill, preferredSkills, setPreferredSkills);
                  }
                }}
                placeholder="Add preferred skill (e.g. CUDA)..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => addItem(newPreferredSkill, setNewPreferredSkill, preferredSkills, setPreferredSkills)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Actions Bar (Draft & Publish) */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-medium">
            Draft jobs remain private to your company. Published postings become immediately discoverable in Find Jobs.
          </p>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitJob("draft")}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitJob("published")}
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Publishing..." : "Publish Job Opening"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
