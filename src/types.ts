export type NavigationState =
  | "login"
  | "register"
  | "otp"
  | "home"
  | "dashboard"
  | "dashboard/jobseeker"
  | "dashboard/employer"
  | "find-jobs"
  | "top-companies"
  | "post-job"
  | "my-applications"
  | "saved-jobs"
  | "job-alerts"
  | "messages"
  | "resume-cv"
  | "profile"
  | "settings";

export interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  verified?: boolean;
  location: string;
  employmentType: "Full Time" | "Part Time" | "Contract" | "Internship" | "Freelance" | "Small Task" | "Daily Wage" | "Skilled Trade" | "Trainee" | string;
  workMode: "On-site" | "Remote" | "Hybrid" | string;
  experience: string;
  salaryMin: number;
  salaryMax: number;
  salaryText: string;
  salaryCurrency?: string;
  salaryPeriod?: string;
  postedTime: string;
  tags: string[];
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  skills?: string[];
  preferredSkills?: string[];
  requirements?: string[];
  benefits?: string[];
  category?: string;
  department?: string;
  applicationDeadline?: string;
  openingsCount?: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isSaved?: boolean;
  matchScore?: number;
  rating?: number;
  reviewsCount?: number;
  status?: "open" | "published" | "draft" | "closed" | "archived" | string;
  companyId?: string;
  employerId?: string;
  publishedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  companyVerificationStatus?: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  logo: string;
  location: string;
  type: string;
  appliedDate: string;
  status: "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Interview" | "Offered" | "Hired" | "Rejected" | string;
  stage?: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  resumeName?: string;
  notes?: string;
  recruiterNotes?: string;
  interviewScheduledAt?: string;
  matchScore?: number;
}

export interface JobAlert {
  id: string;
  title: string;
  location: string;
  type: string;
  salaryRange: string;
  experience: string;
  frequency: "Daily" | "Weekly";
  lastSent: string;
  active: boolean;
  pausedDate?: string;
  category: "Active" | "Paused" | "Expired";
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "job" | "application" | "system";
  company?: string;
  read?: boolean;
}

export type LanguageCode =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "zh"
  | "hi"
  | "ar"
  | "pt"
  | "ja"
  | "ru"
  | "ko"
  | "it"
  | "nl"
  | "tr"
  | "id"
  | "te"
  | "ta"
  | "kn"
  | "ml"
  | "bn"
  | "mr"
  | "gu"
  | "pa"
  | "ur"
  | "vi"
  | "pl"
  | "uk";

export interface Message {
  id: string;
  sender: "recruiter" | "user";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  recruiterName: string;
  company: string;
  logo: string;
  role: string;
  jobId: string;
  jobTitle: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  jobDetails: {
    jobId: string;
    experience: string;
    salary: string;
    jobType: string;
    location: string;
  };
  messages: Message[];
}

export interface ResumeItem {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  type: "DOCX" | "PDF";
  isPrimary: boolean;
  dataUrl?: string;
  storageKey?: string;
  originalFilename?: string;
}

export interface RegisteredUser {
  id: string;
  username?: string;
  password?: string;
  name: string;
  email: string;
  phone: string;
  role: "Candidate" | "Employer" | "jobseeker" | "employer";
  companyName?: string;
  companyEmail?: string;
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  companyWebsite?: string;
  skills?: string[];
  experienceLevel?: string;
  avatarUrl?: string;
  title?: string;
  location?: string;
  bio?: string;
  resumes?: ResumeItem[];
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  password?: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  memberSince: string;
  quote: string;
  avatarUrl: string;
  dateOfBirth: string;
  experienceLevel: string;
  industry: string;
  aboutMe: string;
  profileStrength: number;
  skills: string[];
  companyName?: string;
  companyEmail?: string;
  companySize?: string;
  contactPerson?: string;
  companyWebsite?: string;
  education?: CandidateEducation[];
  workExperience?: CandidateWorkExperience[];
  projects?: CandidateProject[];
  certifications?: CandidateCertification[];
  preferredCategories?: string[];
  preferredLocation?: string;
  desiredSalary?: string;
  missingSections?: string[];
  resumes: ResumeItem[];
}

export interface CandidateEducation {
  id: string;
  degree: string;
  institution: string;
  year?: string;
  fieldOfStudy?: string;
}

export interface CandidateWorkExperience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface CandidateProject {
  id: string;
  title: string;
  description: string;
  url?: string;
  technologies?: string[];
}

export interface CandidateCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  industry: string;
  location: string;
  rating: number;
  reviewsCount: string;
  employeesCount: string;
  openJobsCount: number;
  isVerified: boolean;
  verificationStatus?: "pending" | "under_review" | "verified" | "rejected" | "suspended" | string;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  headquarters?: string;
  locations?: string[];
  benefits?: string[];
  culture?: string;
  socialLinks?: Record<string, string>;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  description?: string;
  ownerUserId?: string;
  isArchived?: boolean;
  isFollowing?: boolean;
  cultureRating?: number;
  workLifeRating?: number;
  growthRating?: number;
  compensationRating?: number;
  featuredReview?: string;
  tagline?: string;
}

export interface CompanyMember {
  id: string;
  companyId: string;
  userId: string;
  role: "owner" | "admin" | "recruiter" | "member";
  isVerified: boolean;
  invitationEmail?: string;
  status?: "pending" | "accepted" | "declined" | string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  createdAt?: string;
}

export interface EmployerDashboardStats {
  totalJobsPosted: number;
  activeJobOpenings: number;
  closedJobOpenings: number;
  totalApplications: number;
  newApplications: number;
  underReviewApplications: number;
  shortlistedCandidates: number;
  interviewStageCandidates: number;
  offeredCandidates: number;
  hiredCandidates: number;
  recentApplications: Application[];
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  companyProfile?: Company | null;
  verificationStatus: string;
}

export interface CompanyRating {
  id: string;
  companyName: string;
  userId: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  cultureRating?: number;
  workLifeRating?: number;
  growthRating?: number;
  compensationRating?: number;
  reviewTitle: string;
  reviewText: string;
  pros?: string;
  cons?: string;
  recommendToFriend?: boolean;
  createdAt: string;
}

// RAG (Retrieval-Augmented Generation) Interfaces
export interface RAGRetrievedChunk {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  salaryText: string;
  similarityScore: number;
  matchedKeywords: string[];
  citationSnippet: string;
}

export interface RAGSearchResult {
  query: string;
  groundedAnswer: string;
  retrievedJobs: RAGRetrievedChunk[];
  source: string;
}

export interface RAGJobMatchResult {
  jobId: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  groundedSummary: string;
  verifiedStrengths: Array<{
    strength: string;
    citedJobRequirement: string;
    candidateEvidence: string;
  }>;
  criticalSkillGaps: Array<{
    skill: string;
    importance: "High" | "Medium" | "Low";
    recommendation: string;
  }>;
  tailoredApplicationPitch: string;
  atsScore: number;
  source: string;
}

// Agentic AI Interfaces
export type AgentToolName =
  | "search_jobs_rag"
  | "assess_candidate_fit"
  | "draft_application_pitch"
  | "generate_technical_prep"
  | "benchmark_compensation"
  | "execute_auto_apply";

export interface AgentExecutionStep {
  stepNumber: number;
  title: string;
  thought: string;
  tool: AgentToolName;
  input: Record<string, any>;
  output: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed";
  durationMs?: number;
}

export interface AgentRunResult {
  goal: string;
  status: "idle" | "running" | "completed" | "failed";
  plan: string[];
  steps: AgentExecutionStep[];
  finalSynthesis: string;
  actionableArtifacts?: {
    recommendedJobIds?: string[];
    tailoredPitch?: string;
    mockQuestions?: Array<{
      question: string;
      category: string;
      sampleAnswerHint: string;
    }>;
    marketInsights?: {
      medianSalary: string;
      demandLevel: string;
      topHiringLocations: string[];
    };
  };
  source: string;
}

export interface ProfileViewEvent {
  id: string;
  userId: string;
  viewerType: "Recruiter" | "Hiring Manager" | "Employer" | "Platform Visitor";
  viewerName: string;
  viewerCompany: string;
  viewerRole: string;
  viewerAvatar?: string;
  source: string;
  viewedAt: string;
  durationSeconds?: number;
  jobId?: string;
  jobTitle?: string;
  isVerifiedRecruiter?: boolean;
}

