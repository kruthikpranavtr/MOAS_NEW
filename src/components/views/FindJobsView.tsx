import React, { useState, useEffect, useCallback, useTransition } from "react";
import {
  Search,
  MapPin,
  Filter,
  Bookmark,
  Sparkles,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Star,
  Award,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  ShieldCheck,
  Clock,
  Building,
} from "lucide-react";
import { Job, Company } from "../../types";

interface FindJobsViewProps {
  jobs: Job[];
  companies?: Company[];
  initialKeyword?: string;
  initialLocation?: string;
  initialCategory?: string;
  onSelectJob: (job: Job) => void;
  onToggleSaveJob: (jobId: string) => void;
  onRateCompany?: (companyName: string) => void;
  onNavigateToTopCompanies?: () => void;
}

export const FindJobsView: React.FC<FindJobsViewProps> = ({
  jobs: fallbackJobs,
  companies = [],
  initialKeyword = "",
  initialLocation = "All",
  initialCategory = "All",
  onSelectJob,
  onToggleSaveJob,
  onRateCompany,
  onNavigateToTopCompanies,
}) => {
  // Search & Filter State
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedWorkMode, setSelectedWorkMode] = useState("All");
  const [selectedJobType, setSelectedJobType] = useState("All");
  const [experienceLevel, setExperienceLevel] = useState("All");
  const [salaryFilter, setSalaryFilter] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [datePosted, setDatePosted] = useState("Anytime");
  const [sortBy, setSortBy] = useState("relevance");

  // Server-side Pagination State (Task 6)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobsCount, setTotalJobsCount] = useState(0);

  // Live Data & Loading State
  const [liveJobs, setLiveJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoriesList, setCategoriesList] = useState<Array<{ category: string; count: number }>>([]);
  const [isPending, startTransition] = useTransition();

  const popularSearches = [
    "Machine Learning",
    "Python",
    "React",
    "Full-time",
    "Remote",
    "Data Science",
  ];

  // Load real category counts from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/v1/jobs/categories");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data?.categories)) {
            setCategoriesList(data.data.categories);
          }
        }
      } catch (err) {
        console.warn("Could not fetch categories from server:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch jobs from PostgreSQL with server-side filtering, sorting & pagination
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set("search", keyword.trim());
      if (selectedCategory && selectedCategory !== "All" && selectedCategory !== "All Categories") {
        params.set("category", selectedCategory);
      }
      if (selectedLocation && selectedLocation !== "All" && selectedLocation !== "All Locations") {
        params.set("location", selectedLocation);
      }
      if (selectedWorkMode && selectedWorkMode !== "All") {
        params.set("workMode", selectedWorkMode);
      }
      if (selectedJobType && selectedJobType !== "All" && selectedJobType !== "All Job Types") {
        params.set("employmentType", selectedJobType);
      }
      if (experienceLevel && experienceLevel !== "All") {
        params.set("experience", experienceLevel);
      }
      if (verifiedOnly) {
        params.set("isVerified", "true");
      }
      if (datePosted && datePosted !== "Anytime") {
        params.set("datePosted", datePosted);
      }
      if (sortBy) {
        params.set("sortBy", sortBy);
      }

      // Salary mapping
      if (salaryFilter === "₹6-12 LPA") {
        params.set("salaryMin", "6");
        params.set("salaryMax", "12");
      } else if (salaryFilter === "₹12-20 LPA") {
        params.set("salaryMin", "12");
        params.set("salaryMax", "20");
      } else if (salaryFilter === "₹20+ LPA") {
        params.set("salaryMin", "20");
      }

      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      const token = localStorage.getItem("moas_auth_token");
      const res = await fetch(`/api/v1/jobs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.jobs)) {
          const backendJobs: Job[] = data.data.jobs.map((j: any) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            companyId: j.companyId,
            verified: j.isVerified ?? true,
            location: j.location || "Remote",
            employmentType: j.type || "Full Time",
            workMode: j.workMode || "Hybrid",
            experience: j.experience || "1-3 years",
            salaryMin: j.salaryMin || 10,
            salaryMax: j.salaryMax || 25,
            salaryText: j.salaryText || j.salary || "Competitive",
            postedTime: j.postedDate || "Recently",
            tags: j.skills || j.tags || [],
            description: j.description || "",
            responsibilities: j.responsibilities || [],
            qualifications: j.qualifications || [],
            skills: j.skills || [],
            benefits: j.benefits || [],
            logo: j.logoUrl || j.logo || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%230f766e'/><text x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-weight='bold' font-size='20'>${encodeURIComponent(j.company ? j.company.charAt(0).toUpperCase() : "M")}</text></svg>`,
            status: j.status || "open",
            isFeatured: j.isFeatured ?? false,
            openingsCount: j.openingsCount || 1,
            applicationDeadline: j.applicationDeadline,
          }));

          startTransition(() => {
            setLiveJobs(backendJobs);
            setTotalJobsCount(data.data.total ?? backendJobs.length);
            setTotalPages(data.data.totalPages ?? 1);
          });
          return;
        }
      }
      // If endpoint failed, fallback gracefully to initial client dataset
      setLiveJobs(fallbackJobs);
      setTotalJobsCount(fallbackJobs.length);
      setTotalPages(Math.ceil(fallbackJobs.length / pageSize));
    } catch (err) {
      console.warn("Could not query backend jobs, using cached fallback:", err);
      setLiveJobs(fallbackJobs);
      setTotalJobsCount(fallbackJobs.length);
      setTotalPages(Math.ceil(fallbackJobs.length / pageSize));
    } finally {
      setIsLoading(false);
    }
  }, [
    keyword,
    selectedCategory,
    selectedLocation,
    selectedWorkMode,
    selectedJobType,
    experienceLevel,
    salaryFilter,
    verifiedOnly,
    datePosted,
    sortBy,
    currentPage,
    pageSize,
    fallbackJobs,
  ]);

  // Trigger search on filter change
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearchClick = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs();
  };

  const resetFilters = () => {
    setKeyword("");
    setSelectedCategory("All");
    setSelectedLocation("All");
    setSelectedWorkMode("All");
    setSelectedJobType("All");
    setExperienceLevel("All");
    setSalaryFilter("All");
    setVerifiedOnly(false);
    setDatePosted("Anytime");
    setSortBy("relevance");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800">
      {/* Top Search Bar */}
      <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-2xs space-y-4">
        <form onSubmit={handleSearchClick} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by job title, skill, or company..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categoriesList.length > 0 ? (
                categoriesList.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} ({c.count})
                  </option>
                ))
              ) : (
                <>
                  <option value="Data & Machine Learning">Data & Machine Learning</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Cloud Architecture">Cloud Architecture</option>
                  <option value="Product & Design">Product & Design</option>
                  <option value="Skilled Trade & Services">Skilled Trade & Services</option>
                </>
              )}
            </select>
          </div>

          {/* Location Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
            >
              <option value="All">All Locations</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Pune">Pune</option>
              <option value="Noida">Noida</option>
              <option value="Chennai">Chennai</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Popular searches tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Popular Searches:</span>
            {popularSearches.map((tag, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setKeyword(tag);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {onNavigateToTopCompanies && (
            <button
              id="findjobs-top-companies-btn"
              type="button"
              onClick={onNavigateToTopCompanies}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Explore Top Rated Companies Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Left Filters + Right Job Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Filters</h3>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Work Mode */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Work Mode
              </h4>
              <div className="flex flex-col space-y-2">
                {["All", "Remote", "Hybrid", "On-site"].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="workMode"
                      checked={selectedWorkMode === mode}
                      onChange={() => {
                        setSelectedWorkMode(mode);
                        setCurrentPage(1);
                      }}
                      className="w-3.5 h-3.5 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{mode === "All" ? "All Modes" : mode}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Employment Type */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Employment Type
              </h4>
              <div className="flex flex-col space-y-2">
                {["All", "Full Time", "Part Time", "Contract", "Internship", "Freelance"].map((type) => (
                  <label key={type} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="jobType"
                      checked={selectedJobType === type}
                      onChange={() => {
                        setSelectedJobType(type);
                        setCurrentPage(1);
                      }}
                      className="w-3.5 h-3.5 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{type === "All" ? "All Job Types" : type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Experience Level
              </h4>
              <select
                value={experienceLevel}
                onChange={(e) => {
                  setExperienceLevel(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="All">All Experience Levels</option>
                <option value="Entry">Entry Level (0-1 Yr)</option>
                <option value="1-3">1 – 3 Years</option>
                <option value="3-5">3 – 5 Years</option>
                <option value="5+">5+ Years (Senior / Lead)</option>
              </select>
            </div>

            {/* Salary Range */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Salary Range
              </h4>
              <div className="flex flex-col space-y-2">
                {["All", "₹6-12 LPA", "₹12-20 LPA", "₹20+ LPA"].map((range) => (
                  <label key={range} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="salaryRange"
                      checked={salaryFilter === range}
                      onChange={() => {
                        setSalaryFilter(range);
                        setCurrentPage(1);
                      }}
                      className="w-3.5 h-3.5 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{range}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Posting Date */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Date Posted
              </h4>
              <select
                value={datePosted}
                onChange={(e) => {
                  setDatePosted(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="Anytime">Anytime</option>
                <option value="past_24h">Past 24 Hours</option>
                <option value="past_week">Past Week</option>
                <option value="past_month">Past Month</option>
              </select>
            </div>

            {/* Verified Employer Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                  <span>Verified Employers Only</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Job Cards Grid */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Header Bar: Matching Count & Sort Controls */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isLoading ? "Searching Database..." : `Showing ${liveJobs.length} of ${totalJobsCount} Opportunities`}
              </h2>
              <p className="text-[11px] text-slate-500">
                Grounded in PostgreSQL full-text search indexes & authoritative active postings
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-bold text-slate-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="relevance">Most Relevant</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="salary_high">Highest Salary</option>
                <option value="salary_low">Lowest Salary</option>
                <option value="company_asc">Company (A – Z)</option>
              </select>
            </div>
          </div>

          {/* Job List Cards */}
          {isLoading ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Retrieving matched job listings from PostgreSQL...</p>
            </div>
          ) : liveJobs.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No matching jobs found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active postings match your current search and filter combination. Try clearing some filters or searching for broader terms.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-2xs hover:shadow-md hover:border-teal-400/60 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={job.logo}
                          alt={job.company}
                          className="w-11 h-11 rounded-2xl p-1 border border-slate-100 object-contain bg-slate-50 shrink-0"
                        />
                        <div>
                          <h3
                            onClick={() => onSelectJob(job)}
                            className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors cursor-pointer"
                          >
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-semibold text-slate-600">{job.company}</span>
                            {job.verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" title="Verified Employer" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bookmark Button */}
                      <button
                        type="button"
                        onClick={() => onToggleSaveJob(job.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          job.isSaved
                            ? "bg-teal-50 border-teal-300 text-teal-700"
                            : "border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                        title={job.isSaved ? "Saved Job" : "Bookmark Job"}
                      >
                        <Bookmark className="w-4 h-4" fill={job.isSaved ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {job.description || "Exciting opportunity in our engineering organization."}
                    </p>

                    {/* Tags */}
                    {job.tags && job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.tags.slice(0, 4).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-700">{job.salaryText}</p>
                      <p className="text-[10px] text-slate-400">
                        {job.location} • {job.workMode}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectJob(job)}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Server-Side Pagination Controls (Task 6) */}
          {totalPages > 1 && (
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex items-center justify-between gap-4 mt-6">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-teal-700 text-white shadow-xs"
                          : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="text-xs text-slate-400 px-1">... of {totalPages}</span>}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
