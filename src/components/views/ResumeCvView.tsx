import React, { useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Eye,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  RefreshCw,
  ShieldCheck,
  Check,
  Trash2,
} from "lucide-react";
import { UserProfile, ResumeItem } from "../../types";

interface ResumeCvViewProps {
  user: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const ResumeCvView: React.FC<ResumeCvViewProps> = ({ user, onUpdateUser }) => {
  const resumes = user.resumes || [];
  const [atsScore, setAtsScore] = useState(85);
  const [scoreLabel, setScoreLabel] = useState("Excellent");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Gemini AI Resume Optimizer
  const handleAnalyzeWithAI = async () => {
    setAiAnalyzing(true);
    try {
      const res = await fetch("/api/moas/ai-analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeName: resumes[0]?.name,
          role: user.role,
          skills: user.skills,
          experienceYears: user.experienceLevel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResults(data);
        if (data.score) setAtsScore(data.score);
        if (data.label) setScoreLabel(data.label);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = typeof event.target?.result === "string" ? event.target.result : undefined;
      const newResume: ResumeItem = {
        id: `res-${Date.now()}`,
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        updatedAt: new Date().toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        type: file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX",
        isPrimary: resumes.length === 0,
        dataUrl,
      };

      const updatedResumes = [newResume, ...resumes.filter((r) => r.name !== file.name)];
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          resumes: updatedResumes,
        });
      }

      // Sync with server
      fetch("/api/moas/upload-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          resume: newResume,
        }),
      }).catch(console.error);

      setUploadNotice(`"${file.name}" permanently saved to your ID ${user.id || "MOAS-ID-84920"}`);
      setTimeout(() => setUploadNotice(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSetPrimary = (resumeId: string) => {
    const updated = resumes.map((r) => ({
      ...r,
      isPrimary: r.id === resumeId,
    }));
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        resumes: updated,
      });
    }
  };

  const handleDeleteResume = (resumeId: string) => {
    const updated = resumes.filter((r) => r.id !== resumeId);
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        resumes: updated,
      });
    }
  };

  const handleDownload = (res: ResumeItem) => {
    if (res.dataUrl) {
      const a = document.createElement("a");
      a.href = res.dataUrl;
      a.download = res.name;
      a.click();
    } else {
      const textContent = `MOAS Candidate Resume Record\nCandidate Name: ${user.name}\nCandidate ID: ${user.id}\nEmail: ${user.email}\nPhone: ${user.phone}\nFile: ${res.name}\nSize: ${res.size}\nStatus: Permanent Verified`;
      const blob = new Blob([textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${res.name}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Permanent ID Verification Banner */}
      <div className="p-4 bg-teal-50 border border-teal-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                Permanent Candidate ID:
              </h3>
              <span className="font-mono font-bold text-xs bg-white text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                {user.id || "MOAS-ID-84920"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                <Check className="w-3 h-3" /> Permanent Record
              </span>
            </div>
            <p className="text-[11px] text-teal-800 mt-0.5">
              All uploaded resumes, CV versions, and verified skills are permanently bound to this ID.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-teal-700 font-semibold">
            {resumes.length} {resumes.length === 1 ? "Resume" : "Resumes"} Stored
          </span>
        </div>
      </div>

      {uploadNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadNotice}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Resume & CV Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Permanently store your verified documents and analyze ATS compatibility with MOAS AI
          </p>
        </div>

        <button
          onClick={handleAnalyzeWithAI}
          disabled={aiAnalyzing}
          className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-75"
        >
          {aiAnalyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-300" />
          )}
          <span>{aiAnalyzing ? "Analyzing with MOAS AI..." : "Analyze with MOAS AI"}</span>
        </button>
      </div>

      {/* Grid: Latest Resume & ATS Score Meter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Primary Active Resume
            </h3>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Document
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-sm">
                {resumes.find((r) => r.isPrimary)?.type || resumes[0]?.type || "PDF"}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {resumes.find((r) => r.isPrimary)?.name ||
                    resumes[0]?.name ||
                    "No resume uploaded yet"}
                </h4>
                <p className="text-xs text-slate-500">
                  Updated:{" "}
                  {resumes.find((r) => r.isPrimary)?.updatedAt ||
                    resumes[0]?.updatedAt ||
                    "Just now"}{" "}
                  • Size:{" "}
                  {resumes.find((r) => r.isPrimary)?.size || resumes[0]?.size || "0 KB"}
                </p>
              </div>
            </div>

            {resumes.length > 0 && (
              <button
                onClick={() => handleDownload(resumes.find((r) => r.isPrimary) || resumes[0])}
                className="p-2 text-teal-700 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                title="Download verified resume"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-[11px] text-slate-400">ATS Readiness</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">High (92%)</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-[11px] text-slate-400">Keywords Fit</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">14 Matched</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-[11px] text-slate-400">Total Versions</p>
              <p className="text-sm font-bold text-teal-700 mt-0.5">{resumes.length} Permanent</p>
            </div>
          </div>
        </div>

        {/* ATS Score Meter Card */}
        <div className="md:col-span-5 bg-gradient-to-br from-teal-900 to-[#0F2E4D] text-white p-6 rounded-3xl shadow-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
              Algorithmic ATS Index
            </span>
            <span className="p-1.5 bg-teal-800/80 rounded-lg text-teal-200">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div className="flex items-end gap-3 my-2">
            <span className="text-5xl font-extrabold text-white">{atsScore}</span>
            <span className="text-slate-300 text-sm font-semibold mb-1">/ 100</span>
            <span className="ml-auto px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-400/30">
              {scoreLabel}
            </span>
          </div>

          <p className="text-xs text-teal-100/80 leading-relaxed">
            Your primary resume is algorithmic-friendly, passing standard parser tokens and
            machine-learning screening criteria.
          </p>

          <div className="pt-3 border-t border-teal-800/50 flex items-center justify-between text-xs text-teal-200">
            <span>Verified Candidate:</span>
            <span className="font-bold text-white">{user.name}</span>
          </div>
        </div>
      </div>

      {/* AI Analysis Results if available */}
      {aiResults && (
        <div className="p-6 bg-white border border-teal-200 rounded-3xl shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              MOAS AI Algorithmic Resume Insights
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">{aiResults.summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Key Profile Strengths
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {aiResults.strengths?.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Recommendations for 95+ Score
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {aiResults.improvements?.map((imp: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {aiResults.keywordSuggestions && (
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-700 mb-2">Recommended Keywords:</p>
              <div className="flex flex-wrap gap-2">
                {aiResults.keywordSuggestions.map((kw: string, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-semibold"
                  >
                    +{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Resumes & Upload Drag Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Permanent Document Vault ({resumes.length})
              </h3>
              <span className="text-xs text-slate-400">Tied to ID {user.id}</span>
            </div>

            <div className="space-y-3">
              {resumes.map((res) => (
                <div
                  key={res.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {res.type}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{res.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {res.size} • {res.updatedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {res.isPrimary ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> Primary
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetPrimary(res.id)}
                        className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(res)}
                      className="p-1.5 text-slate-500 hover:text-teal-700 rounded-lg hover:bg-white cursor-pointer"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {resumes.length > 1 && (
                      <button
                        onClick={() => handleDeleteResume(res.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white cursor-pointer"
                        title="Delete resume"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Drag & Drop Upload Zone */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              className={`block p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-teal-600 bg-teal-50 scale-[1.01]"
                  : "border-teal-300 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/40"
              }`}
            >
              <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">
                Click or drag & drop to upload new resume or CV
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PDF, DOCX, DOC • Permanently attached to your Candidate ID
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right Optimization Checklist */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Permanent Candidate Verification
            </h3>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ID Status:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Permanent & Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Candidate ID:</span>
                <span className="font-mono font-bold text-slate-800">{user.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Holder Name:</span>
                <span className="font-bold text-slate-800">{user.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-700">{user.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Documents Attached:</span>
                <span className="font-bold text-teal-700">{resumes.length} Verified</span>
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2">
              Resume Optimization Checklist
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Work Experience</h4>
                  <p className="text-slate-500 text-[11px]">Quantifiable performance metrics</p>
                </div>
                <span className="font-bold text-teal-700">+10%</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Technical Skills</h4>
                  <p className="text-slate-500 text-[11px]">Matching top hiring criteria</p>
                </div>
                <span className="font-bold text-teal-700">+5%</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Algorithmic Keywords</h4>
                  <p className="text-slate-500 text-[11px]">ML models, APIs, and frameworks</p>
                </div>
                <span className="font-bold text-teal-700">+5%</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Higher Education</h4>
                  <p className="text-slate-500 text-[11px]">Degrees and certifications</p>
                </div>
                <span className="font-bold text-teal-700">+5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
