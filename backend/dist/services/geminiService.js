"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiService = exports.GeminiService = void 0;
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const ai_1 = require("ai");
const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({
    apiKey: process.env.OPENROUTER_API_KEY,
});
const MODEL = 'openrouter/free';
class GeminiService {
    systemContext = `You are Synergi, a Multi-Agent AI assistant designed to help users with various tasks through intelligent collaboration. You embody the synergy of multiple AI capabilities working together seamlessly.

    Key characteristics:
    - You are collaborative, intelligent, and adaptive
    - You can break down complex problems into manageable components
    - You provide clear, helpful, and contextually relevant responses
    - You maintain continuity throughout conversations
    - You are designed to work as a unified system of specialized agents

    Always identify yourself as Synergi when introducing yourself, and maintain this identity throughout the conversation.`;
    async generateResponse(messages) {
        try {
            const { text } = await (0, ai_1.generateText)({
                model: openrouter(MODEL),
                system: this.systemContext,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            });
            return text;
        }
        catch (error) {
            console.error('Error generating response:', error);
            throw new Error('Failed to generate AI response');
        }
    }
    async generateResponseStream(messages, onChunk, systemPromptOverride) {
        try {
            const result = (0, ai_1.streamText)({
                model: openrouter(MODEL),
                system: systemPromptOverride ?? this.systemContext,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            });
            let fullResponse = '';
            for await (const chunk of result.textStream) {
                fullResponse += chunk;
                onChunk(chunk);
            }
            return fullResponse;
        }
        catch (error) {
            console.error('Error generating streaming response:', error);
            throw new Error('Failed to generate AI response');
        }
    }
    generateConversationTitle(messages) {
        const firstUserMessage = messages.find(m => m.role === 'user')?.content?.trim();
        if (!firstUserMessage)
            return 'New Conversation';
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
        if (words.length === 0)
            return 'New Conversation';
        const title = words.join(' ');
        return (title.charAt(0).toUpperCase() + title.slice(1)).substring(0, 60);
    }
}
exports.GeminiService = GeminiService;
exports.geminiService = new GeminiService();
