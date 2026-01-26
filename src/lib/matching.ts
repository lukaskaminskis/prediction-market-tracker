// Market Matching Algorithm
// Identifies the same question across different prediction market venues

import { stringSimilarity } from "string-similarity-js";
import type { Market, Outcome } from "@prisma/client";

export interface MarketWithOutcomes extends Market {
  outcomes: Outcome[];
}

export interface MatchCandidate {
  market1: MarketWithOutcomes;
  market2: MarketWithOutcomes;
  score: number;
  reasons: string[];
}

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract key entities from market title
function extractEntities(title: string): string[] {
  const normalized = normalizeText(title);

  const patterns = {
    years: /\b(20\d{2})\b/g,
    quarters: /\b(q[1-4])\b/gi,
    months: /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi,
    amounts: /\$[\d,]+[kmbt]?|\d+\s*(trillion|billion|million|thousand|k|m|b|t)\b/gi,
    percentages: /\d+(\.\d+)?%/g,
    keyTerms: /\b(bitcoin|btc|ethereum|eth|fed|federal reserve|trump|biden|gop|democrat|republican|spacex|tesla|apple|microsoft|nvidia|google|amazon|ai|openai|chatgpt|newsom|vance|dolphins|bayern|madrid)\b/gi,
  };

  const entities: string[] = [];

  for (const [, pattern] of Object.entries(patterns)) {
    const matches = normalized.match(pattern);
    if (matches) {
      entities.push(...matches.map(m => m.toLowerCase()));
    }
  }

  return [...new Set(entities)];
}

// Calculate match score between two markets
export function calculateMatchScore(
  market1: MarketWithOutcomes,
  market2: MarketWithOutcomes
): MatchCandidate | null {
  // Don't match markets from the same venue
  if (market1.venueId === market2.venueId) return null;

  const reasons: string[] = [];
  let score = 0;

  const title1 = normalizeText(market1.title);
  const title2 = normalizeText(market2.title);

  // 1. Title similarity (must be high)
  const titleSimilarity = stringSimilarity(title1, title2);

  // Require at least 50% similarity to even consider
  if (titleSimilarity < 0.5) return null;

  score += titleSimilarity * 50; // Up to 50 points
  reasons.push(`Title similarity: ${(titleSimilarity * 100).toFixed(0)}%`);

  // 2. Entity overlap (key terms, dates, amounts)
  const entities1 = extractEntities(market1.title);
  const entities2 = extractEntities(market2.title);

  const commonEntities = entities1.filter(e => entities2.includes(e));

  // Must have at least one common entity for a valid match
  if (entities1.length > 0 && entities2.length > 0 && commonEntities.length === 0) {
    return null;
  }

  if (commonEntities.length > 0) {
    score += Math.min(commonEntities.length * 10, 30); // Up to 30 points
    reasons.push(`Common entities: ${commonEntities.join(", ")}`);
  }

  // 3. Specific date/year match bonus
  const years1: string[] = title1.match(/20\d{2}/g) ?? [];
  const years2: string[] = title2.match(/20\d{2}/g) ?? [];
  const commonYears = years1.filter(y => years2.includes(y));
  if (commonYears.length > 0) {
    score += 10;
    reasons.push(`Same year: ${commonYears.join(", ")}`);
  }

  // Minimum threshold - must be confident
  if (score < 55) return null;

  return {
    market1,
    market2,
    score,
    reasons,
  };
}

// Find all potential matches for a list of markets
export function findAllMatches(markets: MarketWithOutcomes[]): MatchCandidate[] {
  const matches: MatchCandidate[] = [];

  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const match = calculateMatchScore(markets[i], markets[j]);
      if (match) {
        matches.push(match);
      }
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

// Group matched markets - strict 1-to-1 matching per venue
export function groupMatches(
  markets: MarketWithOutcomes[],
  matches: MatchCandidate[],
  minScore: number = 55
): Map<string, MarketWithOutcomes[]> {
  const validMatches = matches.filter(m => m.score >= minScore);
  const usedMarkets = new Set<string>();
  const groups = new Map<string, MarketWithOutcomes[]>();

  // Process matches in order of score (highest first)
  for (const match of validMatches) {
    const id1 = match.market1.id;
    const id2 = match.market2.id;

    // Skip if either market is already used
    if (usedMarkets.has(id1) || usedMarkets.has(id2)) {
      continue;
    }

    // Create a new group with exactly these two markets
    const groupId = `${id1}-${id2}`;
    groups.set(groupId, [match.market1, match.market2]);

    // Mark both markets as used
    usedMarkets.add(id1);
    usedMarkets.add(id2);
  }

  return groups;
}

// Generate a canonical title for a group of matched markets
export function generateCanonicalTitle(markets: MarketWithOutcomes[]): string {
  const sorted = [...markets].sort((a, b) => {
    const score1 = (a.volume || 0) + (a.liquidity || 0) * 2;
    const score2 = (b.volume || 0) + (b.liquidity || 0) * 2;
    return score2 - score1;
  });

  return sorted[0].title;
}
