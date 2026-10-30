import { companyRepository } from "../repositories/CompanyRepository.js";
import { CompanyRecord, CompanyRatingRecord } from "../models/types.js";

export class CompanyService {
  async getAllCompanies(): Promise<CompanyRecord[]> {
    return await companyRepository.getAll();
  }

  async getTopCompanies(minRating = 0, limit = 50): Promise<CompanyRecord[]> {
    return await companyRepository.getTopCompanies(minRating, limit);
  }

  async getRatings(companyName?: string): Promise<CompanyRatingRecord[]> {
    return await companyRepository.getRatings(companyName);
  }

  async addRating(data: any): Promise<CompanyRatingRecord> {
    const userSession = {
      userId: data.userId || "anon_user",
      name: data.userName || "Anonymous Reviewer",
    };
    const res = await this.submitRating(data, userSession);
    return res.rating;
  }

  async submitRating(
    data: Partial<CompanyRatingRecord> & { companyId?: string },
    userSession: { userId: string; name: string }
  ): Promise<{ rating: CompanyRatingRecord; company?: CompanyRecord }> {
    const compName = data.companyName || data.companyId || "Company";

    const ratingVal = Number(data.rating) || 5;

    const newRating: CompanyRatingRecord = {
      id: data.id || `rate-${Date.now()}`,
      companyId: data.companyId,
      companyName: compName,
      userId: userSession.userId,
      userName: data.userName || userSession.name || "Verified Reviewer",
      userRole: data.userRole || "Team Member",
      userAvatar: data.userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      rating: ratingVal,
      cultureRating: Number(data.cultureRating) || ratingVal,
      workLifeRating: Number(data.workLifeRating) || ratingVal,
      growthRating: Number(data.growthRating) || ratingVal,
      compensationRating: Number(data.compensationRating) || ratingVal,
      reviewTitle: data.reviewTitle || `Experience with ${compName}`,
      reviewText: data.reviewText || "Strong technical culture with high engineering standards.",
      pros: data.pros || "Great work environment and skilled peers",
      cons: data.cons || "Fast-paced deliverables",
      recommendToFriend: data.recommendToFriend !== undefined ? Boolean(data.recommendToFriend) : true,
      createdAt: new Date().toISOString(),
    };

    return await companyRepository.saveRating(newRating);
  }
}

export const companyService = new CompanyService();
