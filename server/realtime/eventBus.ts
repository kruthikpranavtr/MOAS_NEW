import { EventEmitter } from "events";

export interface RealtimeNotificationEvent {
  userId: string;
  notification: any;
}

export interface RealtimeMessageEvent {
  conversationId: string;
  recipientId: string;
  message: any;
}

export interface RealtimeTypingEvent {
  conversationId: string;
  recipientId: string;
  senderId: string;
  isTyping: boolean;
}

export interface RealtimeReadEvent {
  conversationId: string;
  recipientId: string;
  readerId: string;
}

class RealtimeEventBus extends EventEmitter {}

export const realtimeBus = new RealtimeEventBus();
