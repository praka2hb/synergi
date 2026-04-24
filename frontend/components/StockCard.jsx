"use client";

import React from "react";

const COLORS = {
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
  soft: "#f9fafb",
  white: "#ffffff",
};

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: num >= 100 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
}

function formatNumber(value, suffix = "") {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}${suffix}`;
}

function formatIndianCompact(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";

  if (num >= 1000000000000) {
    return `₹${(num / 1000000000000).toFixed(1)} L Cr`;
  }
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(1)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)} L`;
  }
  return formatCurrency(num);
}

function getCapBadge(marketCap, explicitCapSize) {
  if (explicitCapSize) return explicitCapSize;
  const cap = Number(marketCap);
  if (!Number.isFinite(cap) || cap <= 0) return "—";

  const crore = cap / 10000000;
  if (crore >= 20000) return "Large Cap";
  if (crore >= 5000) return "Mid Cap";
  return "Small Cap";
}

function getRangePosition(price, low, high) {
  const p = Number(price);
  const l = Number(low);
  const h = Number(high);

  if (![p, l, h].every(Number.isFinite)) return 0;
  if (h <= l) return 50;

  const position = ((p - l) / (h - l)) * 100;
  return Math.max(0, Math.min(100, position));
}

function getChangeStyles(change) {
  const num = Number(change);
  if (!Number.isFinite(num) || num === 0) {
    return {
      color: COLORS.info,
      background: "#eff6ff",
      borderColor: "#bfdbfe",
      sign: "",
    };
  }

  const isPositive = num > 0;
  return {
    color: isPositive ? COLORS.success : COLORS.danger,
    background: isPositive ? "#f0fdf4" : "#fef2f2",
    borderColor: isPositive ? "#bbf7d0" : "#fecaca",
    sign: isPositive ? "+" : "",
  };
}

function getVerdictMeta(verdict) {
  const raw = String(
    typeof verdict === "string" ? verdict : verdict?.label || ""
  ).toUpperCase();

  if (raw.includes("BUY")) {
    return {
      label: raw || "BUY",
      color: COLORS.success,
      background: "#f0fdf4",
      borderColor: "#bbf7d0",
    };
  }

  if (raw.includes("HOLD")) {
    return {
      label: raw || "HOLD",
      color: COLORS.warning,
      background: "#fffbeb",
      borderColor: "#fde68a",
    };
  }

  if (raw.includes("AVOID") || raw.includes("SELL")) {
    return {
      label: raw || "AVOID",
      color: COLORS.danger,
      background: "#fef2f2",
      borderColor: "#fecaca",
    };
  }

  return {
    label: raw || "HOLD",
    color: COLORS.info,
    background: "#eff6ff",
    borderColor: "#bfdbfe",
  };
}

function getVerdictReasoning(verdict, stockData) {
  if (typeof verdict === "object" && verdict?.reasoning) return verdict.reasoning;
  if (typeof verdict === "object" && verdict?.reason) return verdict.reason;
  if (stockData?.verdictReason) return stockData.verdictReason;
  return "Use this as a research starting point, not as a final investment decision.";
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Updated just now";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Updated just now";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NewsItem({ item }) {
  return (
    <div style={styles.newsItem}>
      <div style={styles.newsDot} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.newsHeadline}>{item?.title || item?.headline || "Untitled update"}</div>
        <div style={styles.newsMeta}>
          {(item?.source || "Source") + (item?.date ? ` • ${item.date}` : item?.publishedAt ? ` • ${item.publishedAt}` : "")}
        </div>
      </div>
    </div>
  );
}

export default function StockCard({
  stockData,
  verdict,
  news,
  onAddWatchlist,
  onCompare,
  onFullAnalysis,
  isWatched,
}) {
  const data = stockData || {};

  const price = data.currentPrice ?? data.price;
  const change = data.change ?? data.regularMarketChange;
  const changePercent =
    data.changePercent ?? data.regularMarketChangePercent;
  const marketCap = data.marketCap;
  const peRatio = data.peRatio ?? data.trailingPE;
  const roe = data.roe;
  const promoterPct = data.promoterPct ?? data.promoterHolding;
  const debtToEquity = data.debtToEquity;
  const divYield = data.divYield ?? data.dividendYield;
  const low52 = data.fiftyTwoWeekLow;
  const high52 = data.fiftyTwoWeekHigh;
  const rangePosition = getRangePosition(price, low52, high52);
  const changeMeta = getChangeStyles(change);
  const verdictMeta = getVerdictMeta(verdict);
  const verdictReasoning = getVerdictReasoning(verdict, data);
  const capBadge = getCapBadge(marketCap, data.capSize);
  const items = Array.isArray(news) ? news.slice(0, 3) : [];

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.companyName}>
            {data.companyName || data.name || data.ticker || "Unknown company"}
          </div>
          <div style={styles.subHeader}>
            {(data.ticker || "—") + (data.sector ? ` • ${data.sector}` : "")}
          </div>
        </div>

        <div style={styles.capBadge}>{capBadge}</div>
      </div>

      <div style={styles.priceRow}>
        <div style={styles.priceBlock}>
          <div style={styles.priceValue}>{formatCurrency(price)}</div>
          <div
            style={{
              ...styles.changePill,
              color: changeMeta.color,
              background: changeMeta.background,
              borderColor: changeMeta.borderColor,
            }}
          >
            {Number.isFinite(Number(change))
              ? `${changeMeta.sign}${formatNumber(change)} (${formatPercent(changePercent)})`
              : "No move data"}
          </div>
        </div>

        <div style={styles.timestamp}>{formatTimestamp(data.timestamp)}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.rangeHeader}>
          <span style={styles.sectionTitle}>52-week range</span>
          <span style={styles.rangeCurrent}>Current: {formatCurrency(price)}</span>
        </div>

        <div style={styles.rangeLabels}>
          <span>{formatCurrency(low52)}</span>
          <span>{formatCurrency(high52)}</span>
        </div>

        <div style={styles.rangeTrack}>
          <div
            style={{
              ...styles.rangeMarker,
              left: `${rangePosition}%`,
            }}
          />
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Market Cap</div>
          <div style={styles.metricValue}>{formatIndianCompact(marketCap)}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>P/E Ratio</div>
          <div style={styles.metricValue}>{formatNumber(peRatio)}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>ROE</div>
          <div style={styles.metricValue}>{formatNumber(roe, "%")}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Promoter %</div>
          <div style={styles.metricValue}>{formatNumber(promoterPct, "%")}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Debt/Equity</div>
          <div style={styles.metricValue}>{formatNumber(debtToEquity)}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Div Yield</div>
          <div style={styles.metricValue}>{formatNumber(divYield, "%")}</div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>News</div>
        {items.length > 0 ? (
          <div style={styles.newsList}>
            {items.map((item, index) => (
              <NewsItem
                key={item?.url || item?.title || item?.headline || index}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptyText}>No recent headlines available.</div>
        )}
      </div>

      <div style={styles.section}>
        <div
          style={{
            ...styles.verdictBadge,
            color: verdictMeta.color,
            background: verdictMeta.background,
            borderColor: verdictMeta.borderColor,
          }}
        >
          {verdictMeta.label}
        </div>
        <div style={styles.verdictReason}>{verdictReasoning}</div>
      </div>

      <div style={styles.actionsRow}>
        <button
          type="button"
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={() => onCompare?.(data)}
        >
          Compare peers
        </button>

        <button
          type="button"
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={() => onFullAnalysis?.(data)}
        >
          Full analysis
        </button>

        <button
          type="button"
          style={{ ...styles.button, ...styles.infoButton }}
          onClick={() => onFullAnalysis?.(data, { mode: "stress_test" })}
        >
          Crash stress test
        </button>

        <button
          type="button"
          style={{
            ...styles.button,
            ...(isWatched ? styles.watchedButton : styles.watchlistButton),
          }}
          onClick={() => onAddWatchlist?.(data)}
        >
          {isWatched ? "In watchlist" : "Add to watchlist"}
        </button>
      </div>

      <div style={styles.disclaimer}>
        ⚠️ Research only — not SEBI-registered investment advice. Verify independently before investing.
      </div>
    </div>
  );
}

const styles = {
  card: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    background: COLORS.white,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow: "none",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  companyName: {
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.text,
    lineHeight: 1.3,
    wordBreak: "break-word",
  },
  subHeader: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 1.4,
  },
  capBadge: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    color: COLORS.info,
    background: "#eff6ff",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  priceBlock: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  priceValue: {
    fontSize: 30,
    fontWeight: 700,
    color: COLORS.text,
    fontFamily: "'Courier New', monospace",
    lineHeight: 1,
  },
  changePill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: "auto",
    textAlign: "right",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: 700,
  },
  rangeHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  rangeCurrent: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: "'Courier New', monospace",
  },
  rangeLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: "'Courier New', monospace",
  },
  rangeTrack: {
    position: "relative",
    height: 10,
    borderRadius: 999,
    background: "#f3f4f6",
    overflow: "hidden",
    border: `1px solid ${COLORS.border}`,
  },
  rangeMarker: {
    position: "absolute",
    top: -3,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: COLORS.info,
    border: "2px solid #dbeafe",
    transform: "translateX(-50%)",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  metricCard: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 10,
    background: COLORS.soft,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  newsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  newsItem: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  newsDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: COLORS.info,
    marginTop: 6,
    flexShrink: 0,
  },
  newsHeadline: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 1.45,
    wordBreak: "break-word",
  },
  newsMeta: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  verdictBadge: {
    alignSelf: "flex-start",
    border: "1px solid",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  verdictReason: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 1.55,
  },
  actionsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  button: {
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid transparent",
    background: COLORS.white,
  },
  primaryButton: {
    background: "#eff6ff",
    borderColor: "#bfdbfe",
    color: COLORS.info,
  },
  secondaryButton: {
    background: "#f9fafb",
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  infoButton: {
    background: "#eff6ff",
    borderColor: "#bfdbfe",
    color: COLORS.info,
  },
  watchlistButton: {
    background: "#f0fdf4",
    borderColor: "#bbf7d0",
    color: COLORS.success,
  },
  watchedButton: {
    background: "#ecfdf5",
    borderColor: "#86efac",
    color: COLORS.success,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 1.5,
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 12,
  },
};
