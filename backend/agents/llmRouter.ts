/**
 * LLM-based agent router using OpenRouter free models.
 * Uses generateText with a JSON-formatted prompt (works with ALL models,
 * no structured output / tool calling support required).
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
});

const ROUTER_MODEL = "openrouter/auto";

export interface LLMRoutingResult {
    agent: "weather" | "web_search" | "code_assistant" | "general";
    confidence: number;
    reason: string;
    extractedCity?: string;
}

const ROUTING_SYSTEM_PROMPT = `You are an intelligent query router for a multi-agent AI system. Analyze the user's message and decide which agent should handle it.

Available agents:
1. "weather" — ANY weather-related query: temperature, forecast, rain, snow, humidity, wind, sunrise/sunset, "should I carry an umbrella", "how hot/cold is it", climate conditions for a location, etc.
2. "web_search" — Queries needing current/real-time information: latest news, stock prices, sports scores, "who won", current events, product releases, trending topics, people lookup.
3. "code_assistant" — ANY request involving code, programming, scripts, algorithms, data processing, OR building UI/webpages/landing pages/components. This includes: "write a script", "create a landing page", "build a form", "make a calculator", "Fibonacci", "sorting algorithm", "create a dashboard", "build a website", "generate a UI", etc.
4. "general" — Everything else: creative writing, explanations, translations, general knowledge, greetings, casual conversation, math questions that don't need code.

Rules:
- Users often make typos. Understand the intended meaning despite misspellings.
- If the query mentions ANY weather condition or asks about carrying weather gear for a location, ALWAYS route to "weather".
- If the query needs information that changes over time (news, prices, scores, events), route to "web_search".
- If the query asks to CREATE, BUILD, GENERATE, or WRITE any code, script, webpage, landing page, UI component, form, dashboard, or application, ALWAYS route to "code_assistant".
- If the query asks to run code, execute a script, or see output of an algorithm, ALWAYS route to "code_assistant".
- When routing to "weather", extract the city/location name into extractedCity.

You MUST respond with ONLY a valid JSON object in this exact format, nothing else:
{"agent":"code_assistant","confidence":0.95,"reason":"User asked to create a landing page"}`;

/**
 * Route a user message to the appropriate agent using an LLM call.
 */
export async function llmRouteToAgent(
    message: string,
    _conversationContext?: Array<{ role: string; content: string }>
): Promise<LLMRoutingResult> {
    try {
        const { text } = await generateText({
            model: openrouter(ROUTER_MODEL),
            system: ROUTING_SYSTEM_PROMPT,
            prompt: `Route this user message to the correct agent. Respond with ONLY valid JSON, no other text.\n\nUser message: "${message}"`,
        });

        // Parse the JSON from the response — handle potential markdown wrapping
        const cleanedText = text
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();

        // Find the JSON object in the response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("LLM router: No JSON found in response:", text);
            return fallback("No JSON in LLM response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate the agent field
        const validAgents = ["weather", "web_search", "code_assistant", "general"];
        if (!validAgents.includes(parsed.agent)) {
            console.error("LLM router: Invalid agent:", parsed.agent);
            return fallback("Invalid agent in response");
        }

        return {
            agent: parsed.agent,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
            reason: parsed.reason || "LLM classification",
            extractedCity: parsed.extractedCity || undefined,
        };
    } catch (error) {
        console.error("LLM routing failed, falling back to general:", error);
        return fallback("LLM routing error");
    }
}

function fallback(reason: string): LLMRoutingResult {
    return {
        agent: "general",
        confidence: 0.5,
        reason: `Fallback: ${reason}`,
        extractedCity: undefined,
    };
}
