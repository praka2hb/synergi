/**
 * Synergi Financial Agent — stock fetcher
 *
 * Sources:
 * - Yahoo Finance chart API for live quote data
 * - Screener.in HTML for basic fundamentals
 * - Moneycontrol tag pages for recent news
 *
 * Constraints:
 * - No external scraping libraries
 * - Never throw from exported functions
 * - Use in-memory cache with 5 minute TTL
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json, text/html",
  Referer: "https://www.nseindia.com",
};

function getCache(key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    fetchedAt: Date.now(),
  });

  return data;
}

function safeNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .replace(/Cr/gi, "e7")
    .replace(/Lakh/gi, "e5")
    .replace(/Lakhs/gi, "e5")
    .replace(/Crore/gi, "e7")
    .trim();

  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractListItemValue(html, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const listItemMatch = html.match(
    new RegExp(
      `<li[^>]*>[\\s\\S]*?<span[^>]*class="name"[^>]*>[\\s\\S]*?${escapedLabel}[\\s\\S]*?<span[^>]*class="nowrap value"[^>]*>([\\s\\S]*?)<\\/span>[\\s\\S]*?<\\/li>`,
      "i",
    ),
  );

  if (!listItemMatch) {
    return null;
  }

  return stripTags(listItemMatch[1]);
}

function extractListItemNumbers(html, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const listItemMatch = html.match(
    new RegExp(
      `<li[^>]*>[\\s\\S]*?<span[^>]*class="name"[^>]*>[\\s\\S]*?${escapedLabel}[\\s\\S]*?<span[^>]*class="nowrap value"[^>]*>([\\s\\S]*?)<\\/span>[\\s\\S]*?<\\/li>`,
      "i",
    ),
  );

  if (!listItemMatch) {
    return [];
  }

  return Array.from(
    listItemMatch[1].matchAll(
      /<span[^>]*class="number"[^>]*>([\s\S]*?)<\/span>/gi,
    ),
  )
    .map((match) => safeNumber(stripTags(match[1])))
    .filter((value) => value !== null);
}

function normalizeTicker(ticker) {
  if (!ticker) {
    return null;
  }

  return String(ticker)
    .trim()
    .toUpperCase()
    .replace(/\.NS$/i, "")
    .replace(/[^A-Z0-9&-]/g, "");
}

function normalizeCompanySlug(name) {
  if (!name) {
    return null;
  }

  return String(name)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[.'"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function safeFetchText(url) {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

async function safeFetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function extractTitle(html) {
  const match =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match ? stripTags(match[1]) : null;
}

function extractLabelValue(html, label) {
  const listItemValue = extractListItemValue(html, label);
  if (listItemValue) {
    return listItemValue;
  }

  const lowerHtml = html.toLowerCase();
  const lowerLabel = label.toLowerCase();
  const labelIndex = lowerHtml.indexOf(lowerLabel);

  if (labelIndex === -1) {
    return null;
  }

  const slice = html.slice(labelIndex, labelIndex + 1200);

  const tdPairMatch = slice.match(
    new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]{0,80}<\\/td>[\\s\\S]{0,200}?<td[^>]*>([\\s\\S]*?)<\\/td>`,
      "i",
    ),
  );
  if (tdPairMatch) {
    return stripTags(tdPairMatch[1]);
  }

  const numberClassMatch = slice.match(
    /<span[^>]*class="[^"]*number[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  if (numberClassMatch) {
    return stripTags(numberClassMatch[1]);
  }

  const genericMatch = slice.match(
    />([^<>₹%]{1,60}(?:₹?[\d,.]+(?:\s*[A-Za-z%/.-]+)?))</i,
  );
  if (genericMatch) {
    return stripTags(genericMatch[1]);
  }

  return null;
}

function parseHighLow52(value) {
  if (!value) {
    return {
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
    };
  }

  const matches = String(value).match(/[\d,.]+/g) || [];
  const parts = matches.map((part) => safeNumber(part.trim()));

  return {
    fiftyTwoWeekHigh: parts[0] ?? null,
    fiftyTwoWeekLow: parts[1] ?? null,
  };
}

function parseMarketCap(raw) {
  if (!raw) {
    return null;
  }

  const text = String(raw).trim();

  if (/cr/i.test(text)) {
    const n = safeNumber(text.replace(/cr/gi, ""));
    return n === null ? null : n * 10000000;
  }

  if (/lac|lakh|lakhs/i.test(text)) {
    const n = safeNumber(text.replace(/lac|lakh|lakhs/gi, ""));
    return n === null ? null : n * 100000;
  }

  const plain = safeNumber(text);
  if (plain === null) {
    return null;
  }

  if (plain >= 1000) {
    return plain * 10000000;
  }

  return plain;
}

function capSizeFromMarketCap(marketCap) {
  if (!marketCap || !Number.isFinite(marketCap)) {
    return null;
  }

  if (marketCap >= 200000000000) {
    return "Large Cap";
  }

  if (marketCap >= 50000000000) {
    return "Mid Cap";
  }

  return "Small Cap";
}

async function getStockData(ticker) {
  try {
    const normalizedTicker = normalizeTicker(ticker);

    if (!normalizedTicker) {
      return null;
    }

    const cacheKey = `quote:${normalizedTicker}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      normalizedTicker,
    )}.NS?interval=1d&range=1mo&includePrePost=false`;

    const json = await safeFetchJson(url);

    const result = json?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta) {
      return null;
    }

    const price =
      meta.regularMarketPrice ??
      meta.previousClose ??
      meta.chartPreviousClose ??
      null;

    const currentPrice = safeNumber(price);
    const previousClose = safeNumber(
      meta.previousClose ?? meta.chartPreviousClose,
    );
    const computedChange =
      currentPrice !== null && previousClose !== null
        ? currentPrice - previousClose
        : null;
    const computedChangePercent =
      computedChange !== null && previousClose
        ? (computedChange / previousClose) * 100
        : null;
    const regularMarketChange =
      safeNumber(meta.regularMarketChange) ?? computedChange;
    const regularMarketChangePercent =
      safeNumber(meta.regularMarketChangePercent) ?? computedChangePercent;
    const dayHigh = safeNumber(meta.regularMarketDayHigh);
    const dayLow = safeNumber(meta.regularMarketDayLow);
    const marketCap = safeNumber(meta.marketCap);
    const trailingPE = safeNumber(meta.trailingPE);
    const timestamp = meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

    const stock = {
      ticker: normalizedTicker,
      symbol: `${normalizedTicker}.NS`,
      companyName: meta.longName || meta.shortName || normalizedTicker,
      sector: null,
      exchange: meta.exchangeName || "NSE",
      currency: meta.currency || "INR",
      price: currentPrice,
      currentPrice,
      regularMarketPrice: safeNumber(meta.regularMarketPrice),
      regularMarketChange,
      regularMarketChangePercent,
      change: regularMarketChange,
      changePercent: regularMarketChangePercent,
      regularMarketDayHigh: dayHigh,
      regularMarketDayLow: dayLow,
      dayHigh,
      dayLow,
      fiftyTwoWeekHigh: safeNumber(meta.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: safeNumber(meta.fiftyTwoWeekLow),
      marketCap,
      trailingPE,
      peRatio: trailingPE,
      previousClose,
      open: safeNumber(meta.regularMarketOpen),
      volume: safeNumber(meta.regularMarketVolume),
      chartPreviousClose: safeNumber(meta.chartPreviousClose),
      timestamp,
      capSize: capSizeFromMarketCap(marketCap),
      source: "Yahoo Finance",
    };

    return setCache(cacheKey, stock);
  } catch {
    return null;
  }
}

async function getStockFundamentals(ticker) {
  try {
    const normalizedTicker = normalizeTicker(ticker);

    if (!normalizedTicker) {
      return null;
    }

    const cacheKey = `fundamentals:${normalizedTicker}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `https://www.screener.in/company/${encodeURIComponent(
      normalizedTicker,
    )}/`;

    const html = await safeFetchText(url);

    if (!html) {
      return null;
    }

    const companyName = extractTitle(html);
    const roeRaw = extractLabelValue(html, "ROE");
    const roceRaw = extractLabelValue(html, "ROCE");
    const debtRaw =
      extractLabelValue(html, "Debt to equity") ||
      extractLabelValue(html, "Debt to Equity");
    const promoterRaw =
      extractLabelValue(html, "Promoter holding") ||
      extractLabelValue(html, "Promoter Holding");
    const marketCapRaw = extractLabelValue(html, "Market Cap");
    const peRaw =
      extractLabelValue(html, "Stock P/E") || extractLabelValue(html, "P/E");
    const divYieldRaw =
      extractLabelValue(html, "Dividend Yield") ||
      extractLabelValue(html, "Div Yield");
    const highLowRaw =
      extractLabelValue(html, "High / Low") ||
      extractLabelValue(html, "High / low");

    const highLowNumbers = extractListItemNumbers(html, "High / Low");
    const highLow =
      highLowNumbers.length >= 2
        ? {
            fiftyTwoWeekHigh: highLowNumbers[0] ?? null,
            fiftyTwoWeekLow: highLowNumbers[1] ?? null,
          }
        : parseHighLow52(highLowRaw);

    const marketCap = parseMarketCap(marketCapRaw);
    const trailingPE = safeNumber(peRaw);
    const dividendYield = safeNumber(divYieldRaw);
    const currentPriceRaw =
      extractLabelValue(html, "Current Price") ||
      extractLabelValue(html, "Current price");
    const currentPrice = safeNumber(currentPriceRaw);
    const bookValueRaw =
      extractLabelValue(html, "Book Value") ||
      extractLabelValue(html, "Book value");
    const faceValueRaw =
      extractLabelValue(html, "Face Value") ||
      extractLabelValue(html, "Face value");
    const stockPE = trailingPE;
    const promoterHolding = safeNumber(promoterRaw);

    const fundamentals = {
      ticker: normalizedTicker,
      companyName:
        companyName?.replace(/\s+Share Price.*$/i, "").trim() ||
        normalizedTicker,
      currentPrice,
      roe: safeNumber(roeRaw),
      roce: safeNumber(roceRaw),
      debtToEquity: safeNumber(debtRaw),
      promoterHolding,
      promoterPct: promoterHolding,
      marketCap,
      trailingPE,
      stockPE,
      peRatio: trailingPE,
      dividendYield,
      divYield: dividendYield,
      fiftyTwoWeekHigh: highLow.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: highLow.fiftyTwoWeekLow,
      highLow52Week: highLowRaw || null,
      bookValue: safeNumber(bookValueRaw),
      faceValue: safeNumber(faceValueRaw),
      capSize: capSizeFromMarketCap(marketCap),
      raw: {
        currentPrice: currentPriceRaw,
        roe: roeRaw,
        roce: roceRaw,
        debtToEquity: debtRaw,
        promoterHolding: promoterRaw,
        marketCap: marketCapRaw,
        trailingPE: peRaw,
        dividendYield: divYieldRaw,
        highLow: highLowRaw,
        bookValue: bookValueRaw,
        faceValue: faceValueRaw,
      },
      source: "Screener.in",
    };

    return setCache(cacheKey, fundamentals);
  } catch {
    return null;
  }
}

function parseMoneycontrolNews(html) {
  const items = [];
  const seen = new Set();

  const anchorRegex =
    /<a[^>]+href="([^"]*moneycontrol\.com[^"]*|\/news\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = anchorRegex.exec(html)) && items.length < 3) {
    const href = match[1];
    const title = stripTags(match[2]);

    if (!title || title.length < 20) {
      continue;
    }

    const normalizedTitle = title.toLowerCase();
    if (seen.has(normalizedTitle)) {
      continue;
    }

    const surrounding = html.slice(
      Math.max(0, match.index - 300),
      Math.min(html.length, match.index + 600),
    );

    const dateMatch =
      surrounding.match(
        /\b([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?)\b/,
      ) ||
      surrounding.match(
        /\b(\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4}(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM))?)\b/,
      );

    seen.add(normalizedTitle);

    items.push({
      title,
      date: dateMatch ? dateMatch[1] : null,
      source: "Moneycontrol",
      url: href.startsWith("http")
        ? href
        : `https://www.moneycontrol.com${href}`,
    });
  }

  return items.length ? items : null;
}

async function getStockNews(ticker, companyName) {
  try {
    const normalizedTicker = normalizeTicker(ticker);

    if (!normalizedTicker && !companyName) {
      return null;
    }

    const cacheKey = `news:${normalizedTicker || companyName}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const slugSource = companyName || normalizedTicker;
    const slug = normalizeCompanySlug(slugSource);

    if (!slug) {
      return null;
    }

    const url = `https://www.moneycontrol.com/news/tags/${slug}/`;
    const html = await safeFetchText(url);

    if (!html) {
      return null;
    }

    const news = parseMoneycontrolNews(html);
    return setCache(cacheKey, news);
  } catch {
    return null;
  }
}

module.exports = {
  getStockData,
  getStockFundamentals,
  getStockNews,
};
