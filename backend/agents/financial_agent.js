const fs = require("node:fs/promises");
const path = require("node:path");
const {
  getStockData,
  getStockFundamentals,
  getStockNews,
} = require("../lib/stock_fetcher.js");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openrouter/auto";
const MAX_TOKENS = 1500;
const STREAM_DECODER = new TextDecoder();

const STOCK_DISCLAIMER =
  "⚠️ Research only — not SEBI-registered investment advice. Verify independently before investing.";

const INTENTS = {
  STOCK_LOOKUP: "STOCK_LOOKUP",
  COMPARISON: "COMPARISON",
  ANALYSIS: "ANALYSIS",
  SIP_CALC: "SIP_CALC",
  NEWS: "NEWS",
  WATCHLIST: "WATCHLIST",
  GENERAL_FINANCE: "GENERAL_FINANCE",
};

const TICKER_STOPWORDS = new Set([
  "NSE",
  "BSE",
  "SIP",
  "ETF",
  "IPO",
  "SEBI",
  "RBI",
  "BUY",
  "SELL",
  "HOLD",
  "NEWS",
  "VS",
  "CMP",
  "P",
  "PE",
  "ROE",
  "ROCE",
  "NAV",
  "MF",
  "FD",
  "PPF",
  "ELSS",
  "IT",
  "AI",
]);

let cachedSystemPrompt = null;

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item.content === "string")
    .map((item) => {
      const role = String(item.role || "").toLowerCase();
      if (role === "system" || role === "assistant" || role === "user") {
        return { role, content: item.content };
      }
      return { role: "assistant", content: item.content };
    });
}

function normalizeWatchlist(watchlist) {
  if (!Array.isArray(watchlist)) return [];

  return watchlist
    .map((item) => {
      if (typeof item === "string") {
        return {
          ticker: normalizeTicker(item),
          companyName: normalizeTicker(item),
        };
      }

      if (item && typeof item === "object") {
        const ticker = normalizeTicker(item.ticker || item.symbol || item.code);
        if (!ticker) return null;
        return {
          ticker,
          companyName: item.companyName || item.name || item.label || ticker,
          addedAt: item.addedAt || null,
          lastPrice: typeof item.lastPrice === "number" ? item.lastPrice : null,
          lastChange:
            typeof item.lastChange === "number" ? item.lastChange : null,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function normalizeTicker(input) {
  if (!input) return "";
  return String(input)
    .trim()
    .toUpperCase()
    .replace(/\.NS$/i, "")
    .replace(/[^A-Z0-9]/g, "");
}

function detectIntent(message) {
  const msg = String(message || "");
  const lower = msg.toLowerCase();

  const tickerMatches = msg.match(/\b[A-Z]{2,10}\b/g) || [];
  const filteredTickers = tickerMatches
    .map((ticker) => normalizeTicker(ticker))
    .filter((ticker) => ticker && !TICKER_STOPWORDS.has(ticker));

  const uniqueTickerCount = new Set(filteredTickers).size;
  const hasMultiStockBuyQuery =
    uniqueTickerCount >= 2 &&
    /\b(which|better|buy|choose|or|vs|versus|compare)\b/i.test(msg);

  const tickerPattern = /\b[A-Z]{2,10}\b/;
  const stockLookupPattern =
    /(price of|what is\s+[a-z0-9.&-]+\s+at|share price|stock price|cmp|quote)/i;
  const watchlistPattern = /\b(watchlist|add|remove|track)\b/i;
  const sipPattern = /\b(sip|monthly|invest|returns?|crore in \d+ years?)\b/i;
  const comparisonPattern =
    /\b(vs|compare|better|difference between|versus|which should i buy|what should i buy|which one should i buy|should i buy .* or .*)\b/i;
  const newsPattern =
    /\b(news|latest|what happened|update|updates|headline|headlines)\b/i;
  const analysisPattern =
    /\b(analy[sz]e|analysis|fundamental|valuation|outlook|should i buy|should i hold|crash stress test)\b/i;

  if (sipPattern.test(lower)) return INTENTS.SIP_CALC;
  if (hasMultiStockBuyQuery || comparisonPattern.test(lower)) {
    return INTENTS.COMPARISON;
  }
  if (newsPattern.test(lower)) return INTENTS.NEWS;
  if (watchlistPattern.test(lower)) return INTENTS.WATCHLIST;
  if (analysisPattern.test(lower)) return INTENTS.ANALYSIS;
  if (tickerPattern.test(msg) || stockLookupPattern.test(lower)) {
    return INTENTS.STOCK_LOOKUP;
  }

  return INTENTS.GENERAL_FINANCE;
}

function extractTickers(message, watchlist) {
  const text = String(message || "");
  const directMatches = text.match(/\b[A-Z]{2,10}\b/g) || [];

  const tickers = new Set();

  for (const raw of directMatches) {
    const ticker = normalizeTicker(raw);
    if (ticker && !TICKER_STOPWORDS.has(ticker)) {
      tickers.add(ticker);
    }
  }

  const normalizedWatchlist = normalizeWatchlist(watchlist);
  const lower = text.toLowerCase();

  for (const item of normalizedWatchlist) {
    const companyName = String(item.companyName || "").toLowerCase();
    const ticker = normalizeTicker(item.ticker);

    if (!ticker) continue;

    if (
      lower.includes(ticker.toLowerCase()) ||
      (companyName && lower.includes(companyName))
    ) {
      tickers.add(ticker);
    }
  }

  return Array.from(tickers);
}

function detectWatchlistAction(message) {
  const lower = String(message || "").toLowerCase();

  if (/\b(add|track|watch)\b/.test(lower)) {
    return "ADD_WATCHLIST";
  }

  if (/\b(remove|delete|untrack)\b/.test(lower)) {
    return "REMOVE_WATCHLIST";
  }

  return null;
}

function shouldAppendDisclaimer(intent, stockData, news) {
  return (
    intent === INTENTS.STOCK_LOOKUP ||
    intent === INTENTS.ANALYSIS ||
    intent === INTENTS.COMPARISON ||
    intent === INTENTS.NEWS ||
    intent === INTENTS.WATCHLIST ||
    Boolean(stockData) ||
    (Array.isArray(news) && news.length > 0)
  );
}

function appendDisclaimer(text) {
  const base = String(text || "").trim();
  if (!base) return STOCK_DISCLAIMER;
  if (base.includes(STOCK_DISCLAIMER)) return base;
  return `${base}\n\n${STOCK_DISCLAIMER}`;
}

function parseVerdict(text) {
  const content = String(text || "");
  const match = content.match(
    /VERDICT:\s*\[?\s*(STRONG BUY|BUY|HOLD|AVOID|STRONG AVOID)\s*\]?/i,
  );

  return match ? match[1].toUpperCase() : null;
}

function extractReason(text) {
  const content = String(text || "");
  const match = content.match(/REASON:\s*\[?\s*([^\]\n]+)\s*\]?/i);
  return match ? match[1].trim() : null;
}

function extractJsonBlock(text) {
  const cleaned = String(text || "")
    .replace(/```json/gi, "```")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function compactQuoteData(quote) {
  if (!quote) return null;

  return {
    ticker: quote.ticker || null,
    companyName: quote.companyName || null,
    sector: quote.sector || null,
    price: quote.price ?? null,
    change: quote.change ?? null,
    changePercent: quote.changePercent ?? null,
    dayHigh: quote.dayHigh ?? null,
    dayLow: quote.dayLow ?? null,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
    marketCap: quote.marketCap ?? null,
    trailingPE: quote.trailingPE ?? null,
    dividendYield: quote.dividendYield ?? null,
    timestamp: quote.timestamp || null,
    marketState: quote.marketState || null,
  };
}

function compactFundamentalsData(fundamentals) {
  if (!fundamentals) return null;

  return {
    ticker: fundamentals.ticker || null,
    companyName: fundamentals.companyName || null,
    marketCap: fundamentals.marketCap ?? null,
    currentPrice: fundamentals.currentPrice ?? null,
    stockPE: fundamentals.stockPE ?? null,
    trailingPE: fundamentals.trailingPE ?? null,
    roe: fundamentals.roe ?? null,
    roce: fundamentals.roce ?? null,
    debtToEquity: fundamentals.debtToEquity ?? null,
    promoterHolding: fundamentals.promoterHolding ?? null,
    dividendYield: fundamentals.dividendYield ?? null,
    highLow52Week: fundamentals.highLow52Week || null,
    faceValue: fundamentals.faceValue ?? null,
    bookValue: fundamentals.bookValue ?? null,
  };
}

function buildMergedStockData(quote, fundamentals) {
  const merged = {
    ticker: quote?.ticker || fundamentals?.ticker || null,
    companyName:
      quote?.companyName || fundamentals?.companyName || quote?.ticker || null,
    sector: quote?.sector || fundamentals?.sector || null,
    price: quote?.price ?? fundamentals?.currentPrice ?? null,
    currentPrice: quote?.price ?? fundamentals?.currentPrice ?? null,
    change: quote?.change ?? null,
    changePercent: quote?.changePercent ?? null,
    dayHigh: quote?.dayHigh ?? null,
    dayLow: quote?.dayLow ?? null,
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
    marketCap: quote?.marketCap ?? fundamentals?.marketCap ?? null,
    trailingPE: quote?.trailingPE ?? fundamentals?.stockPE ?? null,
    peRatio: quote?.trailingPE ?? fundamentals?.stockPE ?? null,
    roe: fundamentals?.roe ?? null,
    roce: fundamentals?.roce ?? null,
    debtToEquity: fundamentals?.debtToEquity ?? null,
    promoterHolding: fundamentals?.promoterHolding ?? null,
    promoterPct: fundamentals?.promoterHolding ?? null,
    dividendYield: fundamentals?.dividendYield ?? quote?.dividendYield ?? null,
    divYield: fundamentals?.dividendYield ?? quote?.dividendYield ?? null,
    timestamp: quote?.timestamp || null,
    marketState: quote?.marketState || null,
    capSize: deriveCapSize(quote?.marketCap ?? fundamentals?.marketCap ?? null),
    quote: compactQuoteData(quote),
    fundamentals: compactFundamentalsData(fundamentals),
  };

  return merged;
}

function deriveCapSize(marketCap) {
  const value = Number(marketCap);
  if (!Number.isFinite(value) || value <= 0) return null;

  const crore = value / 10000000;
  if (crore >= 20000) return "Large Cap";
  if (crore >= 5000) return "Mid Cap";
  return "Small Cap";
}

function parseAmount(raw) {
  if (!raw) return null;

  const normalized = String(raw)
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .trim();

  const match = normalized.match(/^(\d+(?:\.\d+)?)(k|l|lac|lakh|cr|crore)?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = (match[2] || "").toLowerCase();

  if (!Number.isFinite(value)) return null;

  if (unit === "k") return value * 1000;
  if (unit === "l" || unit === "lac" || unit === "lakh") return value * 100000;
  if (unit === "cr" || unit === "crore") return value * 10000000;

  return value;
}

function parseSipInputs(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();

  const amountMatch =
    lower.match(
      /(?:₹\s*)?(\d+(?:,\d+)*(?:\.\d+)?\s*(?:k|l|lac|lakh|cr|crore)?)/i,
    ) || null;

  const yearMatch =
    lower.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs)/i) || null;

  const monthlyAmount = amountMatch ? parseAmount(amountMatch[1]) : null;
  const years = yearMatch ? Number(yearMatch[1]) : null;

  return {
    monthlyAmount,
    years,
  };
}

function calculateSipFutureValue(monthlyInvestment, annualRate, years) {
  const months = Math.round(years * 12);
  const monthlyRate = annualRate / 12 / 100;

  if (!Number.isFinite(monthlyInvestment) || !Number.isFinite(years)) {
    return null;
  }

  if (monthlyRate === 0) {
    return monthlyInvestment * months;
  }

  return (
    monthlyInvestment *
    (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
      (1 + monthlyRate))
  );
}

function buildSipContext(message) {
  const { monthlyAmount, years } = parseSipInputs(message);

  if (!monthlyAmount || !years) {
    return null;
  }

  const scenarios = [10, 12, 15].map((rate) => {
    const futureValue = calculateSipFutureValue(monthlyAmount, rate, years);
    const totalInvested = monthlyAmount * years * 12;
    return {
      annualCagr: rate,
      totalInvested,
      futureValue: futureValue ? Math.round(futureValue) : null,
      wealthCreated: futureValue
        ? Math.round(futureValue - totalInvested)
        : null,
    };
  });

  return {
    monthlyInvestment: monthlyAmount,
    years,
    scenarios,
  };
}

async function readSystemPrompt() {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }

  const promptPath = path.join(
    __dirname,
    "..",
    "prompts",
    "financial_system.txt",
  );

  try {
    cachedSystemPrompt = await fs.readFile(promptPath, "utf8");
    return cachedSystemPrompt;
  } catch {
    cachedSystemPrompt = `IDENTITY:
You are Synergi's Financial Agent — India's sharpest stock research AI.
Part of the Synergi multi-agent system. Not a SEBI-registered advisor.

PERSONALITY:
- Direct, sharp, like a knowledgeable friend in finance
- Hinglish-friendly — match the user's language register naturally
- Give a clear opinion, don't hedge everything into nothing
- Proactively suggest next steps

CAPABILITIES:
1. Stock lookup — price, metrics, fundamentals from context provided
2. Fundamental analysis — read context data, synthesize into research brief
3. Comparison — side by side analysis of 2-3 stocks
4. SIP simulation — calculate at 10%, 12%, 15% CAGR, show range not single number
5. Sector analysis — IT, Banking, FMCG, Auto, Pharma, Infra context
6. Historical crash stress test — reference 2008 (-60%), 2020 (-38%), 2015 (-25%)
7. IPO intelligence — subscribe/avoid verdict with reasoning
8. Regulatory digest — translate RBI/SEBI news into personal rupee impact

INDIAN FORMATTING:
- Always use ₹ symbol
- Format: ₹1.2 Cr, ₹45 L, ₹2.3 L Cr (not ₹12,00,000)
- Reference NSE/BSE, Nifty 50, Sensex, Nifty Bank
- Mention FII/DII flows, promoter holding, SEBI rules where relevant

VERDICT FORMAT:
When giving stock verdict always output exactly:
VERDICT: [STRONG BUY / BUY / HOLD / AVOID / STRONG AVOID]
REASON: [One clear sentence why]

NEVER:
- Execute or simulate actual trades
- Give hard price targets ("will reach ₹500")
- Recommend F&O to beginners
- Dismiss user's existing holdings without constructive alternative

DISCLAIMER (append to every stock response):
"⚠️ Research only — not SEBI-registered investment advice. Verify independently before investing."`;
    return cachedSystemPrompt;
  }
}

function buildContextBlock({
  intent,
  tickers,
  stockPayload,
  newsPayload,
  sipContext,
  watchlist,
  action,
}) {
  const safeContext = {
    intent,
    tickers,
    action,
    watchlist: Array.isArray(watchlist) ? watchlist.slice(0, 10) : [],
    stockContext: stockPayload,
    newsContext: newsPayload,
    sipContext,
  };

  return [
    "Use the following structured context exactly as ground truth. If a field is null or missing, say it's unavailable instead of inventing it.",
    JSON.stringify(safeContext, null, 2),
    "",
    "Output guidance:",
    "- Be concise but opinionated.",
    "- If it is a stock-related answer, include the exact VERDICT and REASON lines.",
    "- If the request is watchlist add/remove, acknowledge it naturally.",
    "- Never fabricate live prices or headlines beyond this context.",
  ].join("\n");
}

async function callOpenRouter(
  systemPrompt,
  conversationHistory,
  userMessage,
  contextBlock,
  options = {},
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  const safeHistory = normalizeHistory(conversationHistory);

  const body = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextBlock },
      ...safeHistory,
      { role: "user", content: userMessage },
    ],
    max_tokens: MAX_TOKENS,
    stream: Boolean(options.onChunk),
  };

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://synergi.app",
        "X-Title": "Synergi",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return null;
    }

    if (!options.onChunk) {
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || null;
    }

    if (!response.body) {
      return null;
    }

    const reader = response.body.getReader();
    let buffered = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffered += STREAM_DECODER.decode(value, { stream: true });
      const events = buffered.split("\n\n");
      buffered = events.pop() || "";

      for (const event of events) {
        const lines = event.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed || !trimmed.startsWith("data:")) {
            continue;
          }

          const payload = trimmed.slice(5).trim();

          if (payload === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;

            if (typeof delta === "string" && delta.length > 0) {
              fullText += delta;
              await options.onChunk(delta);
            }
          } catch {
            // Ignore malformed SSE frames and continue streaming.
          }
        }
      }
    }

    return fullText || null;
  } catch {
    return null;
  }
}

function buildFallbackText(intent, payload) {
  if (intent === INTENTS.SIP_CALC && payload?.sipContext) {
    const lines = [
      `Here’s your SIP range for ₹${payload.sipContext.monthlyInvestment.toLocaleString("en-IN")} per month over ${payload.sipContext.years} years:`,
    ];

    for (const scenario of payload.sipContext.scenarios) {
      lines.push(
        `- ${scenario.annualCagr}% CAGR → approx ₹${Number(
          scenario.futureValue || 0,
        ).toLocaleString("en-IN")} corpus`,
      );
    }

    return lines.join("\n");
  }

  if (
    (intent === INTENTS.STOCK_LOOKUP || intent === INTENTS.ANALYSIS) &&
    payload?.stockData
  ) {
    const stock = payload.stockData;
    const price =
      typeof stock.currentPrice === "number"
        ? `₹${stock.currentPrice.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })}`
        : "price unavailable";

    const move =
      typeof stock.changePercent === "number"
        ? `${stock.changePercent.toFixed(2)}%`
        : "move unavailable";

    return `${stock.companyName || stock.ticker || "This stock"} is at ${price}. Daily move: ${move}. I could fetch partial market data, but deeper model analysis is unavailable right now.`;
  }

  if (intent === INTENTS.COMPARISON && Array.isArray(payload?.stockData)) {
    const names = payload.stockData
      .map((item) => item?.ticker)
      .filter(Boolean)
      .join(" vs ");

    return `I pulled partial market context for ${names || "the requested stocks"}, but full AI comparison is unavailable right now.`;
  }

  if (intent === INTENTS.NEWS && Array.isArray(payload?.news)) {
    const headlines = payload.news
      .slice(0, 3)
      .map((item) => `- ${item.title}`)
      .join("\n");

    return `Here are the latest headlines I could fetch:\n${headlines}`;
  }

  if (intent === INTENTS.WATCHLIST && Array.isArray(payload?.stockData)) {
    const summary = payload.stockData
      .map((item) => {
        const price =
          typeof item.currentPrice === "number"
            ? `₹${item.currentPrice.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}`
            : "N/A";
        return `- ${item.ticker}: ${price}`;
      })
      .join("\n");

    return `Here’s your watchlist snapshot:\n${summary}`;
  }

  return "I can help with NSE stock lookup, comparison, SIP ranges, watchlists, and finance questions. Send me a ticker like TCS or INFY to go deeper.";
}

async function fetchSingleStockBundle(ticker) {
  const [quote, fundamentals] = await Promise.all([
    getStockData(ticker),
    getStockFundamentals(ticker),
  ]);

  return buildMergedStockData(quote, fundamentals);
}

async function fetchComparisonBundle(tickers) {
  const limited = tickers.slice(0, 3);
  const bundles = await Promise.all(
    limited.map(async (ticker) => fetchSingleStockBundle(ticker)),
  );
  return bundles.filter(Boolean);
}

async function fetchWatchlistBundle(watchlist) {
  const limited = normalizeWatchlist(watchlist).slice(0, 8);

  const bundles = await Promise.all(
    limited.map(async (item) => {
      const stock = await fetchSingleStockBundle(item.ticker);
      if (!stock) {
        return {
          ticker: item.ticker,
          companyName: item.companyName || item.ticker,
          currentPrice: item.lastPrice ?? null,
          change: item.lastChange ?? null,
          changePercent: null,
        };
      }
      return stock;
    }),
  );

  return bundles.filter(Boolean);
}

function normalizeNews(news) {
  if (!Array.isArray(news)) return [];
  return news.slice(0, 3).map((item) => ({
    title: item?.title || "",
    date: item?.date || "",
    url: item?.url || "",
    source: item?.source || "Moneycontrol",
  }));
}

async function buildIntentPayload(intent, tickers, userMessage, watchlist) {
  if (intent === INTENTS.SIP_CALC) {
    const sipContext = buildSipContext(userMessage);
    return {
      stockData: null,
      news: [],
      sipContext,
    };
  }

  if (intent === INTENTS.COMPARISON) {
    const stockData = await fetchComparisonBundle(tickers);
    return {
      stockData,
      news: [],
      sipContext: null,
    };
  }

  if (intent === INTENTS.STOCK_LOOKUP || intent === INTENTS.ANALYSIS) {
    const primaryTicker = tickers[0] || null;
    if (!primaryTicker) {
      return { stockData: null, news: [], sipContext: null };
    }

    const stockData = await fetchSingleStockBundle(primaryTicker);
    const news =
      intent === INTENTS.ANALYSIS
        ? normalizeNews(
            await getStockNews(
              primaryTicker,
              stockData?.companyName || primaryTicker,
            ),
          )
        : [];

    return {
      stockData,
      news,
      sipContext: null,
    };
  }

  if (intent === INTENTS.NEWS) {
    const primaryTicker = tickers[0] || null;
    if (!primaryTicker) {
      return { stockData: null, news: [], sipContext: null };
    }

    const stockData = await fetchSingleStockBundle(primaryTicker);
    const news = normalizeNews(
      await getStockNews(
        primaryTicker,
        stockData?.companyName || primaryTicker,
      ),
    );

    return {
      stockData,
      news,
      sipContext: null,
    };
  }

  if (intent === INTENTS.WATCHLIST) {
    const stockData = await fetchWatchlistBundle(watchlist);
    return {
      stockData,
      news: [],
      sipContext: null,
    };
  }

  return {
    stockData: null,
    news: [],
    sipContext: null,
  };
}

async function handleFinancialQuery(
  userMessage,
  conversationHistory = [],
  watchlist = [],
  options = {},
) {
  const intent = detectIntent(userMessage);
  const tickers = extractTickers(userMessage, watchlist);
  const action = detectWatchlistAction(userMessage);

  const payload = await buildIntentPayload(
    intent,
    tickers,
    userMessage,
    watchlist,
  );

  const systemPrompt = await readSystemPrompt();
  const contextBlock = buildContextBlock({
    intent,
    tickers,
    stockPayload: payload.stockData,
    newsPayload: payload.news,
    sipContext: payload.sipContext,
    watchlist: normalizeWatchlist(watchlist),
    action,
  });

  const llmText = await callOpenRouter(
    systemPrompt,
    conversationHistory,
    userMessage,
    contextBlock,
    options,
  );

  let text = llmText || buildFallbackText(intent, payload);
  let verdict = parseVerdict(text);

  const jsonBlock = extractJsonBlock(text);
  if (jsonBlock && typeof jsonBlock.text === "string") {
    text = jsonBlock.text;
    verdict = jsonBlock.verdict || verdict || null;
  }

  if (!verdict) {
    if (intent === INTENTS.COMPARISON || intent === INTENTS.STOCK_LOOKUP) {
      verdict = "HOLD";
    } else if (intent === INTENTS.ANALYSIS) {
      verdict = "HOLD";
    } else {
      verdict = null;
    }
  }

  const reason = extractReason(text);

  if (reason && !/REASON:/i.test(text) && verdict) {
    text = `${text}\n\nVERDICT: [${verdict}]\nREASON: [${reason}]`;
  }

  if (shouldAppendDisclaimer(intent, payload.stockData, payload.news)) {
    text = appendDisclaimer(text);
  }

  return {
    text,
    stockData: payload.stockData,
    verdict,
    news: payload.news,
    action,
  };
}

module.exports = {
  handleFinancialQuery,
};
