const WATCHLIST_KEY = "synergi_watchlist";

function isBrowser() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function normalizeTicker(ticker) {
  return String(ticker || "")
    .trim()
    .toUpperCase()
    .replace(/\.NS$/i, "");
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function sanitizeItem(item) {
  if (!item || typeof item !== "object") return null;

  const ticker = normalizeTicker(item.ticker);
  if (!ticker) return null;

  return {
    ticker,
    companyName: String(item.companyName || ticker).trim() || ticker,
    addedAt: item.addedAt || new Date().toISOString(),
    lastPrice: toNumber(item.lastPrice),
    lastChange: toNumber(item.lastChange),
  };
}

function readRawWatchlist() {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(sanitizeItem).filter(Boolean);
  } catch {
    return [];
  }
}

function writeWatchlist(items) {
  const sanitized = Array.isArray(items)
    ? items.map(sanitizeItem).filter(Boolean)
    : [];

  if (!isBrowser()) {
    return sanitized;
  }

  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(
      new CustomEvent("watchlist:updated", {
        detail: {
          items: sanitized,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  } catch {
    // Ignore storage write failures and still return the sanitized value.
  }

  return sanitized;
}

/**
 * Read the current watchlist from localStorage.
 * Data shape: [{ ticker, companyName, addedAt, lastPrice, lastChange }]
 */
export function getWatchlist() {
  return readRawWatchlist();
}

/**
 * Add or update a stock in the watchlist.
 * Keeps the original addedAt if the stock already exists.
 */
export function addToWatchlist(ticker, companyName, price) {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) {
    return getWatchlist();
  }

  const current = getWatchlist();
  const existingIndex = current.findIndex(
    (item) => item.ticker === normalizedTicker,
  );
  const existing = existingIndex >= 0 ? current[existingIndex] : null;

  const nextItem = sanitizeItem({
    ticker: normalizedTicker,
    companyName: companyName || existing?.companyName || normalizedTicker,
    addedAt: existing?.addedAt || new Date().toISOString(),
    lastPrice: price ?? existing?.lastPrice ?? null,
    lastChange: existing?.lastChange ?? null,
  });

  if (!nextItem) {
    return current;
  }

  const updated =
    existingIndex >= 0
      ? current.map((item, index) =>
          index === existingIndex ? nextItem : item,
        )
      : [nextItem, ...current];

  return writeWatchlist(updated);
}

/**
 * Remove a stock from the watchlist by ticker.
 */
export function removeFromWatchlist(ticker) {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) {
    return getWatchlist();
  }

  const updated = getWatchlist().filter(
    (item) => item.ticker !== normalizedTicker,
  );
  return writeWatchlist(updated);
}

/**
 * Check whether a ticker is already in the watchlist.
 */
export function isInWatchlist(ticker) {
  const normalizedTicker = normalizeTicker(ticker);
  if (!normalizedTicker) return false;

  return getWatchlist().some((item) => item.ticker === normalizedTicker);
}

/**
 * Refresh prices for all watched stocks using the provided getStockData function.
 *
 * Expected getStockData signature:
 *   async function getStockData(ticker) => {
 *     price | currentPrice | regularMarketPrice,
 *     change | lastChange | regularMarketChange
 *   }
 */
export async function updatePrices(getStockData) {
  const current = getWatchlist();

  if (!Array.isArray(current) || current.length === 0) {
    return [];
  }

  if (typeof getStockData !== "function") {
    return current;
  }

  const results = await Promise.all(
    current.map(async (item) => {
      try {
        const fresh = await getStockData(item.ticker);

        const nextPrice = toNumber(
          fresh?.price ??
            fresh?.currentPrice ??
            fresh?.regularMarketPrice ??
            item.lastPrice,
        );

        const nextChange = toNumber(
          fresh?.changePercent ??
            fresh?.regularMarketChangePercent ??
            fresh?.change ??
            fresh?.lastChange ??
            fresh?.regularMarketChange ??
            item.lastChange,
        );

        return {
          ...item,
          lastPrice: nextPrice,
          lastChange: nextChange,
        };
      } catch {
        return item;
      }
    }),
  );

  return writeWatchlist(results);
}

export { WATCHLIST_KEY };
