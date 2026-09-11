import React, { useState } from "react";
import { X, Star, Building2, ThumbsUp, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { CompanyRating, Company } from "../../types";

interface RateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCompanyName?: string;
  availableCompanies?: Company[];
  currentUser?: {
    id?: string;
    fullName?: string;
    role?: string;
    profilePhoto?: string;
  };
  onRatingSubmitted: (rating: CompanyRating, updatedCompany?: Company) => void;
}

export const RateCompanyModal: React.FC<RateCompanyModalProps> = ({
  isOpen,
  onClose,
  defaultCompanyName = "",
  availableCompanies = [],
  currentUser,
  onRatingSubmitted,
}) => {
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [cultureRating, setCultureRating] = useState(5);
  const [workLifeRating, setWorkLifeRating] = useState(5);
  const [growthRating, setGrowthRating] = useState(5);
  const [compensationRating, setCompensationRating] = useState(5);

  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [recommendToFriend, setRecommendToFriend] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Sync defaultCompanyName if it changes when opening
  React.useEffect(() => {
    if (defaultCompanyName) {
      setCompanyName(defaultCompanyName);
    }
  }, [defaultCompanyName]);

  if (!isOpen) return null;

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5:
        return "5.0 - Exceptional Workplace (Top Tier)";
      case 4:
        return "4.0 - Very Good & Supportive";
      case 3:
        return "3.0 - Average / Standard Experience";
      case 2:
        return "2.0 - Needs Improvement";
      case 1:
        return "1.0 - Poor / Unfavorable Experience";
      default:
        return `${score}.0`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMessage("Please select or enter a company name.");
      return;
    }
    if (!reviewTitle.trim()) {
      setErrorMessage("Please enter a headline for your review.");
      return;
    }
    if (!reviewText.trim()) {
      setErrorMessage("Please share details about your experience.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        companyName: companyName.trim(),
        userId: currentUser?.id || "MOAS-VERIFIED-USER",
        userName: currentUser?.fullName || "Verified Engineer",
        userRole: currentUser?.role || "Software Engineer",
        userAvatar: currentUser?.profilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
        rating,
        cultureRating,
        workLifeRating,
        growthRating,
        compensationRating,
        reviewTitle: reviewTitle.trim(),
        reviewText: reviewText.trim(),
        pros: pros.trim() || undefined,
        cons: cons.trim() || undefined,
        recommendToFriend,
      };

      const res = await fetch("/api/moas/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit rating.");
      }

      setSuccessMessage(`Review for ${companyName} submitted successfully!`);
      onRatingSubmitted(data.rating, data.updatedCompany);

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage("");
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong while submitting your rating.");
      setIsSubmitting(false);
    }
  };

  const renderStarInput = (
    value: number,
    onChange: (val: number) => void,
    label: string,
    idPrefix: string
  ) => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            id={`${idPrefix}-star-${star}`}
            onClick={() => onChange(star)}
            className="p-1 text-slate-300 hover:text-amber-500 focus:outline-hidden transition-colors cursor-pointer"
            aria-label={`${star} star`}
          >
            <Star
              className={`w-4 h-4 ${
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-slate-300"
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-bold text-slate-700 w-6 text-right">{value}.0</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Rate & Review Employer
              </h2>
              <p className="text-xs text-slate-500">
                Help other candidates find the top most companies with verified ratings
              </p>
            </div>
          </div>
          <button
            id="close-rate-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Company Selector / Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Company Name
            </label>
            <div className="relative">
              <input
                id="company-rating-name-input"
                type="text"
                list="company-name-suggestions"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Google DeepMind, Stripe, NVIDIA..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition-colors"
              />
              <datalist id="company-name-suggestions">
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.industry})
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Overall Star Rating */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-2 text-center">
            <div className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Overall Company Rating
            </div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating !== null ? hoverRating : rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    id={`overall-star-${star}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-hidden transform hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        active
                          ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                          : "fill-slate-200 text-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="text-xs font-bold text-amber-800">
              {getRatingLabel(hoverRating !== null ? hoverRating : rating)}
            </div>
          </div>

          {/* Sub-Category Ratings Breakdown */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1 pb-1">
              Category Breakdown
            </div>
            {renderStarInput(cultureRating, setCultureRating, "Company Culture & Values", "culture")}
            {renderStarInput(workLifeRating, setWorkLifeRating, "Work-Life Balance", "worklife")}
            {renderStarInput(growthRating, setGrowthRating, "Career Growth & Mentorship", "growth")}
            {renderStarInput(compensationRating, setCompensationRating, "Compensation & Benefits", "compensation")}
          </div>

          {/* Review Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">Review Headline</label>
            <input
              id="company-rating-title-input"
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="e.g. Exceptional research freedom and supportive engineering team"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Detailed Review Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">Detailed Feedback & Experience</label>
            <textarea
              id="company-rating-text-input"
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share insights on leadership, work pacing, team dynamics, interview experience, or project tech stacks..."
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-800">Key Pros / Advantages</label>
              <input
                type="text"
                value={pros}
                onChange={(e) => setPros(e.target.value)}
                placeholder="e.g. Great health benefits, smart colleagues"
                className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-rose-800">Areas for Improvement / Cons</label>
              <input
                type="text"
                value={cons}
                onChange={(e) => setCons(e.target.value)}
                placeholder="e.g. Occasional weekend on-calls"
                className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>

          {/* Recommend to a peer toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <ThumbsUp className={`w-4 h-4 ${recommendToFriend ? "text-amber-600" : "text-slate-400"}`} />
              <span className="text-xs font-bold text-slate-800">Recommend to a Friend / Peer?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecommendToFriend(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  recommendToFriend
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setRecommendToFriend(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  !recommendToFriend
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-company-rating-btn"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting Rating..." : "Submit Company Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
