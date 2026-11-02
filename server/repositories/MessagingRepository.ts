import { IMessagingRepository } from "./IRepositories.js";
import { ConversationRecord, MessageRecord } from "../models/types.js";
import { query, withTransaction } from "../db/postgresClient.js";

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRowToMessage(row: any): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id || undefined,
    senderRole: row.sender_role || undefined,
    content: row.content,
    isRead: row.is_read ?? false,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : undefined,
    deliveryStatus: row.delivery_status || "delivered",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapRowToConversation(row: any, unreadCount = 0): ConversationRecord {
  return {
    id: row.id,
    jobId: row.job_id || undefined,
    applicationId: row.application_id || undefined,
    employerId: row.employer_id || undefined,
    candidateId: row.candidate_id || undefined,
    participantIds: parseJsonArray(row.participant_ids),
    companyName: row.company_name || row.comp_name || "Company",
    companyLogo: row.company_logo || row.comp_logo || undefined,
    candidateName: row.candidate_name || row.cand_name || "Candidate",
    candidateAvatar: row.candidate_avatar || row.cand_avatar || undefined,
    title: row.title || row.job_title || undefined,
    lastMessageText: row.last_message_text || undefined,
    lastMessageTime: row.last_message_time ? new Date(row.last_message_time).toISOString() : undefined,
    unreadCount,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export class MessagingRepository implements IMessagingRepository {
  async getConversations(userId: string): Promise<ConversationRecord[]> {
    const sql = `
      SELECT 
        c.*,
        u_cand.name as cand_name,
        u_cand.avatar_url as cand_avatar,
        u_emp.name as emp_name,
        j.title as job_title,
        COALESCE(
          (SELECT COUNT(*) FROM moas.messages m 
           WHERE m.conversation_id = c.id 
             AND m.recipient_id = $1 
             AND m.is_read = false), 0
        )::int as unread_count
      FROM moas.conversations c
      LEFT JOIN moas.users u_cand ON c.candidate_id = u_cand.id
      LEFT JOIN moas.users u_emp ON c.employer_id = u_emp.id
      LEFT JOIN moas.jobs j ON c.job_id = j.id
      WHERE c.candidate_id = $1 
         OR c.employer_id = $1 
         OR c.participant_ids @> to_jsonb($1::text)
      ORDER BY COALESCE(c.last_message_time, c.updated_at, c.created_at) DESC;
    `;

    const res = await query(sql, [userId]);
    return res.rows.map((row) => mapRowToConversation(row, row.unread_count || 0));
  }

  async getConversationById(id: string): Promise<ConversationRecord | null> {
    const sql = `
      SELECT 
        c.*,
        u_cand.name as cand_name,
        u_cand.avatar_url as cand_avatar,
        u_emp.name as emp_name,
        j.title as job_title
      FROM moas.conversations c
      LEFT JOIN moas.users u_cand ON c.candidate_id = u_cand.id
      LEFT JOIN moas.users u_emp ON c.employer_id = u_emp.id
      LEFT JOIN moas.jobs j ON c.job_id = j.id
      WHERE c.id = $1
      LIMIT 1;
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;

    const conv = mapRowToConversation(res.rows[0]);
    conv.messages = await this.getMessages(id);
    return conv;
  }

  async findConversation(
    candidateId: string,
    employerId: string,
    jobId?: string
  ): Promise<ConversationRecord | null> {
    let sql = `
      SELECT * FROM moas.conversations
      WHERE candidate_id = $1 AND employer_id = $2
    `;
    const params: any[] = [candidateId, employerId];

    if (jobId) {
      params.push(jobId);
      sql += ` AND job_id = $${params.length}`;
    }

    sql += " LIMIT 1;";
    const res = await query(sql, params);
    if (res.rows.length === 0) return null;
    return mapRowToConversation(res.rows[0]);
  }

  async createConversation(
    data: Partial<ConversationRecord> & { participantIds: string[] }
  ): Promise<ConversationRecord> {
    const id = data.id || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const participantsJson = JSON.stringify(data.participantIds || []);

    const res = await query(
      `INSERT INTO moas.conversations (
        id, participant_ids, title, job_id, application_id, employer_id, candidate_id, company_name, company_logo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *;`,
      [
        id,
        participantsJson,
        data.title || null,
        data.jobId || null,
        data.applicationId || null,
        data.employerId || null,
        data.candidateId || null,
        data.companyName || null,
        data.companyLogo || null,
      ]
    );

    return mapRowToConversation(res.rows[0]);
  }

  async getMessages(
    conversationId: string,
    limit = 100,
    beforeTimestamp?: string
  ): Promise<MessageRecord[]> {
    let sql = `
      SELECT * FROM moas.messages
      WHERE conversation_id = $1
    `;
    const params: any[] = [conversationId];

    if (beforeTimestamp) {
      params.push(new Date(beforeTimestamp));
      sql += ` AND created_at < $${params.length}`;
    }

    sql += ` ORDER BY created_at ASC LIMIT $${params.length + 1};`;
    params.push(limit);

    const res = await query(sql, params);
    return res.rows.map(mapRowToMessage);
  }

  async saveMessage(
    message: Partial<MessageRecord> & { conversationId: string; senderId: string; content: string }
  ): Promise<MessageRecord> {
    return await withTransaction(async (client) => {
      const id = message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const res = await client.query(
        `INSERT INTO moas.messages (
          id, conversation_id, sender_id, recipient_id, sender_role, content, is_read, delivery_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *;`,
        [
          id,
          message.conversationId,
          message.senderId,
          message.recipientId || null,
          message.senderRole || null,
          message.content,
          message.isRead ?? false,
          message.deliveryStatus || "delivered",
        ]
      );

      // Update conversation last message snippet and timestamp
      await client.query(
        `UPDATE moas.conversations
         SET last_message_text = $2,
             last_message_time = NOW(),
             updated_at = NOW()
         WHERE id = $1;`,
        [message.conversationId, message.content.substring(0, 200)]
      );

      return mapRowToMessage(res.rows[0]);
    });
  }

  async markMessagesAsRead(conversationId: string, recipientId: string): Promise<number> {
    const res = await query(
      `UPDATE moas.messages
       SET is_read = true, read_at = NOW()
       WHERE conversation_id = $1 AND recipient_id = $2 AND is_read = false;`,
      [conversationId, recipientId]
    );
    return res.rowCount ?? 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await query(
      "SELECT COUNT(*) as count FROM moas.messages WHERE recipient_id = $1 AND is_read = false;",
      [userId]
    );
    return parseInt(res.rows[0]?.count || "0", 10);
  }
}

export const messagingRepository = new MessagingRepository();
