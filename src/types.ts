export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  category?: string;
  completed: boolean;
  streak: number;
  startDate: Date | string;
  createdAt?: Date | string; // When the habit was created
  lastCompletedDate?: Date | string;
  completionHistory?: CompletionRecord[];
  reminderEnabled?: boolean;
  reminderTime?: string;
  order?: number;
  weeklySchedule?: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export interface CompletionRecord {
  date: Date | string;
  completed: boolean;
  journalEntry?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  order?: number;
}

export interface UserPreferences {
  darkMode: boolean;
  reminderEnabled: boolean;
  defaultReminderTime?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date | string;
}
