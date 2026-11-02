import { messagingRepository } from "../repositories/MessagingRepository.js";
import { notificationRepository } from "../repositories/NotificationRepository.js";
import { ConversationRecord, MessageRecord } from "../models/types.js";
import { realtimeBus } from "../realtime/eventBus.js";
import { query } from "../db/postgresClient.js";
import { logger } from "../utils/logger.js";

export interface CreateConversationInput {
  candidateId: string;
  employerId?: string;
  jobId?: string;
  applicationId?: string;
  companyName?: string;
  companyLogo?: string;
  title?: string;
  initialMessage?: string;
}

export class MessagingService {
  /**
   * Retrieves all conversations for a user with unread counts
   */
  async getConversations(userId: string): Promise<ConversationRecord[]> {
    if (!userId) return [];
    return await messagingRepository.getConversations(userId);
  }

  /**
   * Retrieves a single conversation by ID with access control validation
   */
  async getConversationById(
    conversationId: string,
    caller: { userId: string; role?: string }
  ): Promise<ConversationRecord | null> {
    const conv = await messagingRepository.getConversationById(conversationId);
    if (!conv) return null;

    const callerId = caller.userId;
    const callerRole = (caller.role || "").toLowerCase();
    const isParticipant =
      conv.candidateId === callerId ||
      conv.employerId === callerId ||
      (conv.participantIds && conv.participantIds.includes(callerId)) ||
      callerRole === "admin";

    if (!isParticipant) {
      throw new Error("Forbidden: You are not an authorized participant in this conversation");
    }

    return conv;
  }

  /**
   * Verifies recruitment relationship and creates or retrieves existing conversation
   */
  async createConversation(
    caller: { userId: string; role?: string },
    input: CreateConversationInput
  ): Promise<ConversationRecord> {
    const callerId = caller.userId;
    const callerRole = (caller.role || "").toLowerCase();

    let candidateId = input.candidateId;
    let employerId = input.employerId;

    if (callerRole === "candidate") {
      candidateId = callerId;
    } else if (callerRole === "employer") {
      employerId = callerId;
    }

    if (!candidateId) {
      throw new Error("Candidate ID is required to start a conversation");
    }

    let companyName = input.companyName;
    let companyLogo = input.companyLogo;
    let jobTitle = input.title;
    let finalJobId = input.jobId;
    let finalAppId = input.applicationId;

    // Verify legitimate applicant relationship unless admin
    if (callerRole !== "admin") {
      let relationshipQuery = `
        SELECT 
          a.id as app_id, 
          a.job_id, 
          j.title as job_title, 
          j.company_id,
          c.name as company_name, 
          c.logo_url as company_logo,
          cm.user_id as member_user_id
        FROM moas.applications a
        JOIN moas.jobs j ON a.job_id = j.id
        LEFT JOIN moas.companies c ON j.company_id = c.id
        LEFT JOIN moas.company_members cm ON j.company_id = cm.company_id
        WHERE a.candidate_id = $1
      `;
      const params: any[] = [candidateId];

      if (callerRole === "employer") {
        params.push(callerId);
        relationshipQuery += ` AND cm.user_id = $${params.length}`;
      } else if (callerRole === "candidate" && employerId) {
        params.push(employerId);
        relationshipQuery += ` AND cm.user_id = $${params.length}`;
      }

      if (finalJobId) {
        params.push(finalJobId);
        relationshipQuery += ` AND a.job_id = $${params.length}`;
      }

      const relRes = await query(relationshipQuery, params);

      if (relRes.rows.length === 0) {
        throw new Error(
          "Forbidden: Direct messaging requires an active application relationship between candidate and employer."
        );
      }

      const row = relRes.rows[0];
      finalAppId = finalAppId || row.app_id;
      finalJobId = finalJobId || row.job_id;
      companyName = companyName || row.company_name;
      companyLogo = companyLogo || row.company_logo;
      jobTitle = jobTitle || row.job_title;

      if (!employerId && row.member_user_id) {
        employerId = row.member_user_id;
      }
    }

    if (!employerId) {
      employerId = callerId;
    }

    // Check if conversation already exists
    let existing = await messagingRepository.findConversation(candidateId, employerId, finalJobId);
    if (existing) {
      if (input.initialMessage) {
        await this.sendMessage(existing.id, caller, input.initialMessage);
      }
      return (await messagingRepository.getConversationById(existing.id)) || existing;
    }

    const created = await messagingRepository.createConversation({
      candidateId,
      employerId,
      jobId: finalJobId,
      applicationId: finalAppId,
      participantIds: [candidateId, employerId],
      companyName: companyName || "Company",
      companyLogo,
      title: jobTitle || "Career Opportunity",
    });

    if (input.initialMessage) {
      await this.sendMessage(created.id, caller, input.initialMessage);
    }

    return (await messagingRepository.getConversationById(created.id)) || created;
  }

  /**
   * Retrieves messages for an authorized conversation with pagination support
   */
  async getMessages(
    conversationId: string,
    caller: { userId: string; role?: string },
    limit = 100,
    before?: string
  ): Promise<MessageRecord[]> {
    // Validates that caller is participant
    await this.getConversationById(conversationId, caller);
    return await messagingRepository.getMessages(conversationId, limit, before);
  }

  /**
   * Sends a message within an authorized conversation and dispatches in real-time
   */
  async sendMessage(
    conversationId: string,
    caller: { userId: string; role?: string },
    text: string
  ): Promise<MessageRecord> {
    if (!text || !text.trim()) {
      throw new Error("Message text cannot be empty");
    }

    const conv = await this.getConversationById(conversationId, caller);
    if (!conv) {
      throw new Error("Conversation not found");
    }

    const callerId = caller.userId;
    const recipientId =
      conv.candidateId === callerId
        ? conv.employerId || conv.participantIds?.find((id) => id !== callerId)
        : conv.candidateId;

    if (!recipientId) {
      throw new Error("Recipient could not be determined for conversation");
    }

    const senderRole = (caller.role || "").toLowerCase() === "employer" ? "employer" : "candidate";

    const saved = await messagingRepository.saveMessage({
      conversationId,
      senderId: callerId,
      recipientId,
      senderRole,
      content: text.trim(),
      deliveryStatus: "delivered",
    });

    // Real-time dispatch via EventBus to WebSocket server
    try {
      realtimeBus.emit("message:new", {
        conversationId,
        recipientId,
        message: saved,
      });

      // Also create an in-app notification for recipient
      await notificationRepository.create({
        userId: recipientId,
        type: "system",
        title: "New Message",
        message: `New message from ${senderRole === "employer" ? conv.companyName || "Employer" : "Candidate"}: "${text.trim().substring(0, 60)}"`,
        channel: "in_app",
        metadata: {
          conversationId,
          jobId: conv.jobId,
        },
      });

      realtimeBus.emit("notification:new", {
        userId: recipientId,
        notification: {
          title: "New Message",
          message: `New message from ${senderRole === "employer" ? conv.companyName || "Employer" : "Candidate"}`,
        },
      });
    } catch (err) {
      logger.warn("[MessagingService] Real-time notification/bus error:", err);
    }

    return saved;
  }

  /**
   * Marks all incoming messages in a conversation as read by the caller
   */
  async markAsRead(
    conversationId: string,
    caller: { userId: string; role?: string }
  ): Promise<{ count: number }> {
    const conv = await this.getConversationById(conversationId, caller);
    if (!conv) {
      throw new Error("Conversation not found");
    }

    const count = await messagingRepository.markMessagesAsRead(conversationId, caller.userId);

    const recipientId =
      conv.candidateId === caller.userId
        ? conv.employerId || conv.participantIds?.find((id) => id !== caller.userId)
        : conv.candidateId;

    if (recipientId) {
      realtimeBus.emit("message:read", {
        conversationId,
        recipientId,
        readerId: caller.userId,
      });
    }

    return { count };
  }

  /**
   * Broadcasts typing status to the other conversation participant
   */
  async setTyping(
    conversationId: string,
    caller: { userId: string; role?: string },
    isTyping: boolean
  ): Promise<boolean> {
    const conv = await this.getConversationById(conversationId, caller);
    if (!conv) return false;

    const recipientId =
      conv.candidateId === caller.userId
        ? conv.employerId || conv.participantIds?.find((id) => id !== caller.userId)
        : conv.candidateId;

    if (recipientId) {
      realtimeBus.emit("message:typing", {
        conversationId,
        recipientId,
        senderId: caller.userId,
        isTyping,
      });
      return true;
    }

    return false;
  }

  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    return await messagingRepository.getUnreadCount(userId);
  }
}

export const messagingService = new MessagingService();
