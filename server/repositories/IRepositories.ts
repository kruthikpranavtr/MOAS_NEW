import {
  JobRecord,
  ApplicationRecord,
  UserRecord,
  CompanyRecord,
  CompanyRatingRecord,
  SavedJobRecord,
  JobAlertRecord,
  ProfileViewRecord,
  ResumeItem,
} from "../models/types.js";

export interface IJobRepository {
  getAll(search?: string, department?: string, location?: string): Promise<JobRecord[]>;
  getById(id: string): Promise<JobRecord | null>;
  save(job: JobRecord): Promise<JobRecord>;
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
  updatePhoto(userId: string, avatarUrl: string): Promise<UserRecord | null>;
  getResumes(userId: string): Promise<ResumeItem[]>;
  saveResume(resume: ResumeItem): Promise<ResumeItem>;
}

export interface ICompanyRepository {
  getAll(): Promise<CompanyRecord[]>;
  getTopCompanies(minRating?: number, limit?: number): Promise<CompanyRecord[]>;
  getRatings(companyName?: string): Promise<CompanyRatingRecord[]>;
  saveRating(rating: CompanyRatingRecord): Promise<{ rating: CompanyRatingRecord; company?: CompanyRecord }>;
}

export interface ISavedJobRepository {
  getByUser(userId: string): Promise<SavedJobRecord[]>;
  toggle(userId: string, jobId: string): Promise<{ saved: boolean; count?: number }>;
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
