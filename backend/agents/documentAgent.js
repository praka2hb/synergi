const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Document Generator Agent
 *
 * Returns:
 * {
 *   type: "document",
 *   title: string,
 *   content: string
 * }
 */
function buildPrompt(userInput) {
  return `You are a professional report generator.

Generate a clean, structured document.

Format strictly as:

Title:
Abstract:
Introduction:
Problem Statement:
Solution:
Technology Stack:
Implementation:
Conclusion:

User Input:
${userInput}`;
}

function extractTitle(content) {
  if (!content || typeof content !== "string") {
    return "Generated Document";
  }

  const titleMatch = content.match(/Title:\s*(.+)/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  const firstNonEmptyLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstNonEmptyLine || "Generated Document";
}

async function callOpenAI(userInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You generate clean, structured reports exactly in the requested format.",
        },
        {
          role: "user",
          content: buildPrompt(userInput),
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `OpenAI request failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`,
    );
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

export async function generateDocument(userInput) {
  const content = await callOpenAI(userInput);
  const title = extractTitle(content);

  return {
    type: "document",
    title,
    content,
  };
}

export default generateDocument;
