// api/gemini/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Get API key from Vercel environment variables
    const apiKey = process.env.GEMINI_API_KEY!;
    const { prompt, userId } = await req.json();

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Add your existing AI logic here
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 500 }
    );
  }
}