/**
 * Lightweight local NLP engine for agent routing.
 * Zero external dependencies, zero LLM calls — runs in <1ms.
 *
 * Features:
 *  1. Levenshtein-based fuzzy matching (typo tolerance)
 *  2. Semantic intent clusters (grouped synonyms per agent)
 *  3. Bigram / trigram phrase detection
 *  4. Emotion & sentiment detection
 *  5. Weighted multi-signal scoring
 */

// ─── Levenshtein distance (edit distance) ────────────────────────────────────

export function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[la][lb];
}

/**
 * Returns true if `word` is close enough to `target` given
 * a max edit-distance that scales with word length.
 *   len ≤ 3  → exact only
 *   len 4-5  → 1 edit allowed
 *   len 6-8  → 2 edits allowed
 *   len 9+   → 3 edits allowed
 */
export function fuzzyMatch(word: string, target: string): boolean {
  if (word === target) return true;
  const len = target.length;
  const maxDist = len <= 3 ? 0 : len <= 5 ? 1 : len <= 8 ? 2 : 3;
  // Quick length check — Levenshtein can't exceed length difference
  if (Math.abs(word.length - len) > maxDist) return false;
  return levenshtein(word, target) <= maxDist;
}

/**
 * Check if any word in `words` fuzzy-matches any keyword in `keywords`.
 * Returns matched keywords (for confidence scoring).
 */
export function fuzzyMatchAny(words: string[], keywords: string[]): string[] {
  const matched: string[] = [];
  for (const kw of keywords) {
    for (const w of words) {
      if (fuzzyMatch(w, kw)) {
        matched.push(kw);
        break; // one match per keyword is enough
      }
    }
  }
  return matched;
}

// ─── Tokeniser ───────────────────────────────────────────────────────────────

// ─── Stopwords ─────────────────────────────────────────────────────────────
// Common English words that should NOT participate in fuzzy keyword matching.
// Without this, "new" fuzzy-matches "news", "in" matches "win", etc.

const STOPWORDS = new Set([
  // Determiners / articles
  "a", "an", "the", "this", "that", "these", "those",
  // Pronouns
  "i", "me", "my", "we", "us", "our", "you", "your", "he", "she", "it", "they", "them",
  // Prepositions
  "in", "on", "at", "to", "for", "of", "by", "from", "with", "about", "into",
  // Conjunctions
  "and", "or", "but", "nor", "so", "yet",
  // Auxiliaries / modals
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "will", "would", "shall", "should",
  "can", "could", "may", "might", "must",
  "have", "has", "had", "having",
  // Common adverbs / fillers
  "not", "no", "yes", "very", "just", "also", "too", "really", "please",
  "now", "then", "here", "there", "when", "where", "while",
  // Question words (these participate in patterns, not fuzzy matching)
  "what", "which", "who", "whom", "whose",
  // Other common words that cause false positives
  "new", "old", "big", "small", "get", "got", "let", "go", "going",
  "make", "take", "come", "give", "tell", "say", "said",
  "if", "up", "out", "all", "some", "any", "each", "every",
  "much", "many", "more", "most", "other", "well",
  "its", "than", "like",
]);

export { STOPWORDS };

/** Simple word tokeniser: lowercases, strips punctuation, splits on whitespace */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")          // normalise curly quotes
    .replace(/[^\w\s'-]/g, " ")     // strip punctuation except hyphens/apostrophes
    .split(/\s+/)
    .filter(Boolean);
}

/** Tokens with stopwords removed — used for fuzzy keyword matching */
export function tokenizeForFuzzy(text: string): string[] {
  return tokenize(text).filter((t) => !STOPWORDS.has(t));
}

/** Build bigrams from token array: ["how", "hot"] → ["how hot"] */
export function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

/** Build trigrams from token array */
export function trigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  return out;
}

// ─── Semantic intent clusters ────────────────────────────────────────────────
// Each cluster maps an intent (agent) to keyword groups.
// Keywords within a group are synonyms/related words.
// The fuzzy matcher checks each individual word against these.

export interface IntentCluster {
  /** Single-word keywords to fuzzy-match against message tokens */
  keywords: string[];
  /** Multi-word phrases to match against bigrams/trigrams */
  phrases: string[];
  /** Regex patterns for structural/contextual matching */
  patterns: RegExp[];
  /** Base weight for this cluster (higher = stronger signal) */
  weight: number;
}

export const WEATHER_CLUSTER: IntentCluster = {
  keywords: [
    // Core weather terms
    "weather", "forecast", "temperature", "climate",
    // Conditions — including compound forms
    "rain", "raining", "rainy", "rainfall",
    "snow", "snowing", "snowy", "snowfall", "snowstorm",
    "storm", "stormy", "thunderstorm", "lightning", "thunder",
    "sunny", "sunshine", "sun",
    "cloudy", "clouds", "overcast", "fog", "foggy", "haze", "hazy", "mist", "misty",
    "wind", "windy", "windspeed", "breeze", "breezy", "gust", "gusty",
    "humid", "humidity", "moisture",
    "drizzle", "sleet", "hail", "hailstorm",
    "freezing", "frost", "frosty", "chilly", "cold", "hot", "warm",
    // Metrics
    "celsius", "fahrenheit", "degrees",
    // Astronomy
    "sunrise", "sunset",
    // Related
    "umbrella", "raincoat", "jacket",
  ],
  phrases: [
    "how hot", "how cold", "how warm", "how humid", "how windy",
    "is it raining", "is it snowing", "is it sunny", "is it cloudy",
    "will it rain", "will it snow", "will it snowfall",
    "going to rain", "going to snow", "chance of rain", "chance of snow",
    "do i need", "should i carry", "should i bring",
    "what's the temperature", "whats the temperature",
    "tell me weather", "tell me the weather",
    "weather update", "weather report", "weather today",
    "weather forecast", "weather condition", "weather conditions",
    "current temperature", "feels like",
  ],
  patterns: [
    /\b(weather|forecast|temperature|rain\w*|snow\w*|storm|sunny|cloudy|humid\w*|wind\w*|sunrise|sunset|hail\w*|frost\w*|freez\w*)\b/i,
    /\b(how (hot|cold|warm|humid|windy|chilly|freezing))\b/i,
    /\b(is it (raining|snowing|sunny|cloudy|windy|cold|hot|warm|freezing|chilly))\b/i,
    /\b(will it (rain|snow|snowfall|hail|storm|freeze|be (cold|hot|warm|sunny|cloudy|rainy)))\b/i,
    /\b(going to (rain|snow|storm|hail))\b/i,
    /\b(do i need|should i (carry|bring|take)) .*(umbrella|jacket|raincoat|sweater|coat)\b/i,
  ],
  weight: 1.0,
};

export const SEARCH_CLUSTER: IntentCluster = {
  keywords: [
    // Explicit search
    "search", "google", "lookup", "look",
    // News & events
    "news", "headlines", "happening", "happened", "breaking",
    "announcement", "update", "updates",
    // Time-sensitive
    "latest", "newest", "recent", "current", "live", "trending",
    "realtime", "real-time",
    // Sports
    "score", "scores", "standings", "championship", "tournament",
    "match", "fixture", "fixtures", "league",
    // Finance
    "stock", "stocks", "shares", "crypto", "bitcoin", "ethereum",
    "solana", "market", "nasdaq", "sensex", "nifty",
    "price", "pricing", "rate", "rates",
    // People & entities
    "who", "founder", "ceo",
    // Products
    "released", "launched", "available", "buy", "purchase",
  ],
  phrases: [
    "look up", "find out", "look for", "search for",
    "what happened", "what's happening", "whats happening",
    "any news", "latest news", "breaking news",
    "right now", "just now",
    "this week", "this month",
    "stock price", "share price", "exchange rate",
    "who is", "who are", "who was", "who won",
    "how much does", "how much is",
  ],
  patterns: [
    /\b(search|look up|find out|google|look for)\b/i,
    /\b(latest|newest|recent|trending|breaking)\b/i,
    /\b(news|headlines|happened|happening|announcement)\b/i,
    /\b(today|yesterday|this week|this month|right now|recently)\b/i,
    /\b(2024|2025|2026|2027)\b/,
    /\b(score|scores|standings|championship|tournament)\b/i,
    /\b(stock|crypto|bitcoin|market|nasdaq|sensex|nifty)\b/i,
    /\b(who (is|are|was|won|leads?|runs?|owns?|founded))\b/i,
    /\b(what (is|are) (the )?(current|latest|recent|new))\b/i,
    /\b(available|released|launched|out now)\b/i,
  ],
  weight: 1.0,
};

export const CODE_CLUSTER: IntentCluster = {
  keywords: [
    // Programming languages
    "code", "program", "script", "algorithm", "function",
    "python", "javascript", "typescript", "java", "rust", "golang", "ruby",
    "html", "css", "react", "vue", "angular", "svelte", "nextjs",
    // Actions
    "debug", "refactor", "compile", "execute", "run",
    // Concepts
    "fibonacci", "sorting", "binary", "recursion", "loop", "array", "hashmap",
    "api", "endpoint", "database", "query", "sql",
    // UI generation
    "webpage", "website", "landing", "dashboard", "component", "layout",
    "form", "card", "modal", "navbar", "sidebar", "footer", "header",
    "button", "table", "chart", "graph",
    // Sandbox / execution
    "sandbox", "output", "console", "terminal", "snippet",
  ],
  phrases: [
    "write a script", "write code", "write a function", "write a program",
    "create a landing page", "create a webpage", "create a website",
    "create a dashboard", "create a form", "create a component",
    "build a", "build me", "make a calculator", "make a website",
    "generate a ui", "generate ui", "generate a page",
    "run this code", "execute this", "run the code",
    "debug this", "fix this code", "refactor this",
    "fibonacci sequence", "sorting algorithm", "binary search",
    "hello world", "print hello",
  ],
  patterns: [
    /\b(write|create|build|generate|make) .*(code|script|function|program|page|website|webpage|dashboard|component|form|ui|landing|app|application)\b/i,
    /\b(run|execute|compile|test) .*(code|script|program|function)\b/i,
    /\b(debug|fix|refactor|optimize) .*(code|script|function|program|bug)\b/i,
    /\b(fibonacci|sorting|binary search|quicksort|mergesort|bubblesort|recursion)\b/i,
    /\b(python|javascript|typescript|java|rust|golang|ruby|html|css|react|vue|angular|svelte)\b/i,
    /\b(landing page|web ?page|web ?site|dashboard|ui component)\b/i,
    /```[\s\S]*```/i, // Code fences in the message
  ],
  weight: 1.1, // slightly higher — code intent should win over general
};

export const GENERAL_CLUSTER: IntentCluster = {
  keywords: [
    // Creative
    "essay", "poem", "story", "novel", "lyrics", "letter",
    // Education
    "explain", "teach", "learn", "understand", "definition", "meaning", "concept",
    // Language
    "translate", "summarize", "paraphrase", "rewrite", "proofread",
    // Math (non-code)
    "calculate", "compute", "solve", "math", "equation", "formula", "integral",
    // Analysis
    "review", "analyze", "compare", "evaluate", "critique",
    // Greetings (low signal but still general)
    "hello", "hi", "hey", "thanks", "goodbye",
  ],
  phrases: [
    "help me understand", "how does it work", "what does it mean",
    "can you explain", "can you help",
    "tell me about", "teach me",
    "translate this", "summarize this",
    "who are you", "what are you", "what can you do",
    "write an essay", "write a poem", "write a story", "write a letter",
    "draft an email", "compose a message",
  ],
  patterns: [
    /\b(explain|teach|help me understand)\b/i,
    /\b(translate|summarize|paraphrase|rewrite|proofread)\b/i,
    /\b(calculate|compute|solve|math|equation|formula)\b/i,
    /\b(review|analyze|compare|evaluate|critique)\b/i,
    /^(hi|hello|hey|thanks|thank you|who are you|what (are|can) you)/i,
    /\b(write|draft|compose) .*(essay|poem|story|letter|email|message|article|blog)\b/i,
  ],
  weight: 0.8, // lowest — acts as true fallback
};

// ─── Emotion & sentiment detection ──────────────────────────────────────────

export interface EmotionSignal {
  emotion: "frustration" | "urgency" | "curiosity" | "gratitude" | "greeting" | "neutral";
  intensity: number; // 0-1
}

const EMOTION_PATTERNS: Array<{ emotion: EmotionSignal["emotion"]; patterns: RegExp[]; intensity: number }> = [
  {
    emotion: "frustration",
    patterns: [
      /\b(ugh|damn|dammit|annoying|frustrated|angry|furious|hate|worst|terrible|horrible|stupid|broken|sucks|wtf|smh)\b/i,
      /(!{2,})/,
      /\b(not working|doesn't work|doesn't work|won't work|can't get|keeps? failing)\b/i,
    ],
    intensity: 0.7,
  },
  {
    emotion: "urgency",
    patterns: [
      /\b(urgent|asap|immediately|right now|hurry|quickly|fast|emergency|critical|need .+ now)\b/i,
      /\b(please help|help me|i need|can someone)\b/i,
      /(!{2,})/,
    ],
    intensity: 0.6,
  },
  {
    emotion: "curiosity",
    patterns: [
      /\b(how|why|what|when|where|who|which|wonder|curious|interested|fascinating)\b/i,
      /(\?{1,})/,
    ],
    intensity: 0.3,
  },
  {
    emotion: "gratitude",
    patterns: [
      /\b(thanks|thank you|thx|ty|appreciate|grateful|awesome|perfect|great job|well done)\b/i,
    ],
    intensity: 0.4,
  },
  {
    emotion: "greeting",
    patterns: [
      /^(hi|hello|hey|good (morning|afternoon|evening)|sup|yo|howdy)\b/i,
    ],
    intensity: 0.3,
  },
];

export function detectEmotion(text: string): EmotionSignal {
  let bestEmotion: EmotionSignal["emotion"] = "neutral";
  let bestIntensity = 0;

  for (const { emotion, patterns, intensity } of EMOTION_PATTERNS) {
    let matchCount = 0;
    for (const p of patterns) {
      if (p.test(text)) matchCount++;
    }
    if (matchCount > 0) {
      const adjustedIntensity = Math.min(intensity + (matchCount - 1) * 0.15, 1.0);
      if (adjustedIntensity > bestIntensity) {
        bestIntensity = adjustedIntensity;
        bestEmotion = emotion;
      }
    }
  }

  return { emotion: bestEmotion, intensity: bestIntensity };
}

// ─── Multi-signal intent scoring ─────────────────────────────────────────────

export interface IntentScore {
  agent: string;
  score: number;
  signals: string[];
}

/**
 * Score a message against an intent cluster using multiple signal types:
 *   - Exact regex pattern matches      (weight: 3.0 each)
 *   - Phrase matches (bigram/trigram)   (weight: 2.5 each)
 *   - Fuzzy keyword matches            (weight: 1.5 each)
 *   - Partial substring matches        (weight: 0.5 each)
 *
 * Returns a composite score + list of matched signals (for debugging).
 */
export function scoreIntent(
  tokens: string[],
  messageBigrams: string[],
  messageTrigrams: string[],
  rawMessage: string,
  cluster: IntentCluster,
): IntentScore {
  let score = 0;
  const signals: string[] = [];

  // 1) Regex pattern matches — highest confidence signal
  for (const pattern of cluster.patterns) {
    if (pattern.test(rawMessage)) {
      score += 3.0 * cluster.weight;
      signals.push(`regex:${pattern.source.slice(0, 30)}`);
    }
  }

  // 2) Phrase matches (bigrams + trigrams against cluster phrases)
  const lowerPhrases = cluster.phrases.map((p) => p.toLowerCase());
  for (const phrase of lowerPhrases) {
    const phraseTokens = phrase.split(" ");
    const candidates = phraseTokens.length === 2 ? messageBigrams : messageTrigrams;
    for (const candidate of candidates) {
      if (candidate === phrase) {
        score += 2.5 * cluster.weight;
        signals.push(`phrase:"${phrase}"`);
        break;
      }
    }
  }

  // 3) Fuzzy keyword matches — typo-tolerant (stopwords removed)
  const fuzzyTokens = tokens.filter((t) => !STOPWORDS.has(t));
  const fuzzyHits = fuzzyMatchAny(fuzzyTokens, cluster.keywords);
  for (const hit of fuzzyHits) {
    score += 1.5 * cluster.weight;
    signals.push(`fuzzy:"${hit}"`);
  }

  // 4) Partial substring matches — catch compound words & fragments
  for (const kw of cluster.keywords) {
    if (kw.length >= 5 && rawMessage.toLowerCase().includes(kw)) {
      // Only count if not already fuzzy-matched
      if (!fuzzyHits.includes(kw)) {
        score += 0.5 * cluster.weight;
        signals.push(`substr:"${kw}"`);
      }
    }
  }

  return { agent: "", score, signals };
}

// ─── Contextual boosting ─────────────────────────────────────────────────────

/**
 * If the last assistant message was from a certain agent, give a small
 * follow-up boost to the same agent (conversational continuity).
 */
export function contextBoost(
  agent: string,
  conversationContext?: Array<{ role: string; content: string; agent?: string }>,
): number {
  if (!conversationContext || conversationContext.length === 0) return 0;
  return 0;
}

// ─── Local classifier (instant, <1ms) ────────────────────────────────────────

export type AgentTypeLocal = "weather" | "web_search" | "code_assistant" | "general";

export interface LocalClassification {
  agent: AgentTypeLocal;
  confidence: number;
  reason: string;
  scores: Record<string, number>;
  /** Extracted city for weather queries */
  extractedCity?: string;
}

// Regex to extract city/location from weather queries
const CITY_EXTRACTION_PATTERNS = [
  // "how's the weather in Delhi", "what's the temperature in London", "what's the weather like in New York"
  /(?:how'?s?|what'?s?|hows|whats)\s+(?:the\s+)?(?:weather|temperature|forecast)\s+(?:\w+\s+)?(?:in|at|for|of)\s+([A-Za-z][A-Za-z\s\-']{1,40})/i,
  // "how cold is it in Berlin", "how hot in Chennai"
  /(?:how)\s+(?:hot|cold|warm|humid|windy|chilly)\s+(?:is\s+it\s+)?(?:in|at)\s+([A-Za-z][A-Za-z\s\-']{1,40})/i,
  // "is it raining in Paris", "will it snow in Tokyo"
  /(?:is it|will it|does it|going to)\s+(?:rain\w*|snow\w*|storm\w*|sun\w*)\s+(?:in|at)\s+([A-Za-z][A-Za-z\s\-']{1,40})/i,
  // "do I need an umbrella in Seattle"
  /(?:do i need|should i (?:carry|bring|take))\s+.*?\s+(?:in|at|for)\s+([A-Za-z][A-Za-z\s\-']{1,40})/i,
  // "weather in Mumbai", "temperature in New York" — generic "[keyword] in [city]"
  /(?:weather|forecast|temperature|rain|snow|humidity|wind|sunrise|sunset|climate)\s+(?:\w+\s+)?(?:in|at|for|of|near)\s+([A-Za-z][A-Za-z\s\-']{1,40})/i,
  // "Mumbai weather", "New York temperature" — "[city] [keyword]"
  /^([A-Za-z][A-Za-z\s\-']{1,40})\s+(?:weather|forecast|temperature|climate)/i,
];

function extractCity(message: string): string | undefined {
  for (const pattern of CITY_EXTRACTION_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]) {
      // Clean up: trim, remove trailing common words that aren't part of city
      const city = match[1]
        .trim()
        .replace(/\b(today|tomorrow|now|right now|this week|please|thanks)\b.*$/i, "")
        .trim();
      if (city.length >= 2) return city;
    }
  }
  return undefined;
}

/**
 * Classify a message locally using the NLP intent scoring engine.
 * Returns the best-matching agent with a normalised confidence (0-1).
 * Runs in <1ms — no network calls.
 */
export function classifyLocally(
  message: string,
  _conversationContext?: Array<{ role: string; content: string }>,
): LocalClassification {
  const tokens = tokenize(message);
  const messageBigrams = bigrams(tokens);
  const messageTrigrams = trigrams(tokens);

  const clusters: Array<{ agent: AgentTypeLocal; cluster: IntentCluster }> = [
    { agent: "weather", cluster: WEATHER_CLUSTER },
    { agent: "web_search", cluster: SEARCH_CLUSTER },
    { agent: "code_assistant", cluster: CODE_CLUSTER },
    { agent: "general", cluster: GENERAL_CLUSTER },
  ];

  const results: Array<{ agent: AgentTypeLocal; score: number; signals: string[] }> = [];

  for (const { agent, cluster } of clusters) {
    const result = scoreIntent(tokens, messageBigrams, messageTrigrams, message, cluster);
    results.push({ agent, score: result.score, signals: result.signals });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  const best = results[0];
  const second = results[1];
  const scores: Record<string, number> = {};
  for (const r of results) scores[r.agent] = Math.round(r.score * 100) / 100;

  // If best score is 0, default to general
  if (best.score === 0) {
    return {
      agent: "general",
      confidence: 0.3,
      reason: "No intent signals matched — defaulting to general",
      scores,
    };
  }

  // Normalise confidence: based on absolute score and gap to second place
  const gap = best.score - second.score;
  const absConfidence = Math.min(best.score / 6, 1); // 6+ score = 1.0
  const gapConfidence = Math.min(gap / 3, 1);         // 3+ gap = 1.0
  const confidence = Math.round((absConfidence * 0.6 + gapConfidence * 0.4) * 100) / 100;

  // Extract city for weather
  let extractedCity: string | undefined;
  if (best.agent === "weather") {
    extractedCity = extractCity(message);
  }

  return {
    agent: best.agent,
    confidence,
    reason: `Local NLP: ${best.signals.slice(0, 3).join(", ")}`,
    scores,
    extractedCity,
  };
}

