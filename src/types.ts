export interface Interaction {
  id: string;
  userId: string;
  prompt: string;
  audioData?: string;
  audioDurationSeconds?: number;
  reflection: string;
  moodScore: number;
  moodLabel: string;
  actionableTakeaway: string;
  tags: string[];
  createdAt: string; // ISO string
  completedTakeaway?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface MoodStatPoint {
  date: string;
  fullDate: string;
  score: number;
  mood: string;
}

export interface NewEntryInput {
  prompt: string;
  audioBase64?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
}
