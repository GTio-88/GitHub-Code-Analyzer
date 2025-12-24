import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types';

/**
 * Constructs a detailed prompt for the Gemini AI based on the provided code context and user query.
 * @param codeContext The code content to be analyzed.
 * @param userQuery The user's specific question or request.
 * @returns The complete prompt string.
 */
function buildGeminiPrompt(codeContext: string | null, userQuery: string): string {
  const codeSection = codeContext
    ? `
---
**GitHub Repository Code Context:**

\`\`\`
${codeContext}
\`\`\`

---
`
    : '';

  return `You are an expert React frontend engineer and AI assistant. Your task is to analyze user-provided code from a GitHub repository, identify potential errors, suggest improvements, propose design enhancements, and resolve problems. You will provide your analysis and suggestions based on the provided code and the user's specific questions.

---
**User's Question:**

${userQuery}

---
${codeSection}
**Instructions for your response:**
1.  **Do NOT make any changes to the files.** Your output should be purely textual analysis, suggestions, or solutions.
2.  Format your response clearly, using Markdown for code blocks, bullet points, and headings.
3.  Be thorough and actionable. If you identify a problem, explain why it's a problem and suggest concrete ways to fix it or improve it.
4.  If the user asks for design suggestions, describe them verbally.
5.  Assume this response will be copied and pasted into another AI Studio chat or used by the user to manually apply changes.
6.  The AI will generate straight away a message so the user can copy and paste it to AI studio chat.
`;
}

/**
 * Sends a code analysis request to the Gemini AI model and processes the response.
 * @param code The code context to send to the AI.
 * @param userQuery The user's question about the code.
 * @returns The AI's generated response text.
 * @throws Error if the API key is missing or the Gemini API call fails.
 */
export async function analyzeCodeWithGemini(code: string | null, userQuery: string): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = buildGeminiPrompt(code, userQuery);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Chosen for complex text tasks
      contents: { parts: [{ text: prompt }] },
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192, // Sufficient tokens for detailed analysis
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
        console.warn("Gemini API returned an empty response text.");
        return "The AI did not return a response. Please try again.";
    }
    return textResponse;
  } catch (error: any) {
    console.error('Gemini API error:', error);
    if (error.message.includes("Requested entity was not found.")) {
      // This is the specific error mentioned for API key issues
      throw new Error("API Key selection failed or is invalid. Please ensure you have selected a valid paid API key for Veo/Gemini 3 models.");
    }
    throw new Error(`Failed to get response from AI: ${error.message || 'Unknown error'}`);
  }
}
