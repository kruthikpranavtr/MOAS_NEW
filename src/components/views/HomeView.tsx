import React, { useState } from "react";
import {
  Search,
  MapPin,
  Briefcase,
  Layers,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Shield,
  Zap,
  Users,
  Building2,
  ChevronRight,
  Sparkles,
  Download,
  Copy,
  Maximize2,
  Cpu,
  Database,
  Radio,
  Share2,
  Code2,
  Activity,
  Check,
} from "lucide-react";
import { Job, NavigationState } from "../../types";

interface HomeViewProps {
  user?: any;
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
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [activeDiagramTab, setActiveDiagramTab] = useState<"topology" | "pipeline" | "partyMode" | "mermaid">("topology");
  const [selectedNode, setSelectedNode] = useState<string>("engine");

  const categories = [
    { title: "Core Engineering", count: "12,540 Jobs", icon: Cpu, color: "text-cyan-400 bg-cyan-950/60 border-cyan-500/30" },
    { title: "Distributed Systems", count: "8,420 Jobs", icon: Layers, color: "text-indigo-400 bg-indigo-950/60 border-indigo-500/30" },
    { title: "AI & ML Ops", count: "4,250 Jobs", icon: Sparkles, color: "text-purple-400 bg-purple-950/60 border-purple-500/30" },
    { title: "Cloud Architecture", count: "3,620 Jobs", icon: Building2, color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30" },
    { title: "Carrier & Telecom", count: "1,840 Jobs", icon: Radio, color: "text-amber-400 bg-amber-950/60 border-amber-500/30" },
    { title: "High-Throughput Data", count: "2,350 Jobs", icon: Database, color: "text-rose-400 bg-rose-950/60 border-rose-500/30" },
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

  const handleCopySpec = () => {
    const spec = `architectureDiagram:
  service: MOAS - ML Opportunities and Algorithmic Services
  flow:
    - candidate: { type: "Profile/Resume", format: "PDF/JSON" }
    - parser: { engine: "Gemini 3.8 Flash", task: "Skill Vectorization" }
    - matcher: { engine: "PostgreSQL pgvector / PGlite", threshold: 0.85 }
    - gateway: { carrier: "TextBee SMS Gateway", protocol: "E.164 OTP" }
    - recruiter: { dispatch: "Direct Talent Handshake", latency: "<45ms" }`;
    navigator.clipboard.writeText(spec);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  return (
    <div className="space-y-14 pb-20 font-sans text-slate-100">
      {/* Hero Architectural Canvas Section (Signature Style of architecturediagram.ai) */}
      <section className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#090D16] shadow-2xl p-6 sm:p-10 lg:p-12">
        {/* Background Blueprint SVG Grid with Mask */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            className="opacity-25"
          >
            <defs>
              <pattern
                id="hero-blueprint-grid"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="35"
                  height="35"
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="0.6"
                  strokeDasharray="2 2"
                />
              </pattern>
              <radialGradient id="hero-glow" cx="50%" cy="0%" r="60%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-glow)" />
            <rect width="100%" height="100%" fill="url(#hero-blueprint-grid)" />
          </svg>
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
        </div>

        {/* Hero Header & Title */}
        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 text-cyan-300 text-xs font-mono mb-5 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            <span>AI Architecture & Algorithmic Opportunities</span>
            <span className="text-white/30">|</span>
            <span className="text-slate-400">v2.4 Live</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
            Design Your Career Architecture.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
              Accelerated by Machine Learning.
            </span>
          </h1>

          <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            Generate optimal career trajectories, inspect architectural tradeoffs, and match with verified engineering employers via Gemini 3.8 and PostgreSQL vectors.
          </p>

          {/* Multi-Format Segmented Tab Pills */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            {[
              { id: "topology", label: "System Topology", icon: Cpu },
              { id: "pipeline", label: "Algorithmic Pipeline", icon: Activity },
              { id: "partyMode", label: "Party Mode (Compare Models)", icon: Sparkles },
              { id: "mermaid", label: "Mermaid Flow", icon: Code2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDiagramTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDiagramTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)] font-semibold"
                      : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Unified Obsidian Search Prompt Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 w-full max-w-3xl glass-panel p-2 sm:p-2.5 rounded-2xl flex flex-col md:flex-row items-center gap-2 border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
          >
            <div className="flex-1 flex items-center gap-2.5 w-full px-3 py-2 border-b md:border-b-0 md:border-r border-white/10">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Describe role, tech stack, or system (e.g. Distributed, React, Go)"
                className="w-full text-sm bg-transparent focus:outline-none placeholder-slate-500 text-white font-sans"
              />
            </div>

            <div className="flex-1 flex items-center gap-2.5 w-full px-3 py-2 border-b md:border-b-0 md:border-r border-white/10">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Region (e.g. Bangalore, Remote, Hybrid)"
                className="w-full text-sm bg-transparent focus:outline-none placeholder-slate-500 text-white font-sans"
              />
            </div>

            <div className="w-full md:w-40 px-3 py-2 border-b md:border-b-0 md:border-r border-white/10">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none text-slate-300 cursor-pointer font-mono"
              >
                <option value="All Categories" className="bg-[#0F172A] text-white">All Tiers</option>
                <option value="Engineering" className="bg-[#0F172A] text-white">Engineering</option>
                <option value="AI & ML" className="bg-[#0F172A] text-white">AI & ML</option>
                <option value="Distributed" className="bg-[#0F172A] text-white">Distributed</option>
                <option value="DevOps" className="bg-[#0F172A] text-white">DevOps</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 font-mono"
            >
              <span>Execute Match</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Live Architecture Flow Diagram Component (Inspired directly by architecturediagram.ai) */}
        <div className="relative z-10 mt-10 max-w-4xl mx-auto rounded-2xl border border-white/10 bg-[#0B0F19]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Diagram Workspace Top Control Bar */}
          <div className="px-4 py-2.5 border-b border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-semibold text-slate-200">MOAS System Architecture</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400">
                Live Interactive Canvas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySpec}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] transition-colors cursor-pointer"
                title="Copy Architecture Spec"
              >
                {copiedSpec ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSpec ? "Copied" : "Copy YAML"}</span>
              </button>
              <button
                onClick={() => onNavigate("find-jobs")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] transition-colors cursor-pointer"
                title="Explore Opportunities"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Diagram Visual Nodes Canvas */}
          <div className="p-6 sm:p-8 bg-[#070A12] relative overflow-hidden">
            {/* Grid Pattern inside Canvas */}
            <div className="absolute inset-0 bg-blueprint-dashed opacity-40 pointer-events-none" />

            {/* Interactive Flow Nodes */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
              {/* Node 1: Candidate Spec */}
              <div
                onClick={() => setSelectedNode("candidate")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedNode === "candidate"
                    ? "bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                    : "bg-slate-900/60 border-white/10 hover:border-cyan-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-1">
                  <span>INPUT SPEC</span>
                  <span>01</span>
                </div>
                <h4 className="text-xs font-bold text-white">Candidate Spec</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Skills, Resume & Auth</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300">
                  Ready
                </span>
              </div>

              {/* Node 2: AI Parser (Gemini) */}
              <div
                onClick={() => setSelectedNode("parser")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedNode === "parser"
                    ? "bg-purple-950/60 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                    : "bg-slate-900/60 border-white/10 hover:border-purple-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-purple-400 mb-1">
                  <span>AI PARSER</span>
                  <span>02</span>
                </div>
                <h4 className="text-xs font-bold text-white">Gemini 3.8 Flash</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Multilingual & ATS</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300">
                  Vectorized
                </span>
              </div>

              {/* Node 3: Algorithmic Match Matrix */}
              <div
                onClick={() => setSelectedNode("engine")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedNode === "engine"
                    ? "bg-indigo-950/60 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                    : "bg-slate-900/60 border-white/10 hover:border-indigo-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-indigo-400 mb-1">
                  <span>MATCH ENGINE</span>
                  <span>03</span>
                </div>
                <h4 className="text-xs font-bold text-white">PostgreSQL / PGlite</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Algorithmic Scoring</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300">
                  98.4% Precision
                </span>
              </div>

              {/* Node 4: SMS Carrier Handshake */}
              <div
                onClick={() => setSelectedNode("carrier")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedNode === "carrier"
                    ? "bg-emerald-950/60 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    : "bg-slate-900/60 border-white/10 hover:border-emerald-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 mb-1">
                  <span>CARRIER GATEWAY</span>
                  <span>04</span>
                </div>
                <h4 className="text-xs font-bold text-white">TextBee Verified</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Real-time SMS OTP</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300">
                  Active Gateway
                </span>
              </div>

              {/* Node 5: Recruiter Dispatch */}
              <div
                onClick={() => setSelectedNode("dispatch")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedNode === "dispatch"
                    ? "bg-amber-950/60 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                    : "bg-slate-900/60 border-white/10 hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 mb-1">
                  <span>DISPATCH</span>
                  <span>05</span>
                </div>
                <h4 className="text-xs font-bold text-white">Direct Handshake</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Verified Employers</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300">
                  Instant Handshake
                </span>
              </div>
            </div>

            {/* Node Inspection Details Banner */}
            <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="font-mono text-slate-300">
                  {selectedNode === "candidate" && "Component: Candidate profile ingest with ATS optimization & verifiable mobile credential."}
                  {selectedNode === "parser" && "Component: Gemini 3.8 Flash multi-turn reasoning with fallback algorithmic engine."}
                  {selectedNode === "engine" && "Component: PostgreSQL schema with in-memory fallback, live query indexing & instant filtering."}
                  {selectedNode === "carrier" && "Component: Direct Android cellular gateway dispatch with universal system fallback."}
                  {selectedNode === "dispatch" && "Component: Automated interview booking & live employer dashboard notification sync."}
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 underline cursor-pointer" onClick={() => onNavigate("find-jobs")}>
                View Pipeline →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Role Architecture Cards (Candidate vs Employer) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Candidate Portal */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">Candidate Architecture Studio</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                For Job Seekers
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Explore thousands of verified engineering and algorithmic roles. Optimize your resume ATS score and apply with verified one-click credentials.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                ✓ Algorithmic Match
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                ✓ ATS Scoring (98%)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                ✓ TextBee SMS Verified
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("find-jobs")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-400 group-hover:text-cyan-300 cursor-pointer font-mono"
          >
            <span>Browse Architecture Roles</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Employer Portal */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">Talent Infrastructure & Hiring</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                For Employers
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Publish technical specs, generate AI job descriptions via Gemini 3.8, and automatically match verified algorithmic engineers.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                ✓ AI Spec Generator
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                ✓ Precision Filtering
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                ✓ Direct Candidate Handshake
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("post-job")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-400 group-hover:text-indigo-300 cursor-pointer font-mono"
          >
            <span>Publish Engineering Role</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Browse by Architecture Domain */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Browse by Engineering Domain</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">Structured across scalable distributed systems & AI workloads</p>
          </div>
          <button
            onClick={() => onNavigate("find-jobs")}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
          >
            <span>Explore All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div
                key={i}
                onClick={() => onNavigate("find-jobs")}
                className="p-4 glass-card rounded-2xl cursor-pointer text-center group hover:border-cyan-500/40 transition-all"
              >
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2.5 border ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                  {cat.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">{cat.count}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Engineering Opportunities */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Featured Architecture Roles</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">Algorithmic-verified opportunities with carrier OTP security</p>
          </div>
          <button
            onClick={() => onNavigate("find-jobs")}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
          >
            <span>See All Listings</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="p-10 glass-panel rounded-3xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Platform Ready • Clean Ingest Pipeline</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed font-mono">
              Database initialized. Verified engineering roles will appear here dynamically as companies publish them.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate("post-job")}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer font-mono"
              >
                Post a Job
              </button>
              <button
                onClick={() => onNavigate("messages")}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold rounded-xl transition-all border border-white/10 cursor-pointer font-mono"
              >
                Chat with MOAS AI
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                className="p-5 glass-card rounded-2xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={job.logo}
                        alt={job.company}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl p-1 border border-white/10 object-contain bg-slate-900"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {job.title}
                        </h4>
                        <p className="text-xs font-mono text-slate-400">{job.company}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleSaveJob(job.id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        job.isSaved
                          ? "bg-cyan-950/60 border-cyan-400 text-cyan-400"
                          : "border-white/10 text-slate-500 hover:text-slate-300"
                      }`}
                      title={job.isSaved ? "Saved" : "Save Job"}
                    >
                      <Bookmark className="w-4 h-4" fill={job.isSaved ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-slate-300 rounded">
                      {job.location}
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 rounded">
                      {job.employmentType}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 rounded">
                      {job.salaryText}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">{job.postedTime}</span>
                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer font-mono"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Architectural Trust Metrics */}
      <section className="py-6 px-6 sm:px-8 glass-panel rounded-3xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <Shield className="w-6 h-6 text-cyan-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Carrier Verified</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time SMS OTP authentication</p>
          </div>
          <div className="flex flex-col items-center">
            <Zap className="w-6 h-6 text-indigo-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Low-Latency Match</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">&lt;45ms vector search precision</p>
          </div>
          <div className="flex flex-col items-center">
            <Briefcase className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Architecture Roles</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Distributed systems & AI focus</p>
          </div>
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Data Sovereignty</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Encrypted candidate credentials</p>
          </div>
        </div>
      </section>

      {/* Newsletter Architectural Digest Banner */}
      <section className="p-8 sm:p-10 rounded-3xl border border-white/10 bg-gradient-to-r from-[#0B1222] via-[#0D1829] to-[#090D16] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="max-w-md relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono mb-2">
            <span>WEEKLY SPEC DIGEST</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold">Get Architectural Job Alerts</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            Receive automated digests of roles aligned with your system design & algorithmic profile.
          </p>
        </div>

        {subscribed ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-mono">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Subscribed successfully! Architecture digest active.</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2 relative z-10">
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              placeholder="Enter developer email..."
              required
              className="px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 w-full md:w-64 font-sans"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 cursor-pointer font-mono"
            >
              Subscribe
            </button>
          </form>
        )}
      </section>
    </div>
  );
};
