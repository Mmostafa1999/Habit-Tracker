import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTodayHabitsForAI } from "./habitService";

// Get API key from environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Log information about the API key for debugging
if (!apiKey) {
  console.error(
    "Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.",
  );
} else {
  console.log("Gemini API key loaded successfully");
}

// Initialize the Google Generative AI with the API key
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

interface CustomError extends Error {
  response?: unknown; // Changed from any to unknown
}

// Function to generate text from Gemini AI
export async function generateText(prompt: string): Promise<string> {
  try {
    if (!apiKey) {
      throw new Error(
        "Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.",
      );
    }

    const model = genAI?.getGenerativeModel({ model: "gemini-1.5-pro" });

    if (!model) {
      throw new Error("Failed to initialize Gemini model");
    }

    console.log(
      "Sending prompt to Gemini API:",
      prompt.substring(0, 50) + "...",
    );

    // Call the Gemini model to generate content using the chat format
    const chat = model.startChat({
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });

    const result = await chat.sendMessage(prompt);
    const text = result.response.text();
    console.log("Received response from Gemini API");
    return text;
  } catch (error) {
    const typedError = error as CustomError; // Assert the type of error
    console.error("Error generating text from Gemini AI:", typedError);
    // Enhanced error reporting
    if (typedError.message) {
      console.error("Error message:", typedError.message);
    }
    if (typedError.response) {
      console.error("API response error:", typedError.response);
    }
    throw new Error(
      `Failed to get response from Gemini: ${typedError.message || "Unknown error"}`,
    );
  }
}

// Function to generate context-aware responses with app data
export async function generateContextAwareText(
  prompt: string,
  userId: string,
): Promise<string> {
  try {
    // Call fetchData to get additional data if needed
    await fetchData(); // Use fetchData here

    // Determine if the prompt is related to habits
    const habitRelatedKeywords = [
      "habit",
      "habits",
      "today",
      "daily",
      "task",
      "tasks",
      "routine",
      "progress",
      "complete",
      "completed",
      "todo",
      "to do",
      "to-do",
      "doing",
      "done",
      "schedule",
      "tracker",
      "tracking",
      "planned",
    ];

    const isHabitRelated = habitRelatedKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword),
    );

    // If not habit related, just use the standard prompt
    if (!isHabitRelated) {
      return generateText(prompt);
    }

    // Get habit data for today
    const todayHabits = await getTodayHabitsForAI(userId);

    // If no habits found, use standard prompt but let user know
    if (todayHabits.length === 0) {
      return generateText(
        `${prompt}\n\nNote: I checked your habit tracker, but you don't have any habits scheduled for today.`,
      );
    }

    // Format today's habits into a clear structure for the AI
    const completedHabits = todayHabits.filter(habit => habit.completed);
    const incompleteHabits = todayHabits.filter(habit => !habit.completed);

    // Create context-aware prompt
    const enhancedPrompt = `
${prompt}

User's Habit Tracker Data for Today:
Total habits for today: ${todayHabits.length}
Completed: ${completedHabits.length}
Incomplete: ${incompleteHabits.length}

COMPLETED HABITS:
${
  completedHabits.length === 0
    ? "None yet"
    : completedHabits
        .map(
          habit =>
            `- ${habit.name}${habit.description ? `: ${habit.description}` : ""} (${habit.streak} day streak)`,
        )
        .join("\n")
}

HABITS TO COMPLETE:
${
  incompleteHabits.length === 0
    ? "All habits completed!"
    : incompleteHabits
        .map(
          habit =>
            `- ${habit.name}${habit.description ? `: ${habit.description}` : ""} (${habit.streak} day streak)`,
        )
        .join("\n")
}

Please provide a helpful, personalized response based on this data. Reference specific habits by name when relevant.
`;

    return generateText(enhancedPrompt);
  } catch (error) {
    const typedError = error as CustomError; // Assert the type of error
    console.error("Error generating context-aware response:", typedError);
    // Fall back to regular response
    return generateText(
      `${prompt}\n\nNote: I tried to check your habit data but encountered a technical issue.`,
    );
  }
}

// Function to generate habit suggestions
export async function generateHabitSuggestions(
  userContext: string,
): Promise<string> {
  const prompt = `As a habit coach, provide 3 personalized habit suggestions for someone who ${userContext}. 
  Format your response with bullet points. Keep it concise and actionable.`;

  return generateText(prompt);
}

// Function to generate motivational quotes
export async function generateMotivationalQuote(): Promise<string> {
  const prompt = `Generate a short, inspiring motivational quote about habit building and personal growth. 
  Keep it under 150 characters.`;

  return generateText(prompt);
}

// Specify a type instead of using 'any'
const fetchData = async (): Promise<YourExpectedType> => {
  // Implement the function logic and return a value of YourExpectedType
  return {
    // ... populate with actual properties
  } as YourExpectedType; // Ensure to return a value
};

interface YourExpectedType {
  // Define the properties of your expected type here
  // Example properties:
  id: number;
  name: string;
}
