import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
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
      // Convert messages to Gemini format and include system context
      const geminiMessages = this.formatMessagesForGemini(messages);
      
      const chat = this.model.startChat({
        history: geminiMessages,
      });

      // Get the latest user message
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role !== 'user') {
        throw new Error('Latest message must be from user');
      }

      const result = await chat.sendMessage(latestMessage.content);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response from Gemini:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateResponseStream(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      // Convert messages to Gemini format and include system context
      const geminiMessages = this.formatMessagesForGemini(messages);
      
      const chat = this.model.startChat({
        history: geminiMessages,
      });

      // Get the latest user message
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role !== 'user') {
        throw new Error('Latest message must be from user');
      }

      const result = await chat.sendMessageStream(latestMessage.content);
      let fullResponse = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          onChunk(chunkText);
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error generating streaming response from Gemini:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  private formatMessagesForGemini(messages: Array<{ role: string; content: string }>) {
    const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    
    // Add system context as the first user message and model response
    history.push({
      role: 'user',
      parts: [{ text: 'Please introduce yourself and explain your capabilities.' }]
    });
    
    history.push({
      role: 'model',
      parts: [{ text: this.systemContext }]
    });

    // Convert conversation messages (skip the last user message as it will be sent separately)
    const conversationMessages = messages.slice(0, -1);
    
    for (const message of conversationMessages) {
      if (message.role === 'user') {
        history.push({
          role: 'user',
          parts: [{ text: message.content }]
        });
      } else if (message.role === 'assistant') {
        history.push({
          role: 'model',
          parts: [{ text: message.content }]
        });
      }
      // Skip system messages as they're handled separately
    }

    return history;
  }

  async generateConversationTitle(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const firstUserMessage = messages.find(m => m.role === 'user')?.content;
      if (!firstUserMessage) {
        return 'New Conversation';
      }

      const prompt = `Generate a short, descriptive title (maximum 6 words) for a conversation that starts with: "${firstUserMessage}". Only return the title, nothing else.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const title = response.text().trim().replace(/"/g, '');
      
      return title.length > 50 ? title.substring(0, 47) + '...' : title;
    } catch (error) {
      console.error('Error generating conversation title:', error);
      return 'New Conversation';
    }
  }
}

export const geminiService = new GeminiService();
