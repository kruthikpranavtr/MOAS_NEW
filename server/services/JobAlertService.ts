import { IJobAlertRepository, IJobRepository } from "../repositories/IRepositories.js";
import { jobAlertRepository } from "../repositories/JobAlertRepository.js";
import { jobRepository } from "../repositories/JobRepository.js";
import { notificationRepository } from "../repositories/NotificationRepository.js";
import { JobAlertRecord } from "../models/types.js";
import { logger } from "../utils/logger.js";

export class JobAlertService {
  constructor(
    private readonly jobAlertRepo: IJobAlertRepository = jobAlertRepository,
    private readonly jobRepo: IJobRepository = jobRepository
  ) {}

  async getAlerts(userId: string): Promise<JobAlertRecord[]> {
    if (!userId) return [];
    return await this.jobAlertRepo.getByUser(userId);
  }

  async getAlertById(
    id: string,
    caller?: { userId: string; role: string }
  ): Promise<JobAlertRecord | null> {
    if (!id) return null;
    const alert = await this.jobAlertRepo.getById(id);
    if (!alert) return null;

    if (caller && caller.role?.toLowerCase() !== "admin") {
      if (alert.userId !== caller.userId) {
        throw new Error("Forbidden: You can only view your own job alerts.");
      }
    }

    return alert;
  }

  async createAlert(
    alertData: Partial<JobAlertRecord>,
    caller?: { userId: string; role: string }
  ): Promise<JobAlertRecord> {
    const userId = caller?.userId || alertData.userId;
    if (!userId) {
      throw new Error("User ID is required to create a job alert.");
    }

    if (!alertData.query && !alertData.title && !alertData.keyword && !alertData.role && !alertData.category) {
      throw new Error("At least one search criterion (title, keyword, role, or category) is required.");
    }

    const newAlert: JobAlertRecord = {
      id: alertData.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: alertData.title || alertData.role || alertData.keyword || alertData.query || "Job Alert",
      query: alertData.query || alertData.keyword || alertData.title || "",
      keyword: alertData.keyword || alertData.query || alertData.title || undefined,
      role: alertData.role || undefined,
      category: alertData.category || undefined,
      location: alertData.location || "Anywhere",
      workMode: alertData.workMode || undefined,
      minSalary: alertData.minSalary !== undefined ? alertData.minSalary : undefined,
      experience: alertData.experience || undefined,
      skills: alertData.skills || [],
      frequency: (alertData.frequency as any) || "Weekly",
      channel: alertData.channel || "in_app",
      active: alertData.active !== undefined ? alertData.active : true,
      createdAt: alertData.createdAt || new Date().toISOString(),
    };

    return await this.jobAlertRepo.save(newAlert);
  }

  async updateAlert(
    id: string,
    updates: Partial<JobAlertRecord>,
    caller?: { userId: string; role: string }
  ): Promise<JobAlertRecord | null> {
    if (!id) throw new Error("Alert ID is required.");

    const existing = await this.jobAlertRepo.getById(id);
    if (!existing) {
      throw new Error(`Job alert with ID "${id}" not found.`);
    }

    if (caller && caller.role?.toLowerCase() !== "admin") {
      if (existing.userId !== caller.userId) {
        throw new Error("Forbidden: You can only update your own job alerts.");
      }
    }

    return await this.jobAlertRepo.update(id, updates);
  }

  async toggleAlert(
    id: string,
    caller?: { userId: string; role: string }
  ): Promise<JobAlertRecord | null> {
    if (!id) throw new Error("Alert ID is required.");

    const existing = await this.jobAlertRepo.getById(id);
    if (!existing) {
      throw new Error(`Job alert with ID "${id}" not found.`);
    }

    if (caller && caller.role?.toLowerCase() !== "admin") {
      if (existing.userId !== caller.userId) {
        throw new Error("Forbidden: You can only modify your own job alerts.");
      }
    }

    return await this.jobAlertRepo.update(id, { active: !existing.active });
  }

  async deleteAlert(id: string, caller?: { userId: string; role: string }): Promise<boolean> {
    if (!id) throw new Error("Alert ID is required.");

    const existing = await this.jobAlertRepo.getById(id);
    if (existing && caller && caller.role?.toLowerCase() !== "admin") {
      if (existing.userId !== caller.userId) {
        throw new Error("Forbidden: You can only delete your own job alerts.");
      }
    }

    return await this.jobAlertRepo.delete(id);
  }

  /**
   * Process all active job alerts against PostgreSQL job inventory.
   * Matches published jobs and emits in-app notifications without duplicate alerts.
   */
  async processJobAlerts(): Promise<{
    processedAlerts: number;
    matchesFound: number;
    notificationsSent: number;
  }> {
    const activeAlerts = await this.jobAlertRepo.getAllActive();
    let totalMatches = 0;
    let totalNotifications = 0;

    for (const alert of activeAlerts) {
      try {
        // Query matching jobs using Phase 9 search engine
        const searchRes = await this.jobRepo.searchJobs({
          search: alert.keyword || alert.query || alert.title || alert.role,
          location: alert.location && alert.location.toLowerCase() !== "anywhere" ? alert.location : undefined,
          category: alert.category,
          workMode: alert.workMode,
          salaryMin: alert.minSalary,
          experience: alert.experience,
          status: "published",
          limit: 10,
        });

        const matchingJobs = searchRes.jobs || [];

        for (const job of matchingJobs) {
          // Check if this job was already delivered for this alert
          const alreadyDelivered = await this.jobAlertRepo.hasDelivered(alert.id, job.id);
          if (alreadyDelivered) {
            continue;
          }

          // Record delivery to prevent future duplicates
          await this.jobAlertRepo.recordDelivery(alert.id, alert.userId, job.id, alert.channel || "in_app");
          totalMatches++;

          // Create in-app notification for candidate
          await notificationRepository.create({
            userId: alert.userId,
            type: "job",
            title: `Job Alert Match: ${job.title}`,
            message: `${job.company} posted "${job.title}" in ${job.location || "Remote"} matching your alert criteria.`,
            link: `/jobs?search=${encodeURIComponent(job.title)}`,
            metadata: { alertId: alert.id, jobId: job.id, company: job.company, salary: job.salary },
          });

          totalNotifications++;
        }

        // Update last_processed_at timestamp on alert
        await this.jobAlertRepo.update(alert.id, {
          lastProcessedAt: new Date().toISOString(),
        });
      } catch (alertErr) {
        logger.error(`[JobAlertService] Error processing alert ${alert.id}:`, alertErr);
      }
    }

    logger.info(
      `[JobAlertService] Finished processing alerts. Alerts: ${activeAlerts.length}, Matches: ${totalMatches}, Notifications: ${totalNotifications}`
    );

    return {
      processedAlerts: activeAlerts.length,
      matchesFound: totalMatches,
      notificationsSent: totalNotifications,
    };
  }
}

export const jobAlertService = new JobAlertService();
