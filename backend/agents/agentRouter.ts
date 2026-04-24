import { classifyLocally, type LocalClassification } from "./nlp";
import { llmRouteToAgent, type LLMRoutingResult } from "./llmRouter";

export type AgentType =
  | "web_search"
  | "weather"
  | "code_assistant"
  | "financial"
  | "document_generate"
  | "general";

export interface RoutingResult {
  agent: AgentType;
  confidence: number;
  reason: string;
  agentName: string;
  /** Extracted city for weather queries */
  extractedCity?: string;
  /** How the route was decided */
  routingMethod: "local_nlp" | "llm_fallback";
  /** Timing in ms */
  routingTimeMs: number;
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
  financial: {
    name: "Financial Agent",
    description:
      "Handles stocks, NSE/BSE queries, SIP calculations, market analysis, watchlists, and finance research",
  },
  document_generate: {
    name: "Document Generator Agent",
    description:
      "Generates structured documents, reports, project reports, and PDF-ready content",
  },
  general: {
    name: "General Assistant",
    description:
      "Handles general conversation, coding help, creative writing, analysis, math, and knowledge-based questions",
  },
};

/**
 * Confidence threshold above which the local NLP result is used directly.
 * Below this, we fall back to the LLM router.
 *
 * Tuning guide:
 *  - 0.35: Local NLP handles ~90% of queries (good balance)
 *  - 0.50: More conservative, LLM used more often
 *  - 0.25: Aggressive local-only, LLM rarely used
 */
const LOCAL_CONFIDENCE_THRESHOLD = 0.35;

/**
 * Minimum raw score from the NLP engine to trust the classification.
 * A score of 3 means at least 1 regex match or a phrase + fuzzy keyword hit.
 */
const LOCAL_SCORE_THRESHOLD = 3.0;

/**
 * Hybrid agent router:
 *  1. Runs the local NLP classifier first (~0.1ms, no network)
 *  2. If confidence is high enough, uses that result instantly
 *  3. Otherwise, falls back to LLM-based routing
 *
 * This gives sub-millisecond routing for ~90% of queries.
 */
function isFinancialQuery(message: string) {
  const msg = message.toLowerCase();
  const financeKeywords = [
    "stock",
    "share",
    "nse",
    "bse",
    "nifty",
    "sensex",
    "equity",
    "mutual fund",
    "sip",
    "invest",
    "portfolio",
    "market",
    "ipo",
    "watchlist",
    "dividend",
    "pe ratio",
    "market cap",
    "sebi",
    "rbi",
    "₹",
    "rupee",
    "returns",
    "profit",
    "loss",
    "buy",
    "sell",
    "hold",
  ];
  const tickerPattern = /\b[A-Z]{2,10}\b/;

  return (
    financeKeywords.some((k) => msg.includes(k)) || tickerPattern.test(message)
  );
}

function isDocumentGenerateQuery(message: string) {
  const msg = message.toLowerCase();
  const documentKeywords = [
    "report",
    "generate document",
    "project report",
    "pdf",
  ];

  return documentKeywords.some((k) => msg.includes(k));
}

export async function routeToAgent(
  message: string,
  _conversationContext?: Array<{ role: string; content: string }>,
): Promise<RoutingResult> {
  const startTime = performance.now();

  // Step 1: Try local NLP classification (instant)
  const localResult: LocalClassification = classifyLocally(
    message,
    _conversationContext,
  );

  const topScore =
    Object.values(localResult.scores).sort((a, b) => b - a)[0] || 0;

  // Step 1.5: Document shortcut — prefer the dedicated document generator
  // for report/pdf/document generation requests unless they are clearly weather or code.
  if (
    isDocumentGenerateQuery(message) &&
    localResult.agent !== "weather" &&
    localResult.agent !== "code_assistant"
  ) {
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    const agentMeta = AVAILABLE_AGENTS.document_generate;

    console.log(
      `[Router] DOCUMENT HEURISTIC → document_generate (${elapsed}ms) | Detected document/report generation keywords`,
    );

    return {
      agent: "document_generate",
      confidence: 0.9,
      reason: "Detected document generation keywords",
      agentName: agentMeta.name,
      routingMethod: "local_nlp",
      routingTimeMs: elapsed,
    };
  }

  // Step 1.6: Finance shortcut — prefer the dedicated financial agent
  // for finance/market queries unless they are clearly weather or code.
  if (
    isFinancialQuery(message) &&
    localResult.agent !== "weather" &&
    localResult.agent !== "code_assistant"
  ) {
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    const agentMeta = AVAILABLE_AGENTS.financial;

    console.log(
      `[Router] FINANCIAL HEURISTIC → financial (${elapsed}ms) | Detected finance keywords/ticker pattern`,
    );

    return {
      agent: "financial",
      confidence: 0.9,
      reason: "Detected finance keywords or ticker pattern",
      agentName: agentMeta.name,
      routingMethod: "local_nlp",
      routingTimeMs: elapsed,
    };
  }

  // Step 2: Decide whether the local result is good enough
  if (
    localResult.confidence >= LOCAL_CONFIDENCE_THRESHOLD &&
    topScore >= LOCAL_SCORE_THRESHOLD
  ) {
    // High confidence — use local result directly
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    const agentMeta =
      AVAILABLE_AGENTS[localResult.agent] || AVAILABLE_AGENTS.general;

    console.log(
      `[Router] LOCAL NLP → ${localResult.agent} (conf=${localResult.confidence}, score=${topScore}, ${elapsed}ms) | ${localResult.reason}`,
    );

    return {
      agent: localResult.agent,
      confidence: localResult.confidence,
      reason: localResult.reason,
      agentName: agentMeta.name,
      extractedCity: localResult.extractedCity,
      routingMethod: "local_nlp",
      routingTimeMs: elapsed,
    };
  }

  // Step 3: Low confidence — fall back to LLM router
  console.log(
    `[Router] Local NLP uncertain (conf=${localResult.confidence}, score=${topScore}, agent=${localResult.agent}). Falling back to LLM...`,
  );

  try {
    const llmResult: LLMRoutingResult = await llmRouteToAgent(
      message,
      _conversationContext,
    );

    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    const agentMeta =
      AVAILABLE_AGENTS[llmResult.agent] || AVAILABLE_AGENTS.general;

    console.log(
      `[Router] LLM FALLBACK → ${llmResult.agent} (conf=${llmResult.confidence}, ${elapsed}ms) | ${llmResult.reason}`,
    );

    // For weather: prefer LLM's extractedCity, but fall back to local extraction
    const extractedCity =
      llmResult.agent === "weather"
        ? llmResult.extractedCity || localResult.extractedCity
        : undefined;

    return {
      agent: llmResult.agent,
      confidence: llmResult.confidence,
      reason: llmResult.reason,
      agentName: agentMeta.name,
      extractedCity,
      routingMethod: "llm_fallback",
      routingTimeMs: elapsed,
    };
  } catch (error) {
    // LLM failed too — use whatever local NLP said (better than nothing)
    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
    const agentMeta =
      AVAILABLE_AGENTS[localResult.agent] || AVAILABLE_AGENTS.general;

    console.error(
      `[Router] LLM fallback failed, using local NLP result:`,
      error,
    );

    return {
      agent: localResult.agent,
      confidence: localResult.confidence,
      reason: `${localResult.reason} (LLM fallback failed)`,
      agentName: agentMeta.name,
      extractedCity: localResult.extractedCity,
      routingMethod: "local_nlp",
      routingTimeMs: elapsed,
    };
  }
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
