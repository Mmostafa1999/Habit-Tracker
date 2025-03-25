import * as admin from "firebase-admin";
import { generateAIContent } from "./gemini";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { generateAIContent };
