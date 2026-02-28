/**
 * Quick test harness — run with:  bun agents/test-router.ts
 *
 * Tests: typos, emotions, long text, straightforward queries.
 */
import { routeToAgent } from "./agentRouter";

interface TestCase {
  input: string;
  expected: "weather" | "web_search" | "general";
  tag: string;
}

const tests: TestCase[] = [
  // ── Straightforward keywords ───────────────────────────────────────────────
  { input: "weather in Mumbai", expected: "weather", tag: "keyword" },
  { input: "what's the forecast in London?", expected: "weather", tag: "keyword" },
  { input: "search for latest iPhone", expected: "web_search", tag: "keyword" },
  { input: "latest news about SpaceX", expected: "web_search", tag: "keyword" },
  { input: "write a poem about love", expected: "general", tag: "keyword" },
  { input: "explain quantum physics", expected: "general", tag: "keyword" },
  { input: "hi there!", expected: "general", tag: "keyword" },

  // ── Typos ──────────────────────────────────────────────────────────────────
  { input: "wether in Delhi", expected: "weather", tag: "typo" },
  { input: "waether in Tokyo", expected: "weather", tag: "typo" },
  { input: "temprature in Paris", expected: "weather", tag: "typo" },
  { input: "forcast for New York", expected: "weather", tag: "typo" },
  { input: "is it rainng in Seattle?", expected: "weather", tag: "typo" },
  { input: "will it snowfall in New York", expected: "weather", tag: "typo" },
  { input: "serch for flights to Bali", expected: "web_search", tag: "typo" },
  { input: "latst news about AI", expected: "web_search", tag: "typo" },
  { input: "headlns today", expected: "web_search", tag: "typo" },
  { input: "explan machine learning", expected: "general", tag: "typo" },

  // ── Emotions ───────────────────────────────────────────────────────────────
  { input: "ugh it's so cold, will it rain in Delhi?!", expected: "weather", tag: "emotion" },
  { input: "I'm freezing! what's the temperature in Chicago", expected: "weather", tag: "emotion" },
  { input: "this is urgent! find the latest covid updates NOW", expected: "web_search", tag: "emotion" },
  { input: "I'm so confused, please explain recursion to me", expected: "general", tag: "emotion" },

  // ── Long / complex text ────────────────────────────────────────────────────
  {
    input: "I'm planning a trip to Barcelona next week and I'm really worried about the weather because last time I went it rained the entire time. Can you check if it's going to rain?",
    expected: "weather",
    tag: "long",
  },
  {
    input: "I've been trying to keep up with what's happening in the tech world but everything moves so fast these days. What are the latest developments in artificial intelligence and any breaking news?",
    expected: "web_search",
    tag: "long",
  },
  {
    input: "I have a Python function that keeps throwing a TypeError when I pass a list to it, and I've been debugging for hours. Can you help me understand what might be wrong and how to fix it?",
    expected: "general",
    tag: "long",
  },

  // ── Ambiguous / hard ───────────────────────────────────────────────────────
  { input: "should I carry an umbrella in Mumbai today?", expected: "weather", tag: "ambiguous" },
  { input: "how hot is it in Dubai right now", expected: "weather", tag: "ambiguous" },
  { input: "who won the cricket match today?", expected: "web_search", tag: "ambiguous" },
  { input: "Bitcoin price", expected: "web_search", tag: "ambiguous" },
  { input: "calculate 2^128", expected: "general", tag: "ambiguous" },
];

// ── Run tests ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const t of tests) {
  const result = routeToAgent(t.input);
  const ok = result.agent === t.expected;
  if (ok) {
    passed++;
    console.log(`✅ [${t.tag}] "${t.input.slice(0, 50)}" → ${result.agent} (${result.confidence})`);
  } else {
    failed++;
    console.log(`❌ [${t.tag}] "${t.input.slice(0, 50)}" → ${result.agent} (expected ${t.expected}) — ${result.reason}`);
  }
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
