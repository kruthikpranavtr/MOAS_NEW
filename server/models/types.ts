export type UserRole = "Candidate" | "Employer" | "Admin" | "jobseeker" | "employer";

export interface ResumeItem {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  type: "DOCX" | "PDF";
  isPrimary: boolean;
  dataUrl?: string;
  fileUrl?: string;
  storageKey?: string;
  userId?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  parsedText?: string;
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

export interface CandidateProfileRecord {
  id: string;
  userId: string;
  headline?: string;
  bio?: string;
  experienceYears?: number;
  skills: string[];
  education: CandidateEducation[];
  workExperience: CandidateWorkExperience[];
  projects: CandidateProject[];
  certifications: CandidateCertification[];
  preferredCategories: string[];
  preferredLocation?: string;
  desiredSalary?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  completenessScore: number;
  missingSections: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRecord {
  id: string;
  username?: string;
  password?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  companyName?: string;
  companyEmail?: string;
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  companyWebsite?: string;
  avatarUrl: string;
  avatarStorageKey?: string;
  location: string;
  quote?: string;
  headline?: string;
  aboutMe?: string;
  skills?: string[];
  experienceLevel?: string;
  education?: CandidateEducation[];
  workExperience?: CandidateWorkExperience[];
  projects?: CandidateProject[];
  certifications?: CandidateCertification[];
  preferredCategories?: string[];
  preferredLocation?: string;
  resumes?: ResumeItem[];
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type SanitizedUser = Omit<UserRecord, "password">;

export interface UserSession {
  token: string;
  userId: string;
  username?: string;
  email: string;
  role: string;
  name: string;
  createdAt: number;
  expiresAt: number;
}

export interface JobRecord {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  employmentType?: string;
  experience: string;
  salary: string;
  salaryText?: string;
  salaryCurrency?: string;
  salaryPeriod?: string;
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  skills?: string[];
  preferredSkills?: string[];
  requirements: string[];
  department: string;
  category?: string;
  tags: string[];
  isVerified: boolean;
  companyVerified?: boolean;
  companyVerificationStatus?: string;
  postedDate: string;
  status?: "open" | "published" | "draft" | "closed" | "archived" | "suspended" | string;
  workMode?: string;
  logoUrl?: string;
  logo?: string;
  applicantCount?: number;
  openingsCount?: number;
  benefits?: string[];
  salaryMin?: number;
  salaryMax?: number;
  isFeatured?: boolean;
  employerId?: string;
  companyId?: string;
  applicationDeadline?: string;
  publishedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobSearchParams {
  search?: string;
  category?: string;
  department?: string;
  location?: string;
  workMode?: string;
  employmentType?: string;
  type?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  isVerified?: boolean;
  verifiedOnly?: boolean;
  status?: string;
  employerId?: string;
  companyId?: string;
  isFeatured?: boolean;
  datePosted?: string;
  sortBy?: "relevance" | "newest" | "oldest" | "salary_high" | "salary_low" | "company_asc" | string;
  page?: number;
  limit?: number;
  callerRole?: string;
  callerUserId?: string;
}

export interface JobSearchResult {
  jobs: JobRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApplicationHistoryRecord {
  id: string;
  applicationId: string;
  previousStatus?: string;
  newStatus: string;
  stage?: string;
  actorId: string;
  actorRole: string;
  reason?: string;
  createdAt: string;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  appliedDate: string;
  status: "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Interview" | "Offered" | "Hired" | "Rejected" | "Withdrawn" | string;
  stage?: string;
  matchScore?: number;
  resumeId?: string;
  resumeName?: string;
  resumeUrl?: string;
  coverLetter?: string;
  notes?: string;
  recruiterNotes?: string;
  interviewScheduledAt?: string;
  withdrawnAt?: string;
  rejectionReason?: string;
  history?: ApplicationHistoryRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  industry: string;
  location: string;
  size?: string;
  rating: number;
  reviewsCount?: number | string;
  description?: string;
  logo?: string;
  logoUrl?: string;
  logoStorageKey?: string;
  website?: string;
  openRolesCount?: number;
  openJobsCount?: number;
  verified?: boolean;
  verificationStatus?: "pending" | "under_review" | "verified" | "rejected" | "suspended" | string;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  ownerUserId?: string;
  headquarters?: string;
  locations?: string[];
  benefits?: string[];
  culture?: string;
  socialLinks?: Record<string, string>;
  contactEmail?: string;
  contactPhone?: string;
  isArchived?: boolean;
  cultureRating?: number;
  workLifeRating?: number;
  growthRating?: number;
  compensationRating?: number;
  featuredReview?: string;
  tagline?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyRatingRecord {
  id: string;
  companyId?: string;
  companyName: string;
  userId?: string;
  userName: string;
  userRole?: string;
  userAvatar?: string;
  rating: number;
  reviewTitle?: string;
  reviewText?: string;
  cultureRating?: number;
  workLifeRating?: number;
  growthRating?: number;
  compensationRating?: number;
  pros?: string;
  cons?: string;
  recommendToFriend?: boolean;
  createdAt?: string;
}

export interface SavedJobRecord {
  id: string;
  userId: string;
  jobId: string;
  savedDate?: string;
  savedAt?: string;
  job?: JobRecord;
}

export interface JobAlertRecord {
  id: string;
  userId: string;
  title?: string;
  query?: string;
  keyword?: string;
  location?: string;
  role?: string;
  category?: string;
  workMode?: string;
  minSalary?: number;
  experience?: string;
  skills?: string[];
  frequency?: "Daily" | "Weekly" | "Instant" | "daily" | "weekly" | string;
  channel?: string;
  active: boolean;
  lastProcessedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JobAlertDeliveryRecord {
  id: string;
  alertId: string;
  userId: string;
  jobId: string;
  deliveredAt: string;
  channel: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: "job" | "application" | "interview" | "offer" | "message" | "system" | string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  channel?: string;
  deliveryStatus?: string;
  isRead: boolean;
  readAt?: string;
  archived?: boolean;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  senderRole?: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  deliveryStatus?: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  jobId?: string;
  applicationId?: string;
  employerId?: string;
  candidateId?: string;
  participantIds?: string[];
  companyName?: string;
  companyLogo?: string;
  candidateName?: string;
  candidateAvatar?: string;
  title?: string;
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  messages?: MessageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileViewRecord {
  id: string;
  userId: string;
  viewerType?: "Recruiter" | "Hiring Manager" | "Employer" | "Platform Visitor" | string;
  viewerName?: string;
  viewerCompany?: string;
  viewerRole?: string;
  viewerAvatar?: string;
  recruiterId?: string;
  recruiterName?: string;
  recruiterRole?: string;
  recruiterCompany?: string;
  recruiterAvatar?: string;
  source?: string;
  action?: string;
  viewedAt: string;
  durationSeconds?: number;
  jobId?: string;
  jobTitle?: string;
  isVerifiedRecruiter?: boolean;
}

export interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

export interface CompanyMemberRecord {
  id: string;
  companyId: string;
  userId: string;
  role: "owner" | "admin" | "recruiter" | "member";
  isVerified: boolean;
  invitationEmail?: string;
  invitationToken?: string;
  status?: "pending" | "accepted" | "declined" | string;
  invitedBy?: string;
  expiresAt?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployerProfileRecord {
  id: string;
  userId: string;
  companyId?: string;
  companyName?: string;
  jobTitle?: string;
  department?: string;
  businessEmail?: string;
  phone?: string;
  designation?: string;
  location?: string;
  preferences?: Record<string, any>;
  verified: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  recentApplications: ApplicationRecord[];
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  companyProfile?: CompanyRecord | null;
  verificationStatus: string;
  stats?: Record<string, number>;
}

export interface AuditLogRecord {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  outcome: "SUCCESS" | "DENIED" | "FAILURE";
  createdAt?: string;
}

