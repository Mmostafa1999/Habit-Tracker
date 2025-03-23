# Gemini AI Integration Guide

This document explains how the Google Gemini AI has been integrated into the Habit Tracker application.

## Overview

The Habit Tracker application now includes AI-powered features using Google's Gemini AI. This integration allows users to:

1. Chat with an AI assistant about habits, productivity, and well-being
2. Receive personalized habit suggestions based on their goals
3. Get motivational content to stay on track with their habits

## Setup Requirements

1. **Google API Key**: You need a Google API key with access to the Gemini API
2. **Environment Variables**: Your API key must be added to the `.env` file as `VITE_GEMINI_API_KEY`

## Components Created

1. **Gemini Service** (`src/services/geminiService.ts`): Handles communication with the Gemini API
2. **GeminiChat Component** (`src/components/GeminiChat.tsx`): A chat interface for users to interact with Gemini AI
3. **HabitSuggestions Component** (`src/components/HabitSuggestions.tsx`): Displays AI-generated habit suggestions
4. **GeminiAIPage** (`src/pages/GeminiAIPage.tsx`): A dedicated page for the AI assistant features

## How to Use

1. Navigate to the "AI Assistant" link in the navbar
2. Use the chat interface to ask questions or get advice about habits
3. The HabitSuggestions component can be placed on any page to show personalized habit recommendations

## Security

- The API key is stored in environment variables and accessed only on the client-side
- For production, consider moving API calls to Firebase Cloud Functions to better protect your API key

## Customization

- Edit prompts in the Gemini service to adjust the AI's responses
- Modify the UI components to match your application's design system
- Add additional specialized functions for different types of AI-generated content

## Troubleshooting

If the AI assistant isn't working:

1. Check that your API key is correctly set in the `.env` file
2. Ensure that your Google Cloud project has the Gemini API enabled
3. Check the browser console for any error messages from the API
4. Verify your API key has sufficient quota and permissions

## Getting a Google API Key

1. Go to the [Google AI Studio](https://makersuite.google.com/)
2. Create or select a project
3. Get an API key from the credentials section
4. Enable the Gemini API for your project
5. Add the API key to your `.env` file as `VITE_GEMINI_API_KEY`
