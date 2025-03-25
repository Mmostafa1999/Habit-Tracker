import { GoogleGenerativeAI } from "@google/generative-ai";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

// Interface for the request data
interface GenerateTextRequest {
  prompt: string;
  contextType?: "habit" | "suggestion" | "quote";
}

// Type for habit data we fetch from Firestore
interface HabitForAI {
  name: string;
  description: string;
  completed: boolean;
  streak: number;
  frequency: string;
  weeklySchedule?: number[];
  category?: string;
}

/**
 * Firebase Cloud Function that generates AI content using Gemini API
 * Securely handles API keys and implements proper authentication
 */
export const generateAIContent = functions.https.onCall(
  async (data: any, context) => {
    try {
      // Security check: Verify the request is authenticated
      if (!context?.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required to access this function",
        );
      }

      // Security check: Verify App Check token (when enabled)
      // This check is skipped in emulator environment
      const isEmulator = process?.env?.FUNCTIONS_EMULATOR === "true";
      if (!isEmulator && !context?.app) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Request must come from a verified app",
        );
      }

      // Input validation
      if (
        !data.prompt ||
        typeof data.prompt !== "string" ||
        data.prompt.length > 1000
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid prompt format or length",
        );
      }

      // Get the user ID from the authenticated context
      const userId = context.auth.uid;

      // Process the AI request
      const result = await handleAIGeneration(
        {
          prompt: data.prompt,
          contextType: data.contextType,
        },
        userId,
      );

      return { text: result };
    } catch (error) {
      console.error("Gemini API Error:", error);

      // Convert regular errors to HttpsError
      if (!(error instanceof functions.https.HttpsError)) {
        throw new functions.https.HttpsError(
          "internal",
          "AI service unavailable. Please try again later",
        );
      }
      throw error;
    }
  },
);

/**
 * Handles the AI content generation with context if needed
 */
async function handleAIGeneration(
  data: GenerateTextRequest,
  userId: string,
): Promise<string> {
  // Get API key from Firebase config
  const apiKey = functions.config().gemini?.api_key;

  if (!apiKey) {
    console.error("Gemini API key not configured");
    throw new functions.https.HttpsError(
      "failed-precondition",
      "AI service configuration error",
    );
  }

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  // Prepare the prompt with context if needed
  let finalPrompt = data.prompt;

  if (data.contextType === "habit") {
    const habits = await getHabitsContext(userId);
    finalPrompt = `${data.prompt}\n\nUser Habits Context:\n${habits}`;
  }

  try {
    const result = await model.generateContent(finalPrompt);
    return result.response.text();
  } catch (apiError) {
    console.error("Gemini API Generation Error:", apiError);
    throw new functions.https.HttpsError(
      "aborted",
      "Failed to generate content. Please try again",
    );
  }
}

/**
 * Fetches habit data for the provided user ID and formats it for AI context
 */
async function getHabitsContext(userId: string): Promise<string> {
  try {
    // Get Firestore reference using Admin SDK
    const db = admin.firestore();

    // Fetch today's habits
    const habitsRef = db.collection(`users/${userId}/habits`);
    const habitsSnapshot = await habitsRef.get();

    if (habitsSnapshot.empty) {
      return "No habits found.";
    }

    // Process habits
    const habits: HabitForAI[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    habitsSnapshot.forEach(doc => {
      const habit = doc.data() as any;

      // Basic validation
      if (habit && habit.name) {
        // Check if habit should be shown today (simplified for this context)
        const shouldShow = shouldShowHabitOnDate(habit, today);

        if (shouldShow) {
          habits.push({
            name: habit.name,
            description: habit.description || "",
            completed: isHabitCompletedForDate(habit, today),
            streak: habit.streak || 0,
            frequency: habit.frequency || "daily",
            weeklySchedule: habit.weeklySchedule,
            category: habit.category || "General",
          });
        }
      }
    });

    // Format the habits into a string for the AI
    if (habits.length === 0) {
      return "No habits scheduled for today.";
    }

    let contextString = "Today's habits:\n";
    habits.forEach(habit => {
      contextString += `- ${habit.name} (${habit.completed ? "Completed" : "Not completed"})\n`;
      if (habit.description)
        contextString += `  Description: ${habit.description}\n`;
      contextString += `  Streak: ${habit.streak} days\n`;
      contextString += `  Category: ${habit.category}\n`;
    });

    return contextString;
  } catch (error) {
    console.error("Error fetching habits for AI context:", error);
    return "Unable to fetch habit data.";
  }
}

/**
 * Helper function to check if a habit should be shown on a specific date
 */
function shouldShowHabitOnDate(habit: any, date: Date): boolean {
  // Basic frequency check
  if (habit.frequency === "daily") return true;

  // Weekly habit check
  if (habit.frequency === "weekly" && habit.weeklySchedule) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return habit.weeklySchedule.includes(dayOfWeek);
  }

  // Monthly habit check (simplified)
  if (habit.frequency === "monthly") {
    const startDate = new Date(habit.startDate);
    return date.getDate() === startDate.getDate();
  }

  return true;
}

/**
 * Helper function to check if a habit is completed for a specific date
 */
function isHabitCompletedForDate(habit: any, date: Date): boolean {
  if (!habit.completionHistory || !Array.isArray(habit.completionHistory)) {
    return false;
  }

  const dateStr = date.toISOString().split("T")[0];

  const record = habit.completionHistory.find(
    (r: any) => new Date(r.date).toISOString().split("T")[0] === dateStr,
  );

  return record?.completed || false;
}
