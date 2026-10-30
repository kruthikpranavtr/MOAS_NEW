import { IUserRepository } from "./IRepositories.js";
import { UserRecord, ResumeItem } from "../models/types.js";
import {
  getUsers,
  getUser,
  saveUser,
  updateUserPhoto,
  getUserResumes,
  saveResume,
} from "../db.js";

// In-memory fallback list to maintain zero-latency caching and seamless parity with existing records
const memoryRegistry: UserRecord[] = [];

export class UserRepository implements IUserRepository {
  async getAll(): Promise<UserRecord[]> {
    const dbUsers = (await getUsers()) as UserRecord[];
    const dbIds = new Set(dbUsers.map((u) => u.id));
    const memoryOnly = memoryRegistry.filter((u) => !dbIds.has(u.id));
    return [...dbUsers, ...memoryOnly];
  }

  async getByIdOrEmail(idOrEmail: string): Promise<UserRecord | null> {
    const clean = idOrEmail.trim().toLowerCase();
    const dbUser = (await getUser(idOrEmail)) as UserRecord | null;
    if (dbUser) return dbUser;

    const memUser = memoryRegistry.find(
      (u) =>
        u.id.toLowerCase() === clean ||
        (u.username && u.username.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean) ||
        (u.name && u.name.toLowerCase() === clean)
    );
    return memUser || null;
  }

  async save(user: UserRecord): Promise<UserRecord> {
    const idx = memoryRegistry.findIndex(
      (u) => u.id.toLowerCase() === user.id.toLowerCase() || (u.email && u.email.toLowerCase() === user.email.toLowerCase())
    );
    if (idx !== -1) {
      memoryRegistry[idx] = { ...memoryRegistry[idx], ...user };
    } else {
      memoryRegistry.unshift(user);
    }

    return (await saveUser(user as any)) as UserRecord;
  }

  async updatePhoto(userId: string, avatarUrl: string): Promise<UserRecord | null> {
    const user = await this.getByIdOrEmail(userId);
    if (user) {
      user.avatarUrl = avatarUrl;
      await this.save(user);
      await updateUserPhoto(userId, avatarUrl);
      return user;
    }
    return null;
  }

  async getResumes(userId: string): Promise<ResumeItem[]> {
    const user = await this.getByIdOrEmail(userId);
    if (user && user.resumes && user.resumes.length > 0) {
      return user.resumes;
    }
    const dbResumes = await getUserResumes(userId);
    return dbResumes as ResumeItem[];
  }

  async saveResume(resume: ResumeItem): Promise<ResumeItem> {
    await saveResume(resume as any);
    return resume;
  }
}

export const userRepository = new UserRepository();
