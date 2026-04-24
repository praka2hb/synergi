import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";
import {
  clearOpenAIAuthFailure,
  guardOpenAIError,
  hasOpenAIAuthFailure,
  getOpenAIUnavailableMessage,
} from "../lib/openaiGuard";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-5";

function getGracefulFallbackResponse(
  messages: Array<{ role: string; content: string }>,
): string {
  const latestUserMessage =
    [...messages]
      .reverse()
      .find((m) => m.role === "user")
      ?.content?.trim() || "your request";

  return `${getOpenAIUnavailableMessage()}\n\nYour last request was: "${latestUserMessage}"`;
}

export class GeminiService {
  private readonly systemContext = `You are Synergi, a Multi-Agent AI assistant designed to help users with various tasks through intelligent collaboration. You embody the synergy of multiple AI capabilities working together seamlessly.

    Key characteristics:
    - You are collaborative, intelligent, and adaptive
    - You can break down complex problems into manageable components
    - You provide clear, helpful, and contextually relevant responses
    - You maintain continuity throughout conversations
    - You are designed to work as a unified system of specialized agents

    Always identify yourself as Synergi when introducing yourself, and maintain this identity throughout the conversation.`;

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (hasOpenAIAuthFailure()) {
      return getGracefulFallbackResponse(messages);
    }

    try {
      const { text } = await generateText({
        model: openai(MODEL),
        system: this.systemContext,
        messages: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      clearOpenAIAuthFailure();
      return text;
    } catch (error) {
      console.error("Error generating response:", error);

      if (guardOpenAIError(error)) {
        return getGracefulFallbackResponse(messages);
      }

      throw new Error("Failed to generate AI response");
    }
  }

  async generateResponseStream(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    systemPromptOverride?: string,
  ): Promise<string> {
    if (hasOpenAIAuthFailure()) {
      const fallback = getGracefulFallbackResponse(messages);
      onChunk(fallback);
      return fallback;
    }

    try {
      const result = streamText({
        model: openai(MODEL),
        system: systemPromptOverride ?? this.systemContext,
        messages: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      let fullResponse = "";
      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        onChunk(chunk);
      }

      clearOpenAIAuthFailure();
      return fullResponse;
    } catch (error) {
      console.error("Error generating streaming response:", error);

      if (guardOpenAIError(error)) {
        const fallback = getGracefulFallbackResponse(messages);
        onChunk(fallback);
        return fallback;
      }

      throw new Error("Failed to generate AI response");
    }
  }

  generateConversationTitle(
    messages: Array<{ role: string; content: string }>,
  ): string {
    const firstUserMessage = messages
      .find((m) => m.role === "user")
      ?.content?.trim();
    if (!firstUserMessage) return "New Conversation";

    // Strip markdown, code fences, and URLs
    const cleaned = firstUserMessage
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#*_>\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Take first 6 words, capitalise first letter
    const words = cleaned.split(" ").filter(Boolean).slice(0, 6);
    if (words.length === 0) return "New Conversation";
    const title = words.join(" ");
    return (title.charAt(0).toUpperCase() + title.slice(1)).substring(0, 60);
  }
}

export const geminiService = new GeminiService();
