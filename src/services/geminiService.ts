/**
 * Generates text using the Gemini AI model via Vercel serverless function
 * @param prompt The prompt to send to the AI
 * @returns The generated text response
 */
export async function generateText(prompt: string): Promise<string> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  try {
    // Call the Vercel serverless function
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        prompt,
        contextType: null,
      }),
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate text");
    }

    // Parse the response
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Generation Error:", error);
    const errorMessage =
      error.message || "Failed to generate text. Please try again.";
    throw new Error(errorMessage);
  }
}

/**
 * Generates context-aware text using user's habit data
 * @param prompt The prompt to send to the AI
 * @param userId The user ID to fetch context for
 * @returns The generated text response
 */
export async function generateContextAwareText(
  prompt: string,
  userId?: string,
): Promise<string> {
  try {
    // Call the Vercel serverless function with context type
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer user-token", // Replace with actual auth token if needed
      },
      body: JSON.stringify({
        prompt,
        contextType: "habit",
        userId, // Optional: pass this if you implement user-specific context
      }),
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "Failed to generate context-aware text",
      );
    }

    // Parse the response
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Context Error:", error);
    return generateText(`${prompt}\n(Unable to access habit data)`);
  }
}

// Similar implementations for other functions...
