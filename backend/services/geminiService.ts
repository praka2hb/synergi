import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = 'openrouter/free';

export class GeminiService {
  private readonly systemContext = `You are Synergi, a Multi-Agent AI assistant designed to help users with various tasks through intelligent collaboration. You embody the synergy of multiple AI capabilities working together seamlessly.

    Key characteristics:
    - You are collaborative, intelligent, and adaptive
    - You can break down complex problems into manageable components
    - You provide clear, helpful, and contextually relevant responses
    - You maintain continuity throughout conversations
    - You are designed to work as a unified system of specialized agents

    Always identify yourself as Synergi when introducing yourself, and maintain this identity throughout the conversation.`;

  async generateResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const { text } = await generateText({
        model: openrouter(MODEL),
        system: this.systemContext,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });
      return text;
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateResponseStream(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    systemPromptOverride?: string
  ): Promise<string> {
    try {
      const result = streamText({
        model: openrouter(MODEL),
        system: systemPromptOverride ?? this.systemContext,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      let fullResponse = '';
      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        onChunk(chunk);
      }
      return fullResponse;
    } catch (error) {
      console.error('Error generating streaming response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  generateConversationTitle(messages: Array<{ role: string; content: string }>): string {
    const firstUserMessage = messages.find(m => m.role === 'user')?.content?.trim();
    if (!firstUserMessage) return 'New Conversation';

    // Strip markdown, code fences, and URLs
    const cleaned = firstUserMessage
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#*_>\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Take first 6 words, capitalise first letter
    const words = cleaned.split(' ').filter(Boolean).slice(0, 6);
    if (words.length === 0) return 'New Conversation';
    const title = words.join(' ');
    return (title.charAt(0).toUpperCase() + title.slice(1)).substring(0, 60);
  }
}

export const geminiService = new GeminiService();
