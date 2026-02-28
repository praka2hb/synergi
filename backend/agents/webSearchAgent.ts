import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, tool, stepCountIs, zodSchema } from "ai";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
const MODEL = "openrouter/free";
import { tavily } from "@tavily/core";
import { z } from "zod";

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export const webSearchAgent = async (
  userMessage: string,
  messageHistory: Array<{ role: string; content: string }> = []
) => {
  // Build messages array: include history + latest user message
  const messages = [
    ...messageHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  return streamText({
    model: openrouter(MODEL),
    system: `You are Synergi's Web Search Agent — a specialized assistant within the Synergi Multi-Agent system.

Your capabilities:
- Search the web for current, real-time information using the search tool
- Synthesize information from multiple sources into clear, accurate answers
- Always cite your sources with URLs so users can verify

Guidelines:
- Use the search tool for any real-time or current information queries
- You may call the tool multiple times to gather comprehensive information
- Summarize findings clearly and concisely
- Format responses with markdown for readability
- If results are insufficient, say so honestly`,
    messages,
    tools: {
      search: tool({
        description:
          "Search the web for current information on any topic. Use this when the user needs up-to-date or real-time data.",
        inputSchema: zodSchema(
          z.object({
            query: z
              .string()
              .describe("The search query to find relevant information"),
          })
        ),
        execute: async ({ query }: { query: string }) => {
          const results = await tavilyClient.search(query, {
            maxResults: 5,
          });
          return results.results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
          }));
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });
};
