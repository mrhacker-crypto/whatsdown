export interface User {
  code: string; // 5-character unique code, e.g., "7B8X2"
  name: string;
  password?: string;
  createdAt: any;
  lastSeen: any;
  isOnline: boolean;
  typingInChat: string | null; // ID of active conversation they are typing in
}

export interface Conversation {
  id: string; // Formatted as "CODE1_CODE2" where CODE1 < CODE2
  participants: string[]; // [CODE1, CODE2]
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
    isAudio?: boolean;
  } | null;
  updatedAt: any;
  unreadCounts: { [code: string]: number };
  activeCall?: {
    callerId: string;
    status: 'ringing' | 'connected' | 'ended';
    type: 'audio' | 'video';
    timestamp: any;
  } | null;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
  read: boolean;
  imageUrl?: string | null;
  audioUrl?: string | null; // Base64 audio representation
  audioDuration?: number | null; // Duration of audio in seconds
}
