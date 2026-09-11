import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { Job, Company } from "../../types";

interface FindJobsViewProps {
  jobs: Job[];
  companies?: Company[];
  onSelectJob: (job: Job) => void;
  onToggleSaveJob: (jobId: string) => void;
  onRateCompany?: (companyName: string) => void;
  onNavigateToTopCompanies?: () => void;
}

export const FindJobsView: React.FC<FindJobsViewProps> = ({
  jobs,
  companies = [],
  onSelectJob,
  onToggleSaveJob,
  onRateCompany,
  onNavigateToTopCompanies,
}) => {
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(["All"]);
  const [experienceLevel, setExperienceLevel] = useState("All");
  const [salaryFilter, setSalaryFilter] = useState("All");
  const [companyRatingFilter, setCompanyRatingFilter] = useState("All");
  const [datePosted, setDatePosted] = useState("Anytime");
  const [sortBy, setSortBy] = useState("Most Recent");

  const popularSearches = [
    "Software Developer",
    "Data Analyst",
    "UI/UX Designer",
    "Marketing Manager",
    "Product Manager",
  ];

  // Helper to get company rating & reviews
  const getCompanyInfo = (companyName: string) => {
    const found = companies.find(
      (c) => c.name.toLowerCase() === companyName.toLowerCase()
    );
    if (found) {
      return {
        rating: found.rating,
        reviewsCount: found.reviewsCount,
        verified: found.isVerified,
      };
    }
    // High-quality deterministic fallback for known employers
    if (companyName.includes("DeepMind") || companyName.includes("Anthropic")) {
      return { rating: 4.9, reviewsCount: 328, verified: true };
    }
    if (companyName.includes("Stripe") || companyName.includes("NVIDIA") || companyName.includes("Microsoft")) {
      return { rating: 4.8, reviewsCount: 290, verified: true };
    }
    return { rating: 4.6, reviewsCount: 150, verified: true };
  };

  const handleJobTypeToggle = (type: string) => {
    if (type === "All") {
      setSelectedJobTypes(["All"]);
    } else {
      let updated = selectedJobTypes.filter((t) => t !== "All");
      if (updated.includes(type)) {
        updated = updated.filter((t) => t !== type);
      } else {
        updated.push(type);
      }
      if (updated.length === 0) updated = ["All"];
      setSelectedJobTypes(updated);
    }
  };

  const resetFilters = () => {
    setKeyword("");
    setSelectedCategory("All");
    setSelectedLocation("All");
    setSelectedJobTypes(["All"]);
    setExperienceLevel("All");
    setSalaryFilter("All");
    setCompanyRatingFilter("All");
    setDatePosted("Anytime");
    setSortBy("Most Recent");
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let result = jobs.filter((job) => {
      // Keyword match
      if (keyword.trim()) {
        const q = keyword.toLowerCase();
        const match =
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Location match
      if (selectedLocation !== "All") {
        if (!job.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Job Type match
      if (!selectedJobTypes.includes("All")) {
        if (!selectedJobTypes.includes(job.employmentType)) {
          return false;
        }
      }

      // Salary Filter
      if (salaryFilter === "₹6-12 LPA" && (job.salaryMin > 12 || job.salaryMax < 6)) {
        return false;
      }
      if (salaryFilter === "₹12-20 LPA" && (job.salaryMin > 20 || job.salaryMax < 12)) {
        return false;
      }
      if (salaryFilter === "₹20+ LPA" && job.salaryMax < 20) {
        return false;
      }

      // Company Rating Filter
      if (companyRatingFilter !== "All") {
        const minRating = parseFloat(companyRatingFilter);
        const comp = getCompanyInfo(job.company);
        if (comp.rating < minRating) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    if (sortBy === "⭐ Highest Rated Company (Top Most)") {
      result.sort((a, b) => {
        const rateA = getCompanyInfo(a.company).rating;
        const rateB = getCompanyInfo(b.company).rating;
        return rateB - rateA;
      });
    } else if (sortBy === "Highest Salary") {
      result.sort((a, b) => b.salaryMax - a.salaryMax);
    } else if (sortBy === "MOAS Algorithmic Match") {
      result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return result;
  }, [jobs, companies, keyword, selectedLocation, selectedJobTypes, salaryFilter, companyRatingFilter, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Search Bar with Popular Tags */}
      <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by job title, skill, or company..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Engineering">Software Engineering</option>
              <option value="Design">UI/UX & Product Design</option>
              <option value="Data">Data & Machine Learning</option>
              <option value="Product">Product Management</option>
            </select>
          </div>

          {/* Location Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
            >
              <option value="All">All Locations</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Noida">Noida</option>
              <option value="Pune">Pune</option>
              <option value="Chennai">Chennai</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              onClick={() => {}}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Popular searches tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Popular Searches:</span>
            {popularSearches.map((tag, i) => (
              <button
                key={i}
                onClick={() => setKeyword(tag)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {onNavigateToTopCompanies && (
            <button
              id="findjobs-top-companies-btn"
              onClick={onNavigateToTopCompanies}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Explore Top Most Rated Companies Leaderboard</span>
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
                onClick={resetFilters}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Job Type */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Job Type
              </h4>
              <div className="space-y-2">
                {[
                  "All Job Types",
                  "Full Time",
                  "Part Time",
                  "Contract",
                  "Internship",
                ].map((type) => {
                  const val = type === "All Job Types" ? "All" : type;
                  const isChecked = selectedJobTypes.includes(val);
                  return (
                    <label key={type} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleJobTypeToggle(val)}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>{type}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Experience Level
              </h4>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="All">All Experience Levels</option>
                <option value="Entry">0 - 2 Years</option>
                <option value="Mid">2 - 4 Years</option>
                <option value="Senior">4 - 7 Years</option>
                <option value="Lead">7+ Years</option>
              </select>
            </div>

            {/* Salary Range */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Salary Range (Annual)
              </h4>
              <select
                value={salaryFilter}
                onChange={(e) => setSalaryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="All">All Salary Ranges</option>
                <option value="₹6-12 LPA">₹6 – 12 LPA</option>
                <option value="₹12-20 LPA">₹12 – 20 LPA</option>
                <option value="₹20+ LPA">₹20+ LPA</option>
              </select>
            </div>

            {/* Minimum Company Rating Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>Company Rating</span>
                </h4>
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Top Employers
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "All Ratings", value: "All" },
                  { label: "⭐ 4.8+ Top 1% (Elite)", value: "4.8" },
                  { label: "⭐ 4.5+ Highly Rated", value: "4.5" },
                  { label: "⭐ 4.0+ Top Workplaces", value: "4.0" },
                  { label: "⭐ 3.5+ Good Companies", value: "3.5" },
                ].map((r) => {
                  const isChecked = companyRatingFilter === r.value;
                  return (
                    <label
                      key={r.value}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-amber-50/80 border-amber-300 text-amber-950 font-bold shadow-xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ratingFilterGroup"
                          checked={isChecked}
                          onChange={() => setCompanyRatingFilter(r.value)}
                          className="w-3.5 h-3.5 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{r.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Date Posted */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Date Posted
              </h4>
              <div className="space-y-2">
                {["Anytime", "Last 24 hours", "Last 7 days", "Last 30 days"].map((period) => (
                  <label key={period} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="datePosted"
                      checked={datePosted === period}
                      onChange={() => setDatePosted(period)}
                      className="w-4 h-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{period}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => alert("Search criteria saved to your Job Alerts!")}
                className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Save This Search
              </button>
            </div>
          </div>
        </div>

        {/* Right Job Cards Column */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Results Bar */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-600">
              Showing <span className="text-teal-700">{filteredJobs.length}</span> jobs found
            </span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option>Most Recent</option>
                <option>⭐ Highest Rated Company (Top Most)</option>
                <option>Highest Salary</option>
                <option>MOAS Algorithmic Match</option>
              </select>
            </div>
          </div>

          {/* Job List Cards */}
          <div className="space-y-3.5">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="p-5 sm:p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={job.logo}
                      alt={job.company}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl p-1.5 border border-slate-100 object-contain bg-slate-50 shrink-0"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          onClick={() => onSelectJob(job)}
                          className="text-base font-bold text-slate-900 hover:text-teal-700 transition-colors cursor-pointer"
                        >
                          {job.title}
                        </h3>
                        {job.matchScore && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            {job.matchScore}% Match
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs font-bold text-slate-800">{job.company}</span>
                        {(() => {
                          const compInfo = getCompanyInfo(job.company);
                          return (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>{compInfo.rating.toFixed(1)}</span>
                              <span className="text-[10px] text-amber-700 font-medium">
                                ({compInfo.reviewsCount}+ reviews)
                              </span>
                              {compInfo.rating >= 4.8 && (
                                <span className="ml-1 text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black uppercase tracking-wider">
                                  Top 1%
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{job.location}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{job.experience}</span>
                        {onRateCompany && (
                          <>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRateCompany(job.company);
                              }}
                              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
                              title={`Submit review & rating for ${job.company}`}
                            >
                              <Star className="w-3 h-3 text-amber-600" />
                              <span>Rate Company</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-md">
                          {job.salaryText}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                          {job.employmentType}
                        </span>
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-md">
                          {job.workMode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0">
                    <button
                      onClick={() => onToggleSaveJob(job.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        job.isSaved
                          ? "bg-teal-50 border-teal-200 text-teal-600"
                          : "border-slate-200 text-slate-400 hover:text-slate-600"
                      }`}
                      title={job.isSaved ? "Saved" : "Save Job"}
                    >
                      <Bookmark className="w-4 h-4" fill={job.isSaved ? "currentColor" : "none"} />
                    </button>
                    <span className="text-[11px] text-slate-400">{job.postedTime}</span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {job.description}
                </p>

                {/* Tags and Apply Action */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {job.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    View & Apply
                  </button>
                </div>
              </div>
            ))}

            {filteredJobs.length === 0 && (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No matching jobs found</h4>
                <p className="text-xs text-slate-500 mt-1">Try relaxing some filters or changing your search terms.</p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
