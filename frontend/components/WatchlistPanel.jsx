"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getWatchlist,
  removeFromWatchlist,
  updatePrices,
} from "@/store/watchlist";

const COLORS = {
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
  border: "#e5e7eb",
  muted: "#6b7280",
  text: "#111827",
  subtext: "#374151",
  bg: "#ffffff",
  softBg: "#f9fafb",
};

const styles = {
  panel: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    background: COLORS.bg,
    padding: 16,
    width: "100%",
    boxSizing: "border-box",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    margin: 0,
  },
  refreshButton: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    background: COLORS.bg,
    color: COLORS.text,
    padding: "8px 12px",
    fontSize: 12,
    cursor: "pointer",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(72px, 92px) minmax(0, 1fr) auto auto auto",
    alignItems: "center",
    gap: 10,
    padding: "12px 10px",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    background: COLORS.softBg,
  },
  ticker: {
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    fontSize: 14,
    color: COLORS.text,
  },
  companyBlock: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  companyName: {
    fontSize: 13,
    color: COLORS.subtext,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  addedAt: {
    fontSize: 11,
    color: COLORS.muted,
  },
  price: {
    fontFamily: "'Courier New', monospace",
    fontSize: 14,
    color: COLORS.text,
    whiteSpace: "nowrap",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 74,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  viewButton: {
    border: `1px solid ${COLORS.info}`,
    borderRadius: 8,
    background: COLORS.bg,
    color: COLORS.info,
    padding: "7px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  removeButton: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    background: COLORS.bg,
    color: COLORS.danger,
    padding: "7px 10px",
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
  },
  emptyState: {
    border: `1px dashed ${COLORS.border}`,
    borderRadius: 10,
    padding: 18,
    textAlign: "center",
    fontSize: 13,
    color: COLORS.muted,
    background: COLORS.softBg,
  },
  footer: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.muted,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  error: {
    fontSize: 11,
    color: COLORS.danger,
  },
};

function formatPrice(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value < 1000 ? 2 : 0,
  })}`;
}

function formatChangePercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getChangeValue(item) {
  if (
    typeof item?.lastChangePercent === "number" &&
    !Number.isNaN(item.lastChangePercent)
  ) {
    return item.lastChangePercent;
  }

  if (typeof item?.lastChange === "number" && !Number.isNaN(item.lastChange)) {
    return item.lastChange;
  }

  return null;
}

function getChangePillStyle(change) {
  if (typeof change !== "number" || Number.isNaN(change)) {
    return {
      ...styles.pill,
      color: COLORS.muted,
      background: "#f3f4f6",
    };
  }

  if (change > 0) {
    return {
      ...styles.pill,
      color: COLORS.success,
      background: "#dcfce7",
    };
  }

  if (change < 0) {
    return {
      ...styles.pill,
      color: COLORS.danger,
      background: "#fee2e2",
    };
  }

  return {
    ...styles.pill,
    color: COLORS.warning,
    background: "#fef3c7",
  };
}

function formatAddedAt(addedAt) {
  if (!addedAt) return "";

  const date = new Date(addedAt);
  if (Number.isNaN(date.getTime())) return "";

  return `Added ${date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;
}

function formatLastUpdated(value) {
  if (!value) return "Not updated yet";

  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WatchlistPanel({ getStockData, onViewStock }) {
  const [items, setItems] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWatchlist = useCallback(() => {
    const list = getWatchlist();
    setItems(Array.isArray(list) ? list : []);
  }, []);

  const refreshPrices = useCallback(async () => {
    if (typeof getStockData !== "function" || isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);
      setError("");
      const updated = await updatePrices(getStockData);
      setItems(Array.isArray(updated) ? updated : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Could not refresh watchlist prices.");
    } finally {
      setIsRefreshing(false);
    }
  }, [getStockData, isRefreshing]);

  const handleRemove = useCallback((ticker) => {
    const updated = removeFromWatchlist(ticker);
    setItems(updated);
  }, []);

  useEffect(() => {
    loadWatchlist();
    setLastUpdated(new Date());

    const handleStorage = () => {
      loadWatchlist();
    };

    const handleWatchlistUpdated = () => {
      loadWatchlist();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("watchlist:updated", handleWatchlistUpdated);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("watchlist:updated", handleWatchlistUpdated);
    };
  }, [loadWatchlist]);

  useEffect(() => {
    if (typeof getStockData === "function" && getWatchlist().length > 0) {
      refreshPrices();
    }
  }, [getStockData, refreshPrices]);

  useEffect(() => {
    if (typeof getStockData !== "function") {
      return undefined;
    }

    const intervalId = window.setInterval(
      () => {
        refreshPrices();
      },
      5 * 60 * 1000,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [getStockData, refreshPrices]);

  const itemCountLabel = useMemo(() => {
    if (items.length === 1) return "1 stock tracked";
    return `${items.length} stocks tracked`;
  }, [items.length]);

  return (
    <div style={styles.panel}>
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <p style={styles.title}>Watchlist</p>
          <p style={styles.subtitle}>{itemCountLabel}</p>
        </div>

        <button
          type="button"
          onClick={refreshPrices}
          disabled={isRefreshing || typeof getStockData !== "function"}
          style={{
            ...styles.refreshButton,
            opacity:
              isRefreshing || typeof getStockData !== "function" ? 0.6 : 1,
            cursor:
              isRefreshing || typeof getStockData !== "function"
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {items.length === 0 ? (
        <div style={styles.emptyState}>
          No stocks tracked yet. Ask me about any NSE stock to add it.
        </div>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.ticker} style={styles.row}>
              <div style={styles.ticker}>{item.ticker || "—"}</div>

              <div style={styles.companyBlock}>
                <div style={styles.companyName}>
                  {item.companyName || item.ticker || "Unknown company"}
                </div>
                <div style={styles.addedAt}>{formatAddedAt(item.addedAt)}</div>
              </div>

              <div style={styles.price}>{formatPrice(item.lastPrice)}</div>

              <div style={getChangePillStyle(getChangeValue(item))}>
                {formatChangePercent(getChangeValue(item))}
              </div>

              <button
                type="button"
                onClick={() => onViewStock?.(item.ticker)}
                style={styles.viewButton}
              >
                View
              </button>

              <button
                type="button"
                onClick={() => handleRemove(item.ticker)}
                aria-label={`Remove ${item.ticker} from watchlist`}
                style={styles.removeButton}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.footer}>
        <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        {error ? <span style={styles.error}>{error}</span> : null}
      </div>
    </div>
  );
}
