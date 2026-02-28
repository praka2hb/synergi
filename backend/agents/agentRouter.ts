import { llmRouteToAgent, type LLMRoutingResult } from "./llmRouter";

export type AgentType = "web_search" | "weather" | "code_assistant" | "general";

export interface RoutingResult {
  agent: AgentType;
  confidence: number;
  reason: string;
  agentName: string;
  /** Extracted city for weather queries */
  extractedCity?: string;
}

// Available agents registry
const AVAILABLE_AGENTS: Record<
  AgentType,
  { name: string; description: string }
> = {
  web_search: {
    name: "Web Search Agent",
    description:
      "Searches the web for current, real-time information, latest news, live data, recent events, and up-to-date facts",
  },
  weather: {
    name: "Weather Agent",
    description:
      "Provides instant, accurate weather data including current conditions, hourly forecasts, sunrise/sunset, and more",
  },
  code_assistant: {
    name: "Code Assistant",
    description:
      "Executes code (Python/JS) in a sandbox and generates UI components, landing pages, and webpages with live preview",
  },
  general: {
    name: "General Assistant",
    description:
      "Handles general conversation, coding help, creative writing, analysis, math, and knowledge-based questions",
  },
};

/**
 * LLM-powered agent router — uses OpenRouter free models to understand
 * user intent, handle typos, and extract parameters like city names.
 */
export async function routeToAgent(
  message: string,
  _conversationContext?: Array<{ role: string; content: string }>
): Promise<RoutingResult> {
  const llmResult: LLMRoutingResult = await llmRouteToAgent(
    message,
    _conversationContext
  );

  const agentMeta = AVAILABLE_AGENTS[llmResult.agent] || AVAILABLE_AGENTS.general;

  return {
    agent: llmResult.agent,
    confidence: llmResult.confidence,
    reason: llmResult.reason,
    agentName: agentMeta.name,
    extractedCity: llmResult.extractedCity || undefined,
  };
}

/**
 * Returns metadata about available agents (for frontend display)
 */
export function getAvailableAgents() {
  return Object.entries(AVAILABLE_AGENTS).map(([key, agent]) => ({
    id: key,
    name: agent.name,
    description: agent.description,
    isActive: true,
  }));
}
