import React, { useState, useMemo } from "react";
import {
  Building2,
  Search,
  MapPin,
  Star,
  Users,
  Briefcase,
  ChevronRight,
  Sparkles,
  Award,
  ThumbsUp,
  Filter,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { Company, CompanyRating, NavigationState } from "../../types";

interface CompaniesViewProps {
  companies: Company[];
  ratings?: CompanyRating[];
  onSelectCompany: (company: Company) => void;
  onNavigate: (nav: NavigationState) => void;
  onFilterJobsByCompany?: (companyName: string) => void;
  onOpenRateModal: (companyName?: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  ratings = [],
  onSelectCompany,
  onNavigate,
  onFilterJobsByCompany,
  onOpenRateModal,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"rating" | "reviews" | "jobs" | "name">("rating");
  const [selectedCompanyReviews, setSelectedCompanyReviews] = useState<string | null>(null);

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let result = companies.filter((c) => {
      // Rating filter
      if (minRatingFilter > 0 && c.rating < minRatingFilter) {
        return false;
      }
      // Industry filter
      if (industryFilter !== "All" && !c.industry.toLowerCase().includes(industryFilter.toLowerCase())) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "rating") {
        return b.rating - a.rating || (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0);
      }
      if (sortBy === "reviews") {
        return (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0);
      }
      if (sortBy === "jobs") {
        return b.openJobsCount - a.openJobsCount;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [companies, searchTerm, industryFilter, minRatingFilter, sortBy]);

  // Distinct industries
  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.industry) {
        const first = c.industry.split("&")[0].trim();
        set.add(first);
      }
    });
    return Array.from(set);
  }, [companies]);

  // Average rating of all companies
  const averageRating = useMemo(() => {
    if (companies.length === 0) return 4.7;
    const sum = companies.reduce((acc, c) => acc + c.rating, 0);
    return (sum / companies.length).toFixed(1);
  }, [companies]);

  const handleViewJobs = (companyName: string) => {
    if (onFilterJobsByCompany) {
      onFilterJobsByCompany(companyName);
    }
    onNavigate("find-jobs");
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Banner / Leaderboard Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-bold tracking-wide">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified Employer Rankings & Ratings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Top Most Rated Companies
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore leading technology and engineering workplaces vetted by real employees,
              candidates, and researchers. Filter by company rating, culture, and active job openings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="rate-employer-header-btn"
              onClick={() => onOpenRateModal()}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Rate An Employer</span>
            </button>
            <button
              onClick={() => onNavigate("find-jobs")}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Briefcase className="w-4 h-4 text-teal-400" />
              <span>Browse All Openings</span>
            </button>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">{averageRating} / 5.0</div>
              <div className="text-[11px] text-slate-400">Average Employer Score</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">{companies.length} Companies</div>
              <div className="text-[11px] text-slate-400">Verified & Ranked</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">2,400+</div>
              <div className="text-[11px] text-slate-400">Candidate Reviews</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">
                {companies.reduce((acc, c) => acc + (c.openJobsCount || 0), 0)} Jobs
              </div>
              <div className="text-[11px] text-slate-400">Active Engineering Roles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-3xl shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="company-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies by name, tech stack, or location..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Industry Filter */}
          <div className="md:col-span-3">
            <select
              id="company-industry-select"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="All">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Sort by:</span>
            <select
              id="company-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="rating">Highest Rating (Top Most)</option>
              <option value="reviews">Most Reviews & Feedback</option>
              <option value="jobs">Most Open Jobs</option>
              <option value="name">Company Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Rating Pills Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            Filter by Rating:
          </span>

          {[
            { label: "All Ratings", value: 0 },
            { label: "⭐ 4.8+ Top 1% (Elite)", value: 4.8 },
            { label: "⭐ 4.5+ Highly Recommended", value: 4.5 },
            { label: "⭐ 4.0+ Top Employers", value: 4.0 },
            { label: "⭐ 3.5+ Good Workplaces", value: 3.5 },
          ].map((pill) => {
            const active = minRatingFilter === pill.value;
            return (
              <button
                key={pill.value}
                id={`rating-filter-pill-${pill.value}`}
                onClick={() => setMinRatingFilter(pill.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {pill.label}
              </button>
            );
          })}

          <span className="ml-auto text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-900">{filteredCompanies.length}</strong> companies
          </span>
        </div>
      </div>

      {/* Companies Leaderboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCompanies.map((company, index) => {
          // Rank Styling
          const rank = index + 1;
          let rankBadge = (
            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center">
              #{rank}
            </span>
          );
          if (rank === 1) {
            rankBadge = (
              <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm">
                🏆 #1 Top Rated
              </span>
            );
          } else if (rank === 2) {
            rankBadge = (
              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-900 font-black text-xs flex items-center gap-1">
                🥈 #2 Top Rated
              </span>
            );
          } else if (rank === 3) {
            rankBadge = (
              <span className="px-2.5 py-1 rounded-full bg-amber-700/20 text-amber-900 font-black text-xs flex items-center gap-1">
                🥉 #3 Top Rated
              </span>
            );
          }

          // Company reviews
          const companyReviews = ratings.filter(
            (r) => r.companyName.toLowerCase() === company.name.toLowerCase()
          );

          const isReviewsOpen = selectedCompanyReviews === company.name;

          return (
            <div
              key={company.id}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs hover:shadow-md hover:border-amber-400/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header with Rank & Logo */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={company.logo}
                      alt={company.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl p-1.5 border border-slate-200 object-contain bg-slate-50 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 leading-tight">
                          {company.name}
                        </h2>
                        {company.isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" title="Verified Employer" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {company.industry} • {company.location}
                      </p>
                    </div>
                  </div>

                  {rankBadge}
                </div>

                {/* Main Rating Score Banner */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(company.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-slate-200 text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-base font-extrabold text-amber-950">
                      {company.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-amber-800 font-medium">
                      ({company.reviewsCount || 100}+ ratings)
                    </span>
                  </div>

                  {company.rating >= 4.8 && (
                    <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md text-[10px] font-black uppercase tracking-wider">
                      Elite Workplace
                    </span>
                  )}
                </div>

                {/* Sub-Metric Bars */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">🏢 Culture & Values</span>
                    <span className="font-bold text-slate-800">
                      {(company.cultureRating || company.rating).toFixed(1)}/5
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">⚖️ Work-Life Balance</span>
                    <span className="font-bold text-slate-800">
                      {(company.workLifeRating || company.rating).toFixed(1)}/5
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">🚀 Career Growth</span>
                    <span className="font-bold text-slate-800">
                      {(company.growthRating || company.rating).toFixed(1)}/5
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">💰 Compensation</span>
                    <span className="font-bold text-slate-800">
                      {(company.compensationRating || company.rating).toFixed(1)}/5
                    </span>
                  </div>
                </div>

                {/* Featured Employee Quote */}
                {company.featuredReview && (
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs text-slate-700 italic flex items-start gap-2">
                    <span className="text-amber-500 font-serif text-base leading-none">“</span>
                    <p className="flex-1 leading-relaxed">
                      {company.featuredReview}
                    </p>
                  </div>
                )}

                {/* Reviews Toggle Section */}
                {isReviewsOpen && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Verified Ratings & Reviews ({companyReviews.length})</span>
                      <button
                        onClick={() => setSelectedCompanyReviews(null)}
                        className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold cursor-pointer"
                      >
                        Hide
                      </button>
                    </div>

                    {companyReviews.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        Be the first to submit a detailed written review for {company.name}!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {companyReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{rev.reviewTitle}</span>
                              <div className="flex items-center gap-1 text-amber-500 font-bold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{rev.rating}.0</span>
                              </div>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{rev.reviewText}</p>
                            {rev.pros && (
                              <div className="text-[11px] text-emerald-700">
                                <strong>Pros:</strong> {rev.pros}
                              </div>
                            )}
                            {rev.cons && (
                              <div className="text-[11px] text-rose-700">
                                <strong>Cons:</strong> {rev.cons}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                              <span>
                                {rev.userName} ({rev.userRole || "Engineer"})
                              </span>
                              <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-teal-600" />
                    {company.openJobsCount} Openings
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCompanyReviews(isReviewsOpen ? null : company.name)
                    }
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {isReviewsOpen ? "Close Reviews" : "Read Reviews"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenRateModal(company.name)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>Rate Company</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewJobs(company.name)}
                    className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <span>View Jobs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
