# Context-Aware AI Assistant

This document explains how the context-aware AI assistant feature works in the Habit Tracker application.

## Overview

The context-aware AI feature enhances the Gemini AI assistant by providing it with real-time data from your habit tracker. This allows the AI to give personalized responses based on your actual habits, progress, and goals.

## How It Works

When you ask the AI a question related to your habits (e.g., "What habits do I need to complete today?"), the system:

1. Detects that your question is habit-related using keyword matching
2. Fetches your current habit data from the database
3. Enhances the AI prompt with this data
4. Sends the enhanced prompt to the Gemini AI
5. Returns a personalized response that references your actual habits

## Architecture

The feature consists of three main components:

### 1. Habit Service

`habitService.ts` provides functions to fetch and format habit data:

- `fetchAllHabits`: Gets all habits for a user
- `fetchTodayHabits`: Filters habits for today based on frequency and schedule
- `isHabitCompletedForDate`: Checks if a habit is completed for a specific date
- `getTodayHabitsForAI`: Formats habit data in a way that's optimal for the AI

### 2. Enhanced Gemini Service

`geminiService.ts` now includes a context-aware generation function:

- `generateContextAwareText`: Detects habit-related queries, fetches relevant data, and enhances the prompt

### 3. Updated Chat Interface

`GeminiChat.tsx` has been enhanced with:

- A toggle switch to enable/disable the context-awareness feature
- Updated message handling to use context-aware responses
- Improved welcome message to inform users of the feature

## Example Usage

Here are some examples of questions you can ask:

- "What habits do I need to complete today?"
- "How am I doing with my habits?"
- "Which habits have I already completed?"
- "What's my longest streak?"
- "How many habits do I have left to complete today?"

## Privacy Considerations

- Your habit data is only sent to the AI service when you ask a habit-related question
- The data is never stored by the AI service, it's only used to generate the current response
- You can disable context-awareness with the toggle if you prefer not to share this data

## Technical Implementation

The implementation follows best practices for React and Firebase applications:

1. **Separation of concerns**:

   - Data fetching logic is isolated in service files
   - UI components focus on rendering and user interaction

2. **Error handling**:

   - Falls back to standard AI responses if data fetching fails
   - Provides user-friendly error messages

3. **Performance considerations**:
   - Uses lightweight habit representations for AI prompts
   - Only fetches data when needed based on query detection

## Future Improvements

Potential enhancements for future versions:

- More sophisticated query understanding (NLP-based instead of keyword-based)
- Including historical habit data for trend analysis
- Supporting more complex queries about specific habits or categories
- Allowing the AI to suggest habit modifications based on completion patterns
