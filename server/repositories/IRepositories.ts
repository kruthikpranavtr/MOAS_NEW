import {
  JobRecord,
  JobSearchParams,
  JobSearchResult,
  ApplicationRecord,
  UserRecord,
  CompanyRecord,
  CompanyRatingRecord,
  SavedJobRecord,
  JobAlertRecord,
  ProfileViewRecord,
  ResumeItem,
  CandidateProfileRecord,
} from "../models/types.js";

export interface IJobRepository {
  getAll(search?: string, department?: string, location?: string, status?: string): Promise<JobRecord[]>;
  searchJobs(params: JobSearchParams): Promise<JobSearchResult>;
  getById(id: string): Promise<JobRecord | null>;
  getByEmployer(employerId: string, status?: string, search?: string): Promise<JobRecord[]>;
  getByCompany(companyId: string, status?: string): Promise<JobRecord[]>;
  getCategoryCounts(): Promise<Array<{ category: string; count: number }>>;
  save(job: JobRecord): Promise<JobRecord>;
  updateStatus(id: string, status: string): Promise<JobRecord | null>;
  delete(id: string): Promise<boolean>;
}

export interface IApplicationRepository {
  getAll(candidateId?: string): Promise<ApplicationRecord[]>;
  getById(id: string): Promise<ApplicationRecord | null>;
  create(app: ApplicationRecord): Promise<ApplicationRecord>;
  updateStatus(id: string, status: ApplicationRecord["status"], stage?: string): Promise<ApplicationRecord | null>;
  delete(id: string): Promise<boolean>;
}

export interface IUserRepository {
  getAll(): Promise<UserRecord[]>;
  getByIdOrEmail(idOrEmail: string): Promise<UserRecord | null>;
  save(user: UserRecord): Promise<UserRecord>;
  updatePhoto(userId: string, avatarUrl: string, storageKey?: string): Promise<UserRecord | null>;
  getResumes(userId: string): Promise<ResumeItem[]>;
  getResumeById(id: string): Promise<ResumeItem | null>;
  saveResume(resume: ResumeItem): Promise<ResumeItem>;
  setPrimaryResume(userId: string, resumeId: string): Promise<ResumeItem | null>;
  deleteResume(userId: string, resumeId: string): Promise<{ deleted: boolean; storageKey?: string; newPrimaryId?: string }>;
  getCandidateProfile(userId: string): Promise<CandidateProfileRecord | null>;
  saveCandidateProfile(profile: Partial<CandidateProfileRecord> & { userId: string }): Promise<CandidateProfileRecord>;
}

export interface ICompanyRepository {
  getAll(): Promise<CompanyRecord[]>;
  getTopCompanies(minRating?: number, limit?: number): Promise<CompanyRecord[]>;
  getRatings(companyName?: string): Promise<CompanyRatingRecord[]>;
  saveRating(rating: CompanyRatingRecord): Promise<{ rating: CompanyRatingRecord; company?: CompanyRecord }>;
}

export interface ISavedJobRepository {
  getByUser(userId: string): Promise<SavedJobRecord[]>;
  getByUserWithJobs(userId: string): Promise<SavedJobRecord[]>;
  toggle(userId: string, jobId: string): Promise<{ saved: boolean; count?: number }>;
  delete(userId: string, jobId: string): Promise<boolean>;
}

export interface IJobAlertRepository {
  getByUser(userId: string): Promise<JobAlertRecord[]>;
  save(alert: JobAlertRecord): Promise<JobAlertRecord>;
  delete(id: string): Promise<boolean>;
}

export interface IProfileViewRepository {
  getAll(userId?: string): Promise<{ count: number; views: ProfileViewRecord[] }>;
  record(view: Partial<ProfileViewRecord>): Promise<ProfileViewRecord>;
  clear(userId?: string): Promise<{ success: boolean; cleared: number } | boolean>;
}

export interface IEmployerProfileRepository {
  getByUserId(userId: string): Promise<import("../models/types.js").EmployerProfileRecord | null>;
  upsert(userId: string, data: Partial<import("../models/types.js").EmployerProfileRecord>): Promise<import("../models/types.js").EmployerProfileRecord>;
}

export interface ICompanyMemberRepository {
  getMembership(companyId: string, userId: string): Promise<import("../models/types.js").CompanyMemberRecord | null>;
  getUserCompanies(userId: string): Promise<import("../models/types.js").CompanyMemberRecord[]>;
  getCompanyMembers(companyId: string): Promise<import("../models/types.js").CompanyMemberRecord[]>;
}


