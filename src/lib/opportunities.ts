// Opportunity Detection and Scoring
// Identifies pricing inconsistencies and arbitrage opportunities

import type { Market, Outcome, MarketGroup } from "@prisma/client";

export interface MarketWithOutcomes extends Market {
  outcomes: Outcome[];
  venue: { id: string; name: string };
}

export interface GroupWithMarkets extends MarketGroup {
  markets: MarketWithOutcomes[];
}

export interface OpportunityDetails {
  type: "cross_venue_divergence" | "internal_sanity" | "arbitrage";
  outcomeComparisons?: OutcomeComparison[];
  sanityIssues?: SanityIssue[];
  arbitrageInfo?: ArbitrageInfo;
}

export interface OutcomeComparison {
  outcomeName: string;
  prices: { venueId: string; venueName: string; price: number; marketUrl?: string }[];
  spread: number; // Max - Min
  spreadPercent: number;
}

export interface SanityIssue {
  marketId: string;
  venueId: string;
  venueName: string;
  issue: string;
  outcomeSum: number;
}

export interface ArbitrageInfo {
  type: "guaranteed_profit" | "near_arbitrage";
  buyVenue: string;
  sellVenue: string;
  profit: number;
  profitPercent: number;
}

export interface DetectedOpportunity {
  groupId: string;
  type: "cross_venue_divergence" | "internal_sanity" | "arbitrage";
  score: number;
  spread: number;
  description: string;
  details: OpportunityDetails;
  avgLiquidity: number;
}

// Normalize outcome name for comparison across venues
function normalizeOutcomeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

// Find matching outcomes across markets
function matchOutcomes(markets: MarketWithOutcomes[]): Map<string, OutcomeComparison> {
  const outcomeMap = new Map<string, OutcomeComparison>();

  for (const market of markets) {
    for (const outcome of market.outcomes) {
      const normalizedName = normalizeOutcomeName(outcome.name);

      if (!outcomeMap.has(normalizedName)) {
        outcomeMap.set(normalizedName, {
          outcomeName: outcome.name,
          prices: [],
          spread: 0,
          spreadPercent: 0,
        });
      }

      outcomeMap.get(normalizedName)!.prices.push({
        venueId: market.venueId,
        venueName: market.venue.name,
        price: outcome.price,
        marketUrl: market.url || undefined,
      });
    }
  }

  // Calculate spreads
  for (const comparison of outcomeMap.values()) {
    if (comparison.prices.length > 1) {
      const prices = comparison.prices.map(p => p.price);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      comparison.spread = maxPrice - minPrice;
      comparison.spreadPercent = minPrice > 0 ? (comparison.spread / minPrice) * 100 : 0;
    }
  }

  return outcomeMap;
}

// Detect cross-venue price divergence
function detectCrossVenueDivergence(
  group: GroupWithMarkets
): DetectedOpportunity | null {
  if (group.markets.length < 2) return null;

  const outcomeComparisons = matchOutcomes(group.markets);
  const significantDivergences: OutcomeComparison[] = [];

  let maxSpread = 0;

  for (const comparison of outcomeComparisons.values()) {
    if (comparison.prices.length >= 2 && comparison.spread >= 0.03) {
      // 3% minimum spread
      significantDivergences.push(comparison);
      maxSpread = Math.max(maxSpread, comparison.spread);
    }
  }

  if (significantDivergences.length === 0) return null;

  // Calculate average liquidity
  const totalLiquidity = group.markets.reduce(
    (sum, m) => sum + (m.liquidity || 0),
    0
  );
  const avgLiquidity = totalLiquidity / group.markets.length;

  // Calculate score based on spread, liquidity, and number of venues
  const venueCount = new Set(group.markets.map(m => m.venueId)).size;
  const spreadScore = Math.min(maxSpread * 100, 30); // Up to 30 points for spread
  const liquidityScore = Math.min(Math.log10(avgLiquidity + 1) * 5, 30); // Up to 30 points
  const venueScore = Math.min((venueCount - 1) * 10, 20); // Up to 20 points for multiple venues
  const score = spreadScore + liquidityScore + venueScore;

  // Generate description
  const topDivergence = significantDivergences.sort(
    (a, b) => b.spread - a.spread
  )[0];
  const venues = group.markets.map(m => m.venue.name).join(", ");
  const description = `${topDivergence.outcomeName}: ${(topDivergence.spread * 100).toFixed(1)}% spread across ${venues}`;

  return {
    groupId: group.id,
    type: "cross_venue_divergence",
    score,
    spread: maxSpread,
    description,
    details: {
      type: "cross_venue_divergence",
      outcomeComparisons: significantDivergences,
    },
    avgLiquidity,
  };
}

// Detect internal sanity issues (outcomes not summing to ~1)
function detectInternalSanity(
  group: GroupWithMarkets
): DetectedOpportunity | null {
  const issues: SanityIssue[] = [];
  const tolerance = 0.03; // 3% tolerance

  for (const market of group.markets) {
    const outcomeSum = market.outcomes.reduce((sum, o) => sum + o.price, 0);

    // For binary markets, sum should be ~1
    // For multi-outcome exclusive markets, sum should also be ~1
    if (Math.abs(outcomeSum - 1) > tolerance) {
      const direction = outcomeSum > 1 ? "exceeds" : "below";
      issues.push({
        marketId: market.id,
        venueId: market.venueId,
        venueName: market.venue.name,
        issue: `Outcome prices ${direction} 100%: ${(outcomeSum * 100).toFixed(1)}%`,
        outcomeSum,
      });
    }
  }

  if (issues.length === 0) return null;

  const maxDeviation = Math.max(...issues.map(i => Math.abs(i.outcomeSum - 1)));

  // Calculate score
  const deviationScore = Math.min(maxDeviation * 100, 40);
  const countScore = Math.min(issues.length * 10, 30);
  const score = deviationScore + countScore;

  const description = `${issues.length} market(s) with outcome prices not summing to 100%`;

  return {
    groupId: group.id,
    type: "internal_sanity",
    score,
    spread: maxDeviation,
    description,
    details: {
      type: "internal_sanity",
      sanityIssues: issues,
    },
    avgLiquidity:
      group.markets.reduce((sum, m) => sum + (m.liquidity || 0), 0) /
      group.markets.length,
  };
}

// Detect pure arbitrage opportunities
function detectArbitrage(group: GroupWithMarkets): DetectedOpportunity | null {
  if (group.markets.length < 2) return null;

  const outcomeComparisons = matchOutcomes(group.markets);

  // For binary markets (Yes/No), check if buying Yes on one venue and No on another
  // costs less than 100%
  const yesComparison = outcomeComparisons.get("yes");
  const noComparison = outcomeComparisons.get("no");

  if (!yesComparison || !noComparison) return null;
  if (yesComparison.prices.length < 2 || noComparison.prices.length < 2)
    return null;

  // Find best buy prices for Yes and No across venues
  let bestArbitrage: ArbitrageInfo | null = null;

  for (const yesPrice of yesComparison.prices) {
    for (const noPrice of noComparison.prices) {
      if (yesPrice.venueId === noPrice.venueId) continue;

      const totalCost = yesPrice.price + noPrice.price;
      const profit = 1 - totalCost;
      const profitPercent = (profit / totalCost) * 100;

      if (profit > 0) {
        // Guaranteed profit!
        if (!bestArbitrage || profit > bestArbitrage.profit) {
          bestArbitrage = {
            type: "guaranteed_profit",
            buyVenue: `Buy Yes @ ${yesPrice.venueName}, Buy No @ ${noPrice.venueName}`,
            sellVenue: "",
            profit,
            profitPercent,
          };
        }
      } else if (profit > -0.02) {
        // Near-arbitrage (within 2%)
        if (
          !bestArbitrage ||
          (bestArbitrage.type !== "guaranteed_profit" &&
            profit > bestArbitrage.profit)
        ) {
          bestArbitrage = {
            type: "near_arbitrage",
            buyVenue: `Buy Yes @ ${yesPrice.venueName}, Buy No @ ${noPrice.venueName}`,
            sellVenue: "",
            profit,
            profitPercent,
          };
        }
      }
    }
  }

  if (!bestArbitrage) return null;

  const score =
    bestArbitrage.type === "guaranteed_profit"
      ? 80 + bestArbitrage.profitPercent * 2
      : 40 + Math.max(0, bestArbitrage.profitPercent + 2) * 10;

  const description =
    bestArbitrage.type === "guaranteed_profit"
      ? `Arbitrage: ${bestArbitrage.profitPercent.toFixed(1)}% guaranteed profit`
      : `Near-arbitrage: ${(100 + bestArbitrage.profitPercent).toFixed(1)}% total cost`;

  return {
    groupId: group.id,
    type: "arbitrage",
    score,
    spread: Math.abs(bestArbitrage.profit),
    description,
    details: {
      type: "arbitrage",
      arbitrageInfo: bestArbitrage,
    },
    avgLiquidity:
      group.markets.reduce((sum, m) => sum + (m.liquidity || 0), 0) /
      group.markets.length,
  };
}

// Detect all opportunities for a group of markets
export function detectOpportunities(
  group: GroupWithMarkets
): DetectedOpportunity[] {
  const opportunities: DetectedOpportunity[] = [];

  // Cross-venue divergence
  const divergence = detectCrossVenueDivergence(group);
  if (divergence) {
    opportunities.push(divergence);
  }

  // Internal sanity checks
  const sanity = detectInternalSanity(group);
  if (sanity) {
    opportunities.push(sanity);
  }

  // Arbitrage detection
  const arbitrage = detectArbitrage(group);
  if (arbitrage) {
    opportunities.push(arbitrage);
  }

  return opportunities;
}

// Calculate opportunity freshness decay
export function applyFreshnessDecay(
  score: number,
  lastUpdated: Date
): number {
  const now = new Date();
  const ageMinutes =
    (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

  // Decay factor: 100% at 0 minutes, 50% at 60 minutes, 25% at 120 minutes
  const decayFactor = Math.pow(0.5, ageMinutes / 60);

  return score * decayFactor;
}

// Rank opportunities by score
export function rankOpportunities(
  opportunities: DetectedOpportunity[]
): DetectedOpportunity[] {
  return [...opportunities].sort((a, b) => b.score - a.score);
}
