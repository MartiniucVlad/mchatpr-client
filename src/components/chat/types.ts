export interface Message {
  from: string;
  content: string;
  timestamp: string;
  isMine: boolean;
}

export interface ConversationSummary {
  id: string;
  participants: string[];
  type: 'private' | 'group';
  name: string | null;
  created_at: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface SemanticResult {
  content: string;
  sender: string;
  timestamp: string;
  score: number;
}