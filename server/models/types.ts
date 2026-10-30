export type UserRole = "Candidate" | "Employer" | "Admin" | "jobseeker" | "employer";

export interface ResumeItem {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  type: "DOCX" | "PDF";
  isPrimary: boolean;
  dataUrl?: string;
  storageKey?: string;
  userId?: string;
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
  location: string;
  quote?: string;
  aboutMe?: string;
  skills?: string[];
  experienceLevel?: string;
  education?: any[];
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
  experience: string;
  salary: string;
  salaryText?: string;
  description: string;
  requirements: string[];
  department: string;
  tags: string[];
  isVerified: boolean;
  postedDate: string;
  workMode?: string;
  logoUrl?: string;
  logo?: string;
  applicantCount?: number;
  salaryMin?: number;
  salaryMax?: number;
  isFeatured?: boolean;
  employerId?: string;
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
  status: "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Rejected";
  stage?: string;
  matchScore?: number;
  resumeName?: string;
  notes?: string;
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
  website?: string;
  openRolesCount?: number;
  openJobsCount?: number;
  verified?: boolean;
  cultureRating?: number;
  workLifeRating?: number;
  growthRating?: number;
  compensationRating?: number;
  featuredReview?: string;
  tagline?: string;
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
}

export interface JobAlertRecord {
  id: string;
  userId: string;
  title?: string;
  query?: string;
  keyword?: string;
  location?: string;
  role?: string;
  frequency?: "Daily" | "Weekly" | "Instant" | "daily" | "weekly";
  channel?: string;
  active: boolean;
  createdAt: string;
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
