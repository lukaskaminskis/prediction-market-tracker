import { Suspense } from "react";
import { prisma } from "@/lib/db";
import OpportunitiesTable from "@/components/OpportunitiesTable";
import Filters from "@/components/Filters";
import StatusBar from "@/components/StatusBar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    venue?: string;
    minScore?: string;
    minSpread?: string;
  }>;
}

async function getOpportunities(params: {
  type?: string;
  venue?: string;
  minScore?: string;
  minSpread?: string;
}) {
  const where: any = {
    isActive: true,
  };

  if (params.type) {
    where.type = params.type;
  }

  if (params.minScore) {
    where.score = { gte: parseFloat(params.minScore) };
  }

  if (params.minSpread) {
    where.spread = { gte: parseFloat(params.minSpread) };
  }

  // If venue filter, get groups that have markets from that venue
  if (params.venue) {
    const markets = await prisma.market.findMany({
      where: { venueId: params.venue },
      select: { groupId: true },
    });
    const groupIds = markets
      .map((m) => m.groupId)
      .filter((id): id is string => id !== null);
    where.groupId = { in: groupIds };
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
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
    orderBy: { score: "desc" },
    take: 50,
  });

  return opportunities;
}

async function getVenues() {
  return prisma.venue.findMany();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="h-8 w-12 bg-[var(--muted)] rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--muted)] rounded w-3/4"></div>
              <div className="h-3 bg-[var(--muted)] rounded w-1/2"></div>
            </div>
            <div className="h-6 w-20 bg-[var(--muted)] rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [opportunities, venues] = await Promise.all([
    getOpportunities(params),
    getVenues(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Status bar */}
        <StatusBar />

        {/* Filters */}
        <Suspense fallback={<div className="h-16 bg-[var(--card)] rounded-lg animate-pulse" />}>
          <Filters venues={venues} />
        </Suspense>

        {/* Opportunities table */}
        <Suspense fallback={<LoadingSkeleton />}>
          <OpportunitiesTable opportunities={opportunities as any} />
        </Suspense>

        {/* Info footer */}
        <div className="text-center text-sm text-[var(--muted-foreground)] py-4">
          <p>
            Data refreshes every 5 minutes. Click on any row to see detailed
            price comparisons.
          </p>
          <p className="mt-1">
            Tracking markets from Polymarket, Kalshi, and Manifold via
            apibricks.io
          </p>
        </div>
      </div>
    </div>
  );
}
