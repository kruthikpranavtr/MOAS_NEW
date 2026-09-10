import React, { useState } from "react";
import {
  Search,
  MapPin,
  Briefcase,
  Layers,
  ArrowRight,
  Bookmark,
  CheckCircle,
  Shield,
  Zap,
  Users,
  Building2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Job, NavigationState } from "../../types";

interface HomeViewProps {
  jobs: Job[];
  onNavigate: (nav: NavigationState) => void;
  onSelectJob: (job: Job) => void;
  onToggleSaveJob: (jobId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  jobs,
  onNavigate,
  onSelectJob,
  onToggleSaveJob,
}) => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [alertEmail, setAlertEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const categories = [
    { title: "Full Time", count: "12,540 Jobs", icon: Briefcase, color: "text-teal-700 bg-teal-50" },
    { title: "Part Time", count: "8,420 Jobs", icon: Layers, color: "text-blue-700 bg-blue-50" },
    { title: "Internship", count: "2,350 Jobs", icon: Users, color: "text-purple-700 bg-purple-50" },
    { title: "Work From Home", count: "4,250 Jobs", icon: Building2, color: "text-emerald-700 bg-emerald-50" },
    { title: "Remote", count: "3,620 Jobs", icon: Zap, color: "text-indigo-700 bg-indigo-50" },
    { title: "Freelance", count: "1,840 Jobs", icon: Briefcase, color: "text-amber-700 bg-amber-50" },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate("find-jobs");
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (alertEmail) {
      setSubscribed(true);
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Banner Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-[#0F2E4D] via-[#133C64] to-[#0D9488] p-8 sm:p-12 text-white overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 text-teal-200 text-xs font-semibold mb-4 border border-teal-300/30">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>MOAS Algorithmic Match Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Find Your Dream Job Today!
          </h1>
          <p className="mt-3 text-slate-200 text-sm sm:text-base leading-relaxed">
            Explore thousands of verified opportunities, optimize your algorithmic resume score, and accelerate your tech career.
          </p>

          {/* Search Inputs Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 bg-white p-3 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-2 text-slate-800"
          >
            <div className="flex-1 flex items-center gap-2 w-full px-3 py-2 border-b md:border-b-0 md:border-r border-slate-200">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Job title, skill, or company"
                className="w-full text-sm bg-transparent focus:outline-none placeholder-slate-400 text-slate-800"
              />
            </div>

            <div className="flex-1 flex items-center gap-2 w-full px-3 py-2 border-b md:border-b-0 md:border-r border-slate-200">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (e.g. Bangalore, Remote)"
                className="w-full text-sm bg-transparent focus:outline-none placeholder-slate-400 text-slate-800"
              />
            </div>

            <div className="w-full md:w-44 px-3 py-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm bg-transparent focus:outline-none text-slate-700 cursor-pointer"
              >
                <option>All Categories</option>
                <option>Engineering</option>
                <option>Design</option>
                <option>Data Science</option>
                <option>Product</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-sm font-bold shadow-md transition-all shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Dual Role Callout Cards (Job Seeker vs Employer) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-xs flex flex-col justify-between hover:border-teal-500/50 transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              I'm Looking for a Job
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Explore thousands of verified jobs from top tech and algorithmic companies with instant 1-click apply.
            </p>
          </div>
          <button
            onClick={() => onNavigate("find-jobs")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700 group-hover:text-teal-800 cursor-pointer"
          >
            <span>Browse Jobs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-xs flex flex-col justify-between hover:border-teal-500/50 transition-all group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              I'm Hiring
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Post jobs, leverage MOAS AI to craft job descriptions, and find top algorithmic engineering talent.
            </p>
          </div>
          <button
            onClick={() => onNavigate("post-job")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 group-hover:text-emerald-800 cursor-pointer"
          >
            <span>Post a Job</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Browse by Category</h2>
            <p className="text-sm text-slate-500 mt-1">Find the right role for your work style</p>
          </div>
          <button
            onClick={() => onNavigate("find-jobs")}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div
                key={i}
                onClick={() => onNavigate("find-jobs")}
                className="p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer text-center group"
              >
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2.5 ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                  {cat.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{cat.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Featured Opportunities</h2>
            <p className="text-sm text-slate-500 mt-1">Handpicked algorithmic and engineering roles</p>
          </div>
          <button
            onClick={() => onNavigate("find-jobs")}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
          >
            <span>See More Jobs</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="p-10 bg-white border border-slate-200/90 rounded-3xl text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Fresh Platform • Ready for Job Postings</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
              This webpage has been initialized completely fresh without sample companies or mock job listings.
              Employers can publish new openings anytime, and verified tech opportunities will appear here.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate("post-job")}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Post a Job
              </button>
              <button
                onClick={() => onNavigate("messages")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Chat with MOAS AI
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={job.logo}
                        alt={job.company}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl p-1.5 border border-slate-100 object-contain bg-slate-50"
                      />
                      <div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {job.title}
                        </h4>
                        <p className="text-xs font-medium text-slate-500">{job.company}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleSaveJob(job.id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        job.isSaved
                          ? "bg-teal-50 border-teal-200 text-teal-600"
                          : "border-slate-200 text-slate-400 hover:text-slate-600"
                      }`}
                      title={job.isSaved ? "Saved" : "Save Job"}
                    >
                      <Bookmark className="w-4 h-4" fill={job.isSaved ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-lg">
                      {job.location}
                    </span>
                    <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-medium rounded-lg">
                      {job.employmentType}
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-medium rounded-lg">
                      {job.salaryText}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{job.postedTime}</span>
                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trust Indicators */}
      <section className="py-8 bg-slate-100/70 rounded-3xl p-6 sm:p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <Shield className="w-7 h-7 text-teal-700 mb-2" />
            <h4 className="text-sm font-bold text-slate-900">Verified Employers</h4>
            <p className="text-xs text-slate-500 mt-0.5">100% verified corporate profiles</p>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-7 h-7 text-emerald-700 mb-2" />
            <h4 className="text-sm font-bold text-slate-900">Easy 1-Click Apply</h4>
            <p className="text-xs text-slate-500 mt-0.5">Streamlined candidate submission</p>
          </div>
          <div className="flex flex-col items-center">
            <Briefcase className="w-7 h-7 text-blue-700 mb-2" />
            <h4 className="text-sm font-bold text-slate-900">Thousands of Jobs</h4>
            <p className="text-xs text-slate-500 mt-0.5">Daily refreshed tech opportunities</p>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle className="w-7 h-7 text-purple-700 mb-2" />
            <h4 className="text-sm font-bold text-slate-900">Secure & Safe</h4>
            <p className="text-xs text-slate-500 mt-0.5">Strict candidate data protection</p>
          </div>
        </div>
      </section>

      {/* Newsletter / Job Alerts banner */}
      <section className="p-8 sm:p-10 bg-gradient-to-r from-teal-800 to-teal-950 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-md">
          <h3 className="text-xl sm:text-2xl font-bold">Get Job Alerts in Your Inbox</h3>
          <p className="text-xs sm:text-sm text-teal-200 mt-1 leading-relaxed">
            Stay ahead with automated daily digests of jobs matching your MOAS algorithmic profile.
          </p>
        </div>

        {subscribed ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-400 text-emerald-200 rounded-2xl text-xs font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>Subscribed successfully! Check your inbox for new matches.</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-teal-200 text-sm focus:outline-none focus:bg-white/20 w-full md:w-64"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-teal-950 font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              Subscribe
            </button>
          </form>
        )}
      </section>
    </div>
  );
};
