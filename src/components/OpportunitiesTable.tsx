"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  TrendingUp,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Outcome {
  id: string;
  name: string;
  price: number;
  volume?: number;
}

interface Venue {
  id: string;
  name: string;
}

interface Market {
  id: string;
  title: string;
  url?: string;
  volume?: number;
  liquidity?: number;
  outcomes: Outcome[];
  venue: Venue;
}

interface MarketGroup {
  id: string;
  canonicalTitle: string;
  category?: string;
  isVerified: boolean;
  markets: Market[];
}

interface Opportunity {
  id: string;
  type: string;
  score: number;
  spread: number;
  description: string;
  details: string;
  avgLiquidity?: number;
  updatedAt: string;
  group: MarketGroup;
}

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
}

function getTypeIcon(type: string) {
  switch (type) {
    case "cross_venue_divergence":
      return <ArrowUpDown className="h-4 w-4 text-blue-500" />;
    case "arbitrage":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "internal_sanity":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return null;
  }
}

function getTypeBadge(type: string) {
  const styles: Record<string, string> = {
    cross_venue_divergence: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    arbitrage: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    internal_sanity: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  };

  const labels: Record<string, string> = {
    cross_venue_divergence: "Price Divergence",
    arbitrage: "Arbitrage",
    internal_sanity: "Sanity Check",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${styles[type] || "bg-gray-100 text-gray-800"}`}
    >
      {getTypeIcon(type)}
      {labels[type] || type}
    </span>
  );
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-gray-600 dark:text-gray-400";
}

function OpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const details = JSON.parse(opportunity.details);

  return (
    <>
      <tr
        className="border-b border-[var(--border)] hover:bg-[var(--muted)] cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="p-4">
          <button className="text-[var(--muted-foreground)]">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="p-4">
          <span className={`font-bold text-lg ${getScoreColor(opportunity.score)}`}>
            {opportunity.score.toFixed(0)}
          </span>
        </td>
        <td className="p-4">
          <div className="max-w-md">
            <p className="font-medium text-[var(--foreground)] line-clamp-2">
              {opportunity.group.canonicalTitle}
            </p>
            {opportunity.group.category && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {opportunity.group.category}
              </span>
            )}
          </div>
        </td>
        <td className="p-4">{getTypeBadge(opportunity.type)}</td>
        <td className="p-4">
          <span className="font-mono text-sm">
            {(opportunity.spread * 100).toFixed(1)}%
          </span>
        </td>
        <td className="p-4">
          <div className="flex flex-wrap gap-1">
            {opportunity.group.markets.map((market) => (
              <span
                key={market.id}
                className="inline-block px-2 py-0.5 text-xs bg-[var(--secondary)] rounded"
              >
                {market.venue.name}
              </span>
            ))}
          </div>
        </td>
        <td className="p-4 text-sm text-[var(--muted-foreground)]">
          {formatDistanceToNow(new Date(opportunity.updatedAt), {
            addSuffix: true,
          })}
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-[var(--muted)]/50">
          <td colSpan={7} className="p-4">
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                {opportunity.description}
              </p>

              {/* Outcome comparisons */}
              {details.outcomeComparisons && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Price Comparison</h4>
                  {details.outcomeComparisons.map((comp: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-[var(--card)] rounded-lg p-3 border border-[var(--border)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{comp.outcomeName}</span>
                        <span className="text-sm text-[var(--muted-foreground)]">
                          Spread: {(comp.spread * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {comp.prices.map((p: any, pIdx: number) => (
                          <div
                            key={pIdx}
                            className="flex items-center justify-between bg-[var(--muted)] rounded px-2 py-1"
                          >
                            <span className="text-sm">{p.venueName}</span>
                            <span className="font-mono font-medium">
                              {(p.price * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sanity issues */}
              {details.sanityIssues && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Sanity Issues</h4>
                  {details.sanityIssues.map((issue: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3 border border-amber-200 dark:border-amber-800"
                    >
                      <p className="text-sm">
                        <span className="font-medium">{issue.venueName}:</span>{" "}
                        {issue.issue}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Arbitrage info */}
              {details.arbitrageInfo && (
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-sm text-green-800 dark:text-green-200 mb-2">
                    {details.arbitrageInfo.type === "guaranteed_profit"
                      ? "Guaranteed Profit Opportunity"
                      : "Near-Arbitrage Opportunity"}
                  </h4>
                  <p className="text-sm">{details.arbitrageInfo.buyVenue}</p>
                  <p className="font-mono font-medium text-green-700 dark:text-green-300">
                    {details.arbitrageInfo.profitPercent > 0
                      ? `+${details.arbitrageInfo.profitPercent.toFixed(2)}% profit`
                      : `${(100 + details.arbitrageInfo.profitPercent).toFixed(2)}% total cost`}
                  </p>
                </div>
              )}

              {/* Market links */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                {opportunity.group.markets.map((market) => (
                  <a
                    key={market.id}
                    href={market.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--primary)] text-white rounded-md hover:opacity-90 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {market.venue.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
                <Link
                  href={`/opportunity/${opportunity.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-md hover:opacity-90 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Details
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OpportunitiesTable({
  opportunities,
}: OpportunitiesTableProps) {
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--card)] rounded-lg border border-[var(--border)]">
        <TrendingUp className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--foreground)]">
          No opportunities found
        </h3>
        <p className="text-[var(--muted-foreground)] mt-1">
          Try adjusting your filters or wait for the next data refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="p-4 text-left w-10"></th>
              <th className="p-4 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Score
              </th>
              <th className="p-4 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Market
              </th>
              <th className="p-4 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Type
              </th>
              <th className="p-4 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Spread
              </th>
              <th className="p-4 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Venues
              </th>
              <th className="p-4 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity) => (
              <OpportunityRow key={opportunity.id} opportunity={opportunity} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
