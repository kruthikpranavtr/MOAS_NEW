import React, { useState } from "react";
import {
  Building2,
  Search,
  MapPin,
  Star,
  Users,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Company, Job, NavigationState } from "../../types";

interface CompaniesViewProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onNavigate: (nav: NavigationState) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  onSelectCompany,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");

  const filteredCompanies = companies.filter((c) => {
    if (industryFilter !== "All" && c.industry !== industryFilter) return false;
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

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Top Hiring Companies</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explore company culture, perks, and active engineering openings on MOAS
          </p>
        </div>

        <button
          onClick={() => onNavigate("find-jobs")}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Explore All Jobs</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company by name, location, or tech..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
        >
          <option value="All">All Industries</option>
          <option value="Technology">Technology & Cloud</option>
          <option value="IT Services">IT Services</option>
          <option value="Food Tech">Consumer & Food Tech</option>
          <option value="Consulting">Consulting & Advisory</option>
          <option value="SaaS">Enterprise SaaS</option>
        </select>
      </div>

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <img
                  src={company.logo}
                  alt={company.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-2xl p-1.5 border border-slate-100 object-contain bg-slate-50"
                />
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full text-xs font-bold text-amber-800">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{company.rating}</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-4">{company.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {company.industry} • {company.location}
              </p>

              <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                {company.employeesCount} • {company.reviewsCount}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-teal-600" />
                {company.openJobsCount} Open Jobs
              </span>

              <button
                onClick={() => onNavigate("find-jobs")}
                className="text-xs font-bold text-slate-700 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View Openings</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
