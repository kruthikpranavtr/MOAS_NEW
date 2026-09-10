import React, { useState } from "react";
import {
  X,
  MapPin,
  Briefcase,
  DollarSign,
  Bookmark,
  Sparkles,
  CheckCircle,
  FileText,
  Upload,
  Send,
  Building,
  Check,
  BookOpen,
  Bot,
  BrainCircuit,
  ArrowRight,
  Copy,
  TrendingUp,
  AlertTriangle,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Job, UserProfile, RAGJobMatchResult, AgentRunResult } from "../../types";

interface JobDetailsModalProps {
  job: Job;
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onApply: (jobId: string, resumeName: string, coverLetter: string) => void;
  onToggleSave: (jobId: string) => void;
  onOpenDirectChat?: (company: string, jobTitle: string) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  user,
  isOpen,
  onClose,
  onApply,
  onToggleSave,
  onOpenDirectChat,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "rag-match" | "agentic-apply">("overview");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedResume, setSelectedResume] = useState(user.resumes[0]?.name || "");
  const [coverLetter, setCoverLetter] = useState(
    `Dear Hiring Team at ${job.company},\n\nI am writing to express my strong interest in the ${job.title} position. With my background in ${user.role} and hands-on experience in ${user.skills.slice(0, 4).join(", ")}, I am confident in my ability to make an immediate impact on your team.\n\nLooking forward to the opportunity to discuss my qualifications.\n\nBest regards,\n${user.name}`
  );
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  // RAG Deep Match State
  const [ragResult, setRagResult] = useState<RAGJobMatchResult | null>(null);
  const [isRagLoading, setIsRagLoading] = useState(false);

  // Agentic AI State
  const [agentResult, setAgentResult] = useState<AgentRunResult | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  if (!isOpen) return null;

  // Run RAG Deep Match
  const handleRunRAGMatch = async () => {
    setIsRagLoading(true);
    try {
      const res = await fetch("/api/moas/rag-job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            salaryText: job.salaryText,
            description: job.description,
            requirements: job.requirements || job.tags,
            tags: job.tags,
            workMode: job.workMode,
            experience: job.experience,
          },
          candidate: {
            name: user.name,
            role: user.role,
            skills: user.skills,
            experience: user.experienceLevel,
            resumes: user.resumes,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRagResult(data);
      }
    } catch (e) {
      console.error("RAG Deep Match Error:", e);
    } finally {
      setIsRagLoading(false);
    }
  };

  // Run Agentic Career Engine
  const handleRunAgent = async () => {
    setIsAgentRunning(true);
    try {
      const res = await fetch("/api/moas/agent-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Autonomously evaluate fit, benchmark market compensation, craft recruiter pitch, and synthesize role-specific technical interview challenges for ${job.title} at ${job.company}`,
          candidateProfile: {
            name: user.name,
            role: user.role,
            skills: user.skills,
            experience: user.experienceLevel,
            location: user.location,
          },
          targetJobId: job.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAgentResult(data);
      }
    } catch (e) {
      console.error("Agentic Run Error:", e);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  const handleApplyWithPitch = (pitch: string) => {
    setCoverLetter(pitch);
    setShowApplyForm(true);
    setActiveTab("overview");
  };

  const handleGenerateCoverLetter = async () => {
    setIsGeneratingCoverLetter(true);
    try {
      const res = await fetch("/api/moas/ai-smart-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterMessage: `Candidate applying to ${job.title} at ${job.company}. Requirements: ${job.requirements?.join(", ")}`,
          jobTitle: job.title,
          companyName: job.company,
        }),
      });
      const data = await res.json();
      if (data.success && data.suggestions?.[0]) {
        setCoverLetter(
          `Dear Hiring Manager at ${job.company},\n\n${data.suggestions[0]}\n\nI am particularly drawn to ${job.company}'s engineering culture and high-impact machine learning systems. My technical proficiency with ${job.tags.slice(0, 3).join(", ")} closely matches your job specification.\n\nSincerely,\n${user.name}`
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleConfirmApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(job.id, selectedResume, coverLetter);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      setShowApplyForm(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Modal Top Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <img
              src={job.logo}
              alt={job.company}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-2xl p-1.5 border border-slate-100 object-contain bg-slate-50"
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">{job.title}</h2>
              <p className="text-xs text-slate-500">
                {job.company} • {job.location}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector: Overview | RAG Deep Match | Agentic Auto-Apply */}
        <div className="px-6 sm:px-8 pt-4 pb-0 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab("overview");
              setShowApplyForm(false);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "overview" && !showApplyForm
                ? "border-teal-700 text-teal-800 bg-teal-50/60"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Role Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("rag-match");
              setShowApplyForm(false);
              if (!ragResult && !isRagLoading) handleRunRAGMatch();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "rag-match"
                ? "border-teal-700 text-teal-800 bg-teal-50/60"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>RAG Deep Match</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-extrabold">
              RAG
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("agentic-apply");
              setShowApplyForm(false);
              if (!agentResult && !isAgentRunning) handleRunAgent();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "agentic-apply"
                ? "border-teal-700 text-teal-800 bg-teal-50/60"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Bot className="w-4 h-4 text-teal-600" />
            <span>Agentic Auto-Apply</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-teal-100 text-teal-800 rounded-full font-extrabold">
              AGENT
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {appliedSuccess ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Application Submitted!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your application and resume have been forwarded directly to the hiring team at {job.company}. You can track progress in My Applications.
              </p>
            </div>
          ) : showApplyForm ? (
            /* Apply Flow Modal (Matching JOBS (APPLY JOB).png) */
            <form onSubmit={handleConfirmApply} className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Submit Application for {job.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                >
                  Back to Details
                </button>
              </div>

              {/* Resume Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Resume to Send
                </label>
                <div className="space-y-2">
                  {user.resumes.map((res) => (
                    <label
                      key={res.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedResume === res.name
                          ? "bg-teal-50/70 border-teal-500"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-teal-700" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{res.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {res.type} • {res.size} • Last updated {res.updatedAt}
                          </p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="selectedResume"
                        checked={selectedResume === res.name}
                        onChange={() => setSelectedResume(res.name)}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Cover Letter with MOAS AI Generation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cover Letter / Personal Note
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCoverLetter}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>{isGeneratingCoverLetter ? "Drafting with AI..." : "AI Custom Cover Note"}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          ) : activeTab === "rag-match" ? (
            /* TAB 2: RAG DEEP MATCH ANALYSIS */
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/80 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white tracking-wide uppercase">
                        RAG Grounded Analysis
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Retrieved from {job.company} Job Spec & Candidate Profile
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                      Algorithmic Candidate-to-Job Match
                    </h3>
                  </div>

                  <button
                    onClick={handleRunRAGMatch}
                    disabled={isRagLoading}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isRagLoading ? "Retrieving & Analyzing..." : "Re-run RAG Match"}</span>
                  </button>
                </div>

                {isRagLoading ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      RAG Engine retrieving job requirement chunks and evaluating candidate skills...
                    </p>
                  </div>
                ) : ragResult ? (
                  <div className="mt-5 space-y-4">
                    {/* Score bar */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-emerald-100 shadow-2xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          RAG Grounded Fit
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl font-black text-emerald-700">
                            {ragResult.matchScore}%
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            High Strategic Alignment
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          ATS Score
                        </span>
                        <p className="text-lg font-bold text-teal-800">{ragResult.atsScore}%</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-white/70 p-3.5 rounded-2xl border border-emerald-100">
                      {ragResult.groundedSummary}
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-xs text-slate-500">
                      Click "Re-run RAG Match" to evaluate your candidate profile against {job.company}'s requirements.
                    </p>
                  </div>
                )}
              </div>

              {/* Strengths with citations & gaps */}
              {ragResult && (
                <>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Verified Strengths (Grounded in Job Spec)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ragResult.verifiedStrengths.map((str, i) => (
                        <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                          <p className="text-xs font-bold text-slate-900">{str.strength}</p>
                          <p className="text-[11px] text-teal-700 font-medium">
                            ✓ {str.citedJobRequirement}
                          </p>
                          <p className="text-[10px] text-slate-400">{str.candidateEvidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skill Gaps */}
                  {ragResult.criticalSkillGaps.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Targeted Upskilling & Resume Highlights
                      </h4>
                      <div className="space-y-2">
                        {ragResult.criticalSkillGaps.map((gap, i) => (
                          <div key={i} className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex items-start gap-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200 text-amber-900 shrink-0 mt-0.5">
                              {gap.importance} Priority
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{gap.skill}</p>
                              <p className="text-[11px] text-slate-600 mt-0.5">{gap.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RAG-Generated Pitch */}
                  {ragResult.tailoredApplicationPitch && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-teal-600" />
                          RAG Grounded Cover Letter Pitch
                        </h4>
                        <button
                          onClick={() => handleCopyPitch(ragResult.tailoredApplicationPitch)}
                          className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedPitch ? "Copied!" : "Copy Pitch"}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60 font-sans">
                        {ragResult.tailoredApplicationPitch}
                      </p>
                      <button
                        onClick={() => handleApplyWithPitch(ragResult.tailoredApplicationPitch)}
                        className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Apply with this RAG Tailored Pitch</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : activeTab === "agentic-apply" ? (
            /* TAB 3: AGENTIC AUTO-APPLY */
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-gradient-to-br from-teal-50 via-cyan-50/40 to-slate-50 border border-teal-200/80 rounded-3xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-700 text-white tracking-wide uppercase">
                        Autonomous AI Agent
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Multi-Step Reasoning & Tool Execution
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                      MOAS Career Copilot Execution
                    </h3>
                  </div>

                  <button
                    onClick={handleRunAgent}
                    disabled={isAgentRunning}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>{isAgentRunning ? "Agent Operating..." : "Trigger Autonomous Agent"}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  The MOAS autonomous agent executes a multi-stage workflow: retrieves {job.company}'s requirements, benchmarks market compensation, generates high-impact recruiter outreach, and formulates technical interview practice challenges.
                </p>
              </div>

              {isAgentRunning ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Agent executing multi-step plan: [RAG Ingestion] ➔ [Fit Assessment] ➔ [Compensation Benchmark] ➔ [Recruiter Pitch]...
                  </p>
                </div>
              ) : agentResult ? (
                <div className="space-y-6">
                  {/* Step-by-Step Thought Trace */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-teal-600" />
                      Agent Execution Thought Trace ({agentResult.steps.length} Steps)
                    </h4>
                    <div className="space-y-3">
                      {agentResult.steps.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                                {step.stepNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{step.title}</span>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                              Tool: {step.tool} ({step.durationMs}ms)
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            💭 Thought: {step.thought}
                          </p>

                          <div className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto">
                            <span className="text-slate-400 font-bold block mb-1">Output Summary:</span>
                            {JSON.stringify(step.output, null, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Market Insights Artifact */}
                  {agentResult.actionableArtifacts?.marketInsights && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Market Compensation Benchmark
                      </h4>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Median Range</span>
                          <p className="text-xs font-bold text-slate-900">
                            {agentResult.actionableArtifacts.marketInsights.medianSalary}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Hiring Demand</span>
                          <p className="text-xs font-bold text-teal-700">
                            {agentResult.actionableArtifacts.marketInsights.demandLevel}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mock Technical Questions Artifact */}
                  {agentResult.actionableArtifacts?.mockQuestions && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-teal-600" />
                        Role-Specific Technical Mock Questions
                      </h4>
                      <div className="space-y-2">
                        {agentResult.actionableArtifacts.mockQuestions.map((q, idx) => (
                          <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-teal-700 uppercase">{q.category}</span>
                              <span className="text-[10px] text-slate-400">Q{idx + 1}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900">{q.question}</p>
                            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                              💡 <span className="font-semibold">Preparation Hint:</span> {q.sampleAnswerHint}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 1-Click Apply using Agent Deliverable */}
                  {agentResult.actionableArtifacts?.tailoredPitch && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleApplyWithPitch(agentResult.actionableArtifacts!.tailoredPitch!)}
                        className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Application with Agent Tailored Pitch</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* TAB 1: JOB DETAILS OVERVIEW */
            <>
              {/* Highlight Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salary</span>
                  <p className="text-xs sm:text-sm font-extrabold text-emerald-700 mt-0.5">{job.salaryText}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Experience</span>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">{job.experience}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employment</span>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">{job.employmentType}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Mode</span>
                  <p className="text-xs sm:text-sm font-extrabold text-teal-700 mt-0.5">{job.workMode}</p>
                </div>
              </div>

              {/* MOAS Algorithmic Match Card */}
              {job.matchScore && (
                <div className="p-4 bg-gradient-to-r from-teal-50 via-emerald-50/60 to-slate-50 border border-teal-200/80 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {job.matchScore}%
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        MOAS Algorithmic Compatibility
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Your skills ({user.skills.slice(0, 3).join(", ")}) align directly with this job's requirements.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("rag-match");
                      if (!ragResult && !isRagLoading) handleRunRAGMatch();
                    }}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
                  >
                    View RAG Details
                  </button>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Role Overview</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{job.description}</p>
              </div>

              {/* Requirements */}
              {job.requirements && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Requirements</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {job.benefits && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Perks & Benefits</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.benefits.map((b, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-700"
                      >
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onToggleSave(job.id)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                    job.isSaved
                      ? "bg-teal-50 border-teal-300 text-teal-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Bookmark className="w-4 h-4" fill={job.isSaved ? "currentColor" : "none"} />
                  <span>{job.isSaved ? "Saved" : "Save Job"}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDirectChat?.(job.company, job.title);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Message Recruiter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(true)}
                    className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
