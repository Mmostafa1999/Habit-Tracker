import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node"; // Changed to '@vercel/node' to resolve module not found error

// Add global type declaration for Node.js environment
declare const process: {
  env: {
    GEMINI_API_KEY?: string;
    [key: string]: string | undefined;
  };
};

// This API key will be securely stored in Vercel environment variables
const apiKey = process.env.GEMINI_API_KEY || ""; // Added fallback to an empty string to avoid 'undefined' issues

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Check for authentication (you can implement more robust auth)
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Extract data from request
    const { prompt, contextType } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid prompt" });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // For context-aware requests, you'd need to fetch data from your database
    // This is simplified for now
    let finalPrompt = prompt;
    if (contextType === "habit") {
      // You can add logic here to fetch context from your database
      finalPrompt = `${prompt}\n\nNote: Context awareness is limited in this implementation.`;
    }

    // Generate content
    const result = await model.generateContent(finalPrompt);
    const text = result.response.text();

    // Return the response
    res.status(200).json({ text });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({
      error: "Failed to generate content",
      message: error.message,
    });
  }
}
