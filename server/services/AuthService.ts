import { userRepository } from "../repositories/UserRepository.js";
import { companyRepository } from "../repositories/CompanyRepository.js";
import { hashPassword, verifyPassword, sanitizeUser, validatePasswordStrength } from "../utils/crypto.js";
import { createSessionRecord, deleteSessionRecord, getSessionRecord } from "../middleware/auth.js";
import { SanitizedUser, UserSession, UserRecord } from "../models/types.js";
import { withTransaction, query } from "../db/postgresClient.js";
import { logger } from "../utils/logger.js";

export interface LoginResult {
  token: string;
  user: SanitizedUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  username?: string;
  phone?: string;
  password: string;
  confirmPassword?: string;
  role?: string;
  companyName?: string;
  companyEmail?: string;
  industry?: string;
  companySize?: string;
  contactPerson?: string;
  companyWebsite?: string;
  resumeName?: string;
  skills?: string[];
  location?: string;
  avatarUrl?: string;
}

export class AuthService {
  async register(data: RegisterInput): Promise<{ user: SanitizedUser; token: string }> {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const username = data.username ? data.username.trim().toLowerCase() : undefined;
    const phone = data.phone?.trim();
    const password = data.password ? String(data.password).trim() : "";
    const confirmPassword = data.confirmPassword ? String(data.confirmPassword).trim() : undefined;
    const rawRole = (data.role || "Candidate").trim();
    const role = rawRole.toLowerCase() === "employer" ? "Employer" : "Candidate";

    // 1. Validate required fields
    if (!name || name.length < 2) {
      throw new Error("Full name must be at least 2 characters long.");
    }
    if (!email || !email.includes("@")) {
      throw new Error("A valid email address is required.");
    }
    if (confirmPassword && password !== confirmPassword) {
      throw new Error("Passwords do not match. Please re-enter your password.");
    }

    // 2. Strong Password Policy
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new Error(strength.error || "Password does not meet complexity requirements.");
    }

    // 3. Prevent duplicate email
    const existingByEmail = await userRepository.getByIdOrEmail(email);
    if (existingByEmail) {
      throw new Error(`An account with email "${email}" is already registered. Please log in.`);
    }

    // 4. Prevent duplicate username
    if (username) {
      if (username.length < 3 || username.length > 30) {
        throw new Error("Username must be between 3 and 30 characters.");
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        throw new Error("Username may only contain letters, numbers, and underscores.");
      }
      const existingByUsername = await userRepository.getByIdOrEmail(username);
      if (existingByUsername && existingByUsername.id !== existingByEmail?.id) {
        throw new Error(`Username "${username}" is already taken. Please choose another username.`);
      }
    }

    // 5. Validate Employer Details
    if (role === "Employer") {
      if (!data.companyName || data.companyName.trim().length < 2) {
        throw new Error("Company name is required for Employer accounts.");
      }
    }

    // 6. Transactional Creation in PostgreSQL
    const permanentId = `MOAS-ID-${Math.floor(10000 + Math.random() * 90000)}`;
    const hashedPassword = hashPassword(password);

    const userToSave: UserRecord = {
      id: permanentId,
      username: username || permanentId.toLowerCase(),
      password: hashedPassword,
      name,
      email,
      phone: phone || "",
      role,
      companyName: role === "Employer" ? data.companyName : undefined,
      companyEmail: role === "Employer" ? data.companyEmail : undefined,
      industry: role === "Employer" ? data.industry : undefined,
      companySize: role === "Employer" ? data.companySize : undefined,
      contactPerson: role === "Employer" ? data.contactPerson : undefined,
      companyWebsite: role === "Employer" ? data.companyWebsite : undefined,
      avatarUrl:
        data.avatarUrl ||
        (role === "Employer"
          ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces"
          : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces"),
      location: data.location || "Bangalore, India",
      skills: data.skills || (role === "Employer" ? [] : ["Machine Learning", "Python", "Data Science"]),
      education: [],
      resumes:
        role === "Candidate" && data.resumeName
          ? [
              {
                id: `res-${Date.now()}`,
                name: data.resumeName,
                size: "240 KB",
                updatedAt: "Just now",
                type: "PDF",
                isPrimary: true,
              },
            ]
          : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedUser = await withTransaction(async (client) => {
      const user = await userRepository.save(userToSave);

      // If employer, ensure company, member, and profile records exist
      if (role === "Employer" && data.companyName) {
        const cleanCompName = data.companyName.trim();
        const existingCompRes = await client.query(
          `SELECT id, owner_user_id FROM moas.companies WHERE LOWER(name) = LOWER($1);`,
          [cleanCompName]
        );

        let compId: string;
        let isOwner = false;

        if (existingCompRes.rows.length === 0) {
          compId = `comp-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          await client.query(
            `INSERT INTO moas.companies (id, name, industry, location, rating, reviews_count, verification_status, owner_user_id)
             VALUES ($1, $2, $3, $4, 0.0, 0, 'pending', $5);`,
            [compId, cleanCompName, data.industry || "Technology", data.location || "Bangalore, India", permanentId]
          );
          isOwner = true;
        } else {
          compId = existingCompRes.rows[0].id;
          if (!existingCompRes.rows[0].owner_user_id) {
            await client.query(`UPDATE moas.companies SET owner_user_id = $1 WHERE id = $2;`, [permanentId, compId]);
            isOwner = true;
          }
        }

        await client.query(
          `INSERT INTO moas.company_members (id, company_id, user_id, role, status, is_verified)
           VALUES ($1, $2, $3, $4, 'accepted', true)
           ON CONFLICT (company_id, user_id) DO UPDATE SET is_verified = true;`,
          [`mem-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`, compId, permanentId, isOwner ? "owner" : "member"]
        );

        await client.query(
          `INSERT INTO moas.employer_profiles (id, user_id, business_email, designation, location)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO NOTHING;`,
          [`emp-prof-${permanentId}`, permanentId, email, data.contactPerson || "Hiring Manager", data.location || "Bangalore, India"]
        );
      }

      return user;
    });

    // Create session in PostgreSQL
    const token = await createSessionRecord(savedUser);
    logger.info(`[Auth] User registered successfully: ${savedUser.id} (${savedUser.email}, role: ${savedUser.role})`);

    return {
      user: sanitizeUser(savedUser)!,
      token,
    };
  }

  async login(
    identifier: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; code?: string; error?: string; result?: LoginResult }> {
    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const user = await userRepository.getByIdOrEmail(cleanId);
    if (!user) {
      return {
        success: false,
        code: "USER_NOT_FOUND",
        error: `No account found for "${identifier}". Please check your credentials or create a new account.`,
      };
    }

    const isValid = verifyPassword(cleanPassword, user.password);
    if (!isValid) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        error: "Incorrect password. Please verify your password and try again.",
      };
    }

    // Auto-upgrade legacy plaintext password to scrypt hash on successful login
    if (user.password && !user.password.startsWith("scrypt:")) {
      user.password = hashPassword(cleanPassword);
      await userRepository.save(user).catch(console.warn);
    }

    const token = await createSessionRecord(user, rememberMe);
    const sanitized = sanitizeUser(user);

    return {
      success: true,
      result: {
        token,
        user: sanitized!,
      },
    };
  }

  async logout(token: string): Promise<boolean> {
    return await deleteSessionRecord(token);
  }

  async getSession(token: string): Promise<UserSession | null> {
    return await getSessionRecord(token);
  }

  async getMe(userId: string): Promise<SanitizedUser | null> {
    const user = await userRepository.getByIdOrEmail(userId);
    return sanitizeUser(user);
  }
}

export const authService = new AuthService();
