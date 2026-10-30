import { ICompanyRepository } from "./IRepositories.js";
import { CompanyRecord, CompanyRatingRecord } from "../models/types.js";
import {
  getCompanies,
  getTopCompanies,
  getCompanyRatings,
  saveCompanyRating,
} from "../db.js";

export class CompanyRepository implements ICompanyRepository {
  async getAll(): Promise<CompanyRecord[]> {
    return (await getCompanies()) as CompanyRecord[];
  }

  async getTopCompanies(minRating = 0, limit = 50): Promise<CompanyRecord[]> {
    return (await getTopCompanies(minRating, limit)) as CompanyRecord[];
  }

  async getRatings(companyName?: string): Promise<CompanyRatingRecord[]> {
    return (await getCompanyRatings(companyName)) as CompanyRatingRecord[];
  }

  async saveRating(rating: CompanyRatingRecord): Promise<{ rating: CompanyRatingRecord; company?: CompanyRecord }> {
    const res = await saveCompanyRating(rating as any);
    return {
      rating: res.rating as CompanyRatingRecord,
      company: res.company as CompanyRecord | undefined,
    };
  }
}

export const companyRepository = new CompanyRepository();
