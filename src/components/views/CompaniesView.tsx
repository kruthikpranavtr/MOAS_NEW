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
  ShieldCheck,
  Globe,
  X,
  ChevronLeft,
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
  const [locationFilter, setLocationFilter] = useState("All");
  const [sizeFilter, setSizeFilter] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"rating" | "reviews" | "jobs" | "name">("rating");
  const [selectedCompanyReviews, setSelectedCompanyReviews] = useState<string | null>(null);
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let result = companies.filter((c) => {
      // Verified only filter
      const isVerified = Boolean(c.isVerified || (c as any).verificationStatus === "verified");
      if (verifiedOnly && !isVerified) {
        return false;
      }

      // Rating filter
      if (minRatingFilter > 0 && c.rating < minRatingFilter) {
        return false;
      }

      // Industry filter
      if (industryFilter !== "All" && !c.industry.toLowerCase().includes(industryFilter.toLowerCase())) {
        return false;
      }

      // Location filter
      if (locationFilter !== "All") {
        const cLoc = (c.location || "").toLowerCase();
        if (!cLoc.includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      // Size filter
      if (sizeFilter !== "All") {
        const cSize = (c.size || (c as any).companySize || "").toLowerCase();
        if (!cSize.includes(sizeFilter.toLowerCase())) {
          return false;
        }
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
  }, [companies, searchTerm, industryFilter, locationFilter, sizeFilter, verifiedOnly, minRatingFilter, sortBy]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, industryFilter, locationFilter, sizeFilter, verifiedOnly, minRatingFilter, sortBy]);

  // Paginated companies slice
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;

  // Distinct industries & locations
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

  const locations = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.location) {
        const first = c.location.split(",")[0].trim();
        set.add(first);
      }
    });
    return Array.from(set);
  }, [companies]);

  // Average rating of all companies
  const averageRating = useMemo(() => {
    if (companies.length === 0) return "4.7";
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
              <span>Verified Employer Directory & Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Company Directory & Workplace Reviews
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore leading AI, ML, and software engineering workplaces vetted by verified candidates,
              employees, and researchers. Discover culture, compensation, and active job openings backed by persistent PostgreSQL data.
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
              <div className="text-[11px] text-slate-400">In PostgreSQL Database</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">{ratings.length || "200+"} Reviews</div>
              <div className="text-[11px] text-slate-400">Persistent Candidate Reviews</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">
                {companies.reduce((acc, c) => acc + (c.openJobsCount || 0), 0)} Roles
              </div>
              <div className="text-[11px] text-slate-400">Active Opportunities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-3xl shadow-2xs space-y-4">
        {/* Row 1: Search, Industry, Location, Size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-4 relative">
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
          <div className="lg:col-span-3">
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

          {/* Location Filter */}
          <div className="lg:col-span-3">
            <select
              id="company-location-select"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="All">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="Bengaluru">Bengaluru</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Pune">Pune</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          {/* Company Size */}
          <div className="lg:col-span-2">
            <select
              id="company-size-select"
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="All">All Sizes</option>
              <option value="1-50">1-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ employees</option>
            </select>
          </div>
        </div>

        {/* Row 2: Rating Pills + Verified Toggle + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Rating:
            </span>

            {[
              { label: "All", value: 0 },
              { label: "⭐ 4.8+ Elite", value: 4.8 },
              { label: "⭐ 4.5+ Recommended", value: 4.5 },
              { label: "⭐ 4.0+ Top", value: 4.0 },
            ].map((pill) => {
              const active = minRatingFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => setMinRatingFilter(pill.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}

            <label className="inline-flex items-center gap-2 ml-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Verified Only
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="rating">Highest Rating</option>
              <option value="reviews">Most Reviews</option>
              <option value="jobs">Most Open Jobs</option>
              <option value="name">Company Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Results count */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900">{paginatedCompanies.length}</strong> of{" "}
          <strong className="text-slate-900">{filteredCompanies.length}</strong> companies
        </span>
        {filteredCompanies.length > pageSize && (
          <span>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Companies Leaderboard Grid */}
      {paginatedCompanies.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Companies Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No registered companies match your filter criteria. Try clearing search filters or adjusting the location and rating parameters.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchTerm("");
              setIndustryFilter("All");
              setLocationFilter("All");
              setSizeFilter("All");
              setMinRatingFilter(0);
              setVerifiedOnly(false);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {paginatedCompanies.map((company, index) => {
            const rank = (currentPage - 1) * pageSize + index + 1;
            let rankBadge = (
              <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center">
                #{rank}
              </span>
            );
            if (rank === 1) {
              rankBadge = (
                <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-2xs">
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

            const isVerified = Boolean(company.isVerified || (company as any).verificationStatus === "verified");

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
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">
                              Unverified
                            </span>
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
                        ({company.reviewsCount || companyReviews.length}+ ratings)
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
                      <span className="text-slate-600 font-medium">🏢 Culture</span>
                      <span className="font-bold text-slate-800">
                        {(company.cultureRating || company.rating).toFixed(1)}/5
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">⚖️ Work-Life</span>
                      <span className="font-bold text-slate-800">
                        {(company.workLifeRating || company.rating).toFixed(1)}/5
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">🚀 Growth</span>
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
                      <p className="flex-1 leading-relaxed">{company.featuredReview}</p>
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
                      onClick={() => setSelectedCompanyForDetails(company)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Overview
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenRateModal(company.name)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>Rate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleViewJobs(company.name)}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                      <span>Jobs</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* COMPANY DETAIL MODAL */}
      {/* ==================================================== */}
      {selectedCompanyForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedCompanyForDetails.logo}
                  alt={selectedCompanyForDetails.name}
                  className="w-16 h-16 rounded-2xl p-2 border border-slate-200 object-contain bg-slate-50 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedCompanyForDetails.name}
                    </h2>
                    {Boolean(selectedCompanyForDetails.isVerified || (selectedCompanyForDetails as any).verificationStatus === "verified") && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        Verified Business
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedCompanyForDetails.industry} • {selectedCompanyForDetails.location}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCompanyForDetails(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview / Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                About the Company
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedCompanyForDetails.description ||
                  `${selectedCompanyForDetails.name} is a leading engineering and technology enterprise driving intelligent computing and algorithmic platforms across global industries.`}
              </p>
            </div>

            {/* Ratings Breakdown Grid */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950">
                  Comprehensive Workplace Rating
                </span>
                <span className="text-base font-extrabold text-amber-950">
                  {selectedCompanyForDetails.rating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-amber-100 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Workplace Culture</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {(selectedCompanyForDetails.cultureRating || selectedCompanyForDetails.rating).toFixed(1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-100 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Work-Life Balance</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {(selectedCompanyForDetails.workLifeRating || selectedCompanyForDetails.rating).toFixed(1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-100 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Career Growth</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {(selectedCompanyForDetails.growthRating || selectedCompanyForDetails.rating).toFixed(1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-100 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Compensation</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {(selectedCompanyForDetails.compensationRating || selectedCompanyForDetails.rating).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Culture & Perks if available */}
            {selectedCompanyForDetails.benefits && selectedCompanyForDetails.benefits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Employee Benefits & Perks
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCompanyForDetails.benefits.map((b) => (
                    <span
                      key={b}
                      className="px-3 py-1 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 text-xs font-medium"
                    >
                      ✓ {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const compName = selectedCompanyForDetails.name;
                  setSelectedCompanyForDetails(null);
                  onOpenRateModal(compName);
                }}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Rate Company</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCompanyForDetails(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const compName = selectedCompanyForDetails.name;
                    setSelectedCompanyForDetails(null);
                    handleViewJobs(compName);
                  }}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>View All Openings</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
