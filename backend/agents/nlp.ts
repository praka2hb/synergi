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

export const GENERAL_CLUSTER: IntentCluster = {
  keywords: [
    // Creative
    "write", "create", "generate", "draft", "compose", "essay", "poem", "story",
    // Coding
    "code", "program", "function", "debug", "refactor", "script", "algorithm",
    "typescript", "javascript", "python", "java", "react", "html", "css",
    // Education
    "explain", "teach", "learn", "understand", "definition", "meaning", "concept",
    // Language
    "translate", "summarize", "paraphrase", "rewrite", "proofread",
    // Math
    "calculate", "compute", "solve", "math", "equation", "formula", "integral",
    // Analysis
    "review", "analyze", "compare", "evaluate", "critique",
    // Greetings (low signal but still general)
    "hello", "hi", "hey", "thanks", "goodbye",
  ],
  phrases: [
    "help me understand", "how does it work", "what does it mean",
    "write a", "create a", "generate a", "make a", "draft a",
    "can you explain", "can you help", "can you write",
    "tell me about", "teach me",
    "fix this", "debug this", "refactor this",
    "translate this", "summarize this",
    "who are you", "what are you", "what can you do",
  ],
  patterns: [
    /\b(write|create|generate|make|draft|compose)\b/i,
    /\b(explain|teach|help me understand)\b/i,
    /\b(code|program|function|debug|fix|refactor|script)\b/i,
    /\b(translate|summarize|paraphrase|rewrite|proofread)\b/i,
    /\b(calculate|compute|solve|math|equation|formula)\b/i,
    /\b(review|analyze|compare|evaluate|critique)\b/i,
    /^(hi|hello|hey|thanks|thank you|who are you|what (are|can) you)/i,
  ],
  weight: 0.9, // slightly lower — acts as fallback
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
  // Check last few messages for agent signals
  const recentAssistant = conversationContext
    .filter((m) => m.role === "assistant")
    .slice(-2);
  // Very small boost — shouldn't override strong signals
  // We don't have agent info in message history currently, so this is future-proof
  return 0;
}
