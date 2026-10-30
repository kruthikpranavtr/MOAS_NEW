/**
 * Messaging Service
 *
 * MODULE STATUS:
 * [PLANNED & SCAFFOLDED]
 * Currently, the React frontend manages recruiter/candidate conversations via local client-side state.
 * This service implements the modular backend domain logic, conversation retrieval, message dispatch,
 * and read-receipt handling. Full WebSocket bidirectional streaming and persistent relational chat schema
 * are scheduled for Phase 4.
 */

export interface ServerMessage {
  id: string;
  sender: "recruiter" | "user";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

export interface ServerConversation {
  id: string;
  userId: string;
  recruiterId?: string;
  recruiterName: string;
  company: string;
  logo: string;
  role: string;
  jobId: string;
  jobTitle: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  jobDetails?: {
    jobId: string;
    experience: string;
    salary: string;
    jobType: string;
    location: string;
  };
  messages: ServerMessage[];
}

export class MessagingService {
  private conversations: Map<string, ServerConversation> = new Map();

  constructor() {
    // Seed initial mock conversation for testing and previewing
    this.conversations.set("conv-1", {
      id: "conv-1",
      userId: "cand-1",
      recruiterId: "rec-1",
      recruiterName: "Sarah Jenkins",
      company: "Stripe",
      logo: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=128",
      role: "Lead Technical Recruiter",
      jobId: "job-1",
      jobTitle: "Senior Full Stack Engineer",
      unreadCount: 1,
      lastMessage: "Hi Arun, we were really impressed by your ML and full-stack portfolio. Are you open for a quick chat?",
      lastMessageTime: "10:30 AM",
      jobDetails: {
        jobId: "job-1",
        experience: "3-5 years",
        salary: "$165k - $210k",
        jobType: "Full Time",
        location: "San Francisco, CA (Hybrid)",
      },
      messages: [
        {
          id: "msg-1",
          sender: "recruiter",
          text: "Hi Arun, we were really impressed by your ML and full-stack portfolio. Are you open for a quick chat?",
          time: "10:30 AM",
          status: "delivered",
        },
      ],
    });
  }

  async getConversations(userId: string): Promise<ServerConversation[]> {
    return Array.from(this.conversations.values()).filter(
      (c) => !userId || c.userId === userId || c.recruiterId === userId
    );
  }

  async getConversationById(id: string): Promise<ServerConversation | null> {
    return this.conversations.get(id) || null;
  }

  async sendMessage(
    conversationId: string,
    message: { sender: "recruiter" | "user"; text: string }
  ): Promise<ServerMessage> {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      throw new Error("Conversation not found");
    }

    const newMessage: ServerMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender: message.sender,
      text: message.text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    conv.messages.push(newMessage);
    conv.lastMessage = message.text;
    conv.lastMessageTime = newMessage.time;
    if (message.sender === "recruiter") {
      conv.unreadCount += 1;
    }

    return newMessage;
  }

  async markAsRead(conversationId: string): Promise<boolean> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return false;
    conv.unreadCount = 0;
    conv.messages.forEach((m) => {
      m.status = "read";
    });
    return true;
  }
}

export const messagingService = new MessagingService();
