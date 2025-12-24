import { GoogleGenAI, GenerateContentResponse } from '@google/genai'; // Import GenerateContentResponse for streaming
import { RepoFile } from '../types'; // Import RepoFile type

/**
 * Recursively builds a textual representation of the file tree.
 * @param files The array of RepoFile objects (can be children of a directory).
 * @param indent The current indentation string for formatting.
 * @returns A string representing the file tree.
 */
function buildFileTreeString(files: RepoFile[], indent: string = ''): string {
  let tree = '';
  // Sort directories first, then files, both alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'dir' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });

  sortedFiles.forEach(file => {
    tree += `${indent}${file.type === 'dir' ? '📁' : '📄'} ${file.name}\n`;
    if (file.type === 'dir' && file.children && file.children.length > 0) {
      tree += buildFileTreeString(file.children, indent + '  ');
    }
  });
  return tree;
}


/**
 * Constructs a detailed prompt for the Gemini AI based on the provided code context and user query.
 * @param repoFiles The complete file tree of the repository.
 * @param selectedFilePath The path of the currently selected file.
 * @param currentFileContent The content of the currently selected file.
 * @param userQuery The user's specific question or request.
 * @returns The complete prompt string.
 */
function buildGeminiPrompt(
  repoFiles: RepoFile[],
  selectedFilePath: string | null,
  currentFileContent: string | null,
  userQuery: string
): string {
  let fileTreeSection = '';
  if (repoFiles && repoFiles.length > 0) {
    fileTreeSection = `
---
**GitHub Repository File Structure:**

\`\`\`
${buildFileTreeString(repoFiles)}
\`\`\`

---
`;
  }

  const selectedFileContentSection = currentFileContent && selectedFilePath
    ? `
---
**Currently Selected File: \`${selectedFilePath}\` Content:**

\`\`\`
${currentFileContent}
\`\`\`

---
`
    : '';

  return `You are an expert React frontend engineer and AI assistant. Your task is to analyze user-provided code from a GitHub repository, identify potential errors, suggest improvements, propose design enhancements, and resolve problems. You will provide your analysis and suggestions based on the provided code, the repository's overall structure, and the user's specific questions.

${fileTreeSection}
${selectedFileContentSection}
---
**User's Question:**

${userQuery}

---
**Instructions for your response:**
1.  **Your analysis should consider the full repository structure provided in the 'GitHub Repository File Structure' section, along with the 'Currently Selected File' content if present.**
2.  **Do NOT make any changes to the files.** Your output should be purely textual analysis, suggestions, or solutions.
3.  Format your response clearly, using Markdown for code blocks, bullet points, and headings.
4.  Be thorough and actionable. If you identify a problem, explain why it's a problem and suggest concrete ways to fix it or improve it.
5.  If the user asks for design suggestions, describe them verbally.
6.  The AI will generate straight away a message so the user can copy and paste it to AI studio chat.
`;
}

/**
 * Sends a code analysis request to the Gemini AI model and processes the response.
 * @param repoFiles The complete file tree of the repository.
 * @param selectedFilePath The path of the currently selected file.
 * @param currentFileContent The content of the currently selected file.
 * @param userQuery The user's question about the code.
 * @returns An AsyncIterable of the AI's generated response text chunks.
 * @throws Error if the API key is missing or the Gemini API call fails.
 */
export async function* analyzeCodeWithGemini(
  repoFiles: RepoFile[],
  selectedFilePath: string | null,
  currentFileContent: string | null,
  userQuery: string
): AsyncIterable<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = buildGeminiPrompt(repoFiles, selectedFilePath, currentFileContent, userQuery);

  try {
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview', // Changed model to 'gemini-3-flash-preview' as per guidelines
      contents: { parts: [{ text: prompt }] },
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of streamResponse) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error: any) {
    console.error('Gemini API error during streaming:', error);
    // Refined error message as per guidelines
    if (error.message.includes("Requested entity was not found.") || error.message.includes("API key not valid")) {
      throw new Error("API Key selection failed or is invalid. Please ensure you have selected a valid paid API key from a Google Cloud Project.");
    }
    throw new Error(`Failed to get response from AI: ${error.message || 'Unknown error'}`);
  }
}