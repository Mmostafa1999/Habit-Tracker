import { getDay } from "date-fns";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Habit } from "../types";

// Function to fetch all habits for a user
export const fetchAllHabits = async (userId: string): Promise<Habit[]> => {
  try {
    const habitsQuery = query(
      collection(db, "users", userId, "habits"),
      orderBy("order", "asc"),
    );

    const habitsSnapshot = await getDocs(habitsQuery);
    const habitsList: Habit[] = [];

    habitsSnapshot.forEach(doc => {
      habitsList.push({ id: doc.id, ...doc.data() } as Habit);
    });

    return habitsList;
  } catch (error) {
    console.error("Error fetching habits:", error);
    throw new Error("Failed to fetch habits");
  }
};

// Helper function to check if a habit should be shown on a specific date
export const shouldShowHabitOnDate = (habit: Habit, date: Date): boolean => {
  // Convert dates to start of day for accurate comparisons (remove time portion)
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  // Ensure startDate is a Date object (it could be a string)
  const startDate = new Date(habit.startDate);
  startDate.setHours(0, 0, 0, 0);

  // Check createdAt timestamp - don't show habits before they were created
  if (habit.createdAt) {
    const creationDate = new Date(habit.createdAt);
    creationDate.setHours(0, 0, 0, 0);

    // Don't show habits on dates before they were created
    if (selectedDate < creationDate) {
      return false;
    }
  }

  // Don't show habits before their start date
  if (selectedDate < startDate) {
    return false;
  }

  const dayOfWeek = getDay(selectedDate); // 0 = Sunday, 1 = Monday, etc.

  // Daily habits show on every day after their start date
  if (habit.frequency === "daily") {
    return true;
  }

  // Weekly habits show only on scheduled days after their effective start date
  if (habit.frequency === "weekly") {
    // If there's no weeklySchedule, make sure we don't crash
    if (
      !habit.weeklySchedule ||
      !Array.isArray(habit.weeklySchedule) ||
      habit.weeklySchedule.length === 0
    ) {
      return true; // Default to showing every day if no schedule
    }

    // Check if the current day of week is in the weekly schedule
    return habit.weeklySchedule.includes(dayOfWeek);
  }

  // Monthly habits show on the same day of month after their start date
  if (habit.frequency === "monthly") {
    return selectedDate.getDate() === startDate.getDate();
  }

  return true;
};

// Function to get habits for today
export const fetchTodayHabits = async (userId: string): Promise<Habit[]> => {
  const allHabits = await fetchAllHabits(userId);
  const today = new Date();
  return allHabits.filter(habit => shouldShowHabitOnDate(habit, today));
};

// Function to check if a habit is completed for a specific date
export const isHabitCompletedForDate = (habit: Habit, date: Date): boolean => {
  const dateStr = date.toISOString().split("T")[0];
  const record = habit.completionHistory?.find(
    r => new Date(r.date).toISOString().split("T")[0] === dateStr,
  );
  return record?.completed || false;
};

// Define a type for the habit data returned by getTodayHabitsForAI
type HabitForAI = {
  name: string;
  description: string;
  completed: boolean;
  streak: number;
  frequency: string;
  weeklySchedule?: number[];
  category?: string;
};

// Function to get formatted habits for today (for AI assistant)
export const getTodayHabitsForAI = async (
  userId: string,
): Promise<HabitForAI[]> => {
  try {
    const todayHabits = await fetchTodayHabits(userId);
    const today = new Date();

    return todayHabits.map(habit => {
      const completed = isHabitCompletedForDate(habit, today);

      return {
        name: habit.name,
        description: habit.description || "",
        completed,
        streak: habit.streak,
        frequency: habit.frequency,
        weeklySchedule: habit.weeklySchedule,
        category: habit.category,
      };
    });
  } catch (error) {
    console.error("Error fetching today habits for AI:", error);
    return [];
  }
};

// Function to update a habit
// const updateHabit = async (
//   userId: string,
//   id: string,
//   data: Partial<Habit>,
// ): Promise<void> => {
//   try {
//     // Logic to update the habit in the database
//     const habitRef = doc(db, "users", userId, "habits", id);
//
//     // Ensure data is compatible with Firestore
//     await updateDoc(habitRef, data); // Use Partial<Habit> directly
//   } catch (error) {
//     console.error("Error updating habit:", error);
//     throw new Error("Failed to update habit");
//   }
// };
