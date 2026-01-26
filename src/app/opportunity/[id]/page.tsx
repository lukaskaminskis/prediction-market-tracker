import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "cross_venue_divergence":
      return <ArrowUpDown className="h-6 w-6 text-blue-500" />;
    case "arbitrage":
      return <TrendingUp className="h-6 w-6 text-green-500" />;
    case "internal_sanity":
      return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    default:
      return null;
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cross_venue_divergence: "Cross-Venue Price Divergence",
    arbitrage: "Arbitrage Opportunity",
    internal_sanity: "Internal Sanity Check",
  };
  return labels[type] || type;
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;

  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      group: {
        include: {
          markets: {
            include: {
              outcomes: true,
              venue: true,
            },
          },
        },
      },
    },
  });

  if (!opportunity) {
    notFound();
  }

  const details = JSON.parse(opportunity.details);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to opportunities
      </Link>

      {/* Header */}
      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--muted)] rounded-lg">
            {getTypeIcon(opportunity.type)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--muted-foreground)]">
                {getTypeLabel(opportunity.type)}
              </span>
              {opportunity.group.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Verified Match
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              {opportunity.group.canonicalTitle}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-[var(--muted-foreground)]">Score: </span>
                <span className="font-bold text-lg">{opportunity.score.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Spread: </span>
                <span className="font-mono">{(opportunity.spread * 100).toFixed(2)}%</span>
              </div>
              {opportunity.avgLiquidity && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Avg Liquidity: </span>
                  <span className="font-mono">
                    ${opportunity.avgLiquidity.toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[var(--muted-foreground)]">Updated: </span>
                <span>
                  {formatDistanceToNow(new Date(opportunity.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Description</h2>
        <p className="text-[var(--muted-foreground)]">{opportunity.description}</p>
      </div>

      {/* Price comparison for divergence */}
      {details.outcomeComparisons && details.outcomeComparisons.length > 0 && (
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Price Comparison</h2>
          <div className="space-y-6">
            {details.outcomeComparisons.map((comp: any, idx: number) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-lg">{comp.outcomeName}</h3>
                  <span className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                    {(comp.spread * 100).toFixed(1)}% spread
                  </span>
                </div>

                {/* Visual price bar */}
                <div className="relative h-12 bg-[var(--muted)] rounded-lg mb-3 overflow-hidden">
                  {comp.prices.map((p: any, pIdx: number) => {
                    const colors = [
                      "bg-blue-500",
                      "bg-green-500",
                      "bg-purple-500",
                      "bg-amber-500",
                    ];
                    return (
                      <div
                        key={pIdx}
                        className={`absolute top-0 h-full ${colors[pIdx % colors.length]} opacity-80`}
                        style={{
                          left: `${p.price * 100 - 2}%`,
                          width: "4px",
                        }}
                        title={`${p.venueName}: ${(p.price * 100).toFixed(1)}%`}
                      />
                    );
                  })}
                  {/* Scale markers */}
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-[var(--muted-foreground)]">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Price grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {comp.prices
                    .sort((a: any, b: any) => b.price - a.price)
                    .map((p: any, pIdx: number) => (
                      <div
                        key={pIdx}
                        className={`p-3 rounded-lg border ${
                          pIdx === 0
                            ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950"
                            : pIdx === comp.prices.length - 1
                              ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
                              : "border-[var(--border)] bg-[var(--muted)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{p.venueName}</span>
                          <span className="font-mono text-lg font-bold">
                            {(p.price * 100).toFixed(1)}%
                          </span>
                        </div>
                        {pIdx === 0 && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Highest price
                          </span>
                        )}
                        {pIdx === comp.prices.length - 1 && comp.prices.length > 1 && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            Lowest price
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sanity issues */}
      {details.sanityIssues && details.sanityIssues.length > 0 && (
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sanity Check Issues</h2>
          <div className="space-y-3">
            {details.sanityIssues.map((issue: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{issue.venueName}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{issue.issue}</p>
                    <p className="text-sm font-mono mt-1">
                      Sum: {(issue.outcomeSum * 100).toFixed(1)}% (expected: 100%)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arbitrage info */}
      {details.arbitrageInfo && (
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {details.arbitrageInfo.type === "guaranteed_profit"
              ? "Guaranteed Profit Strategy"
              : "Near-Arbitrage Strategy"}
          </h2>
          <div
            className={`p-4 rounded-lg ${
              details.arbitrageInfo.type === "guaranteed_profit"
                ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                : "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
            }`}
          >
            <p className="font-medium mb-2">{details.arbitrageInfo.buyVenue}</p>
            <p className="text-2xl font-bold font-mono">
              {details.arbitrageInfo.profitPercent > 0 ? (
                <span className="text-green-600 dark:text-green-400">
                  +{details.arbitrageInfo.profitPercent.toFixed(2)}% profit
                </span>
              ) : (
                <span>
                  {(100 + details.arbitrageInfo.profitPercent).toFixed(2)}% total cost
                </span>
              )}
            </p>
            {details.arbitrageInfo.type === "guaranteed_profit" && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                This represents a guaranteed profit if both positions can be filled
                at the listed prices.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Markets */}
      <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-6">
        <h2 className="text-lg font-semibold mb-4">Markets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunity.group.markets.map((market) => (
            <div
              key={market.id}
              className="p-4 bg-[var(--muted)] rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{market.venue.name}</span>
                {market.url && (
                  <a
                    href={market.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-3 line-clamp-2">
                {market.title}
              </p>

              {/* Outcomes */}
              <div className="space-y-2">
                {market.outcomes.map((outcome) => (
                  <div
                    key={outcome.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{outcome.name}</span>
                    <span className="font-mono font-medium">
                      {(outcome.price * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Market stats */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                {market.volume && (
                  <span>Vol: ${market.volume.toLocaleString()}</span>
                )}
                {market.liquidity && (
                  <span>Liq: ${market.liquidity.toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
