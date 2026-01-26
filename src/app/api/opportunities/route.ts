// API endpoint for fetching opportunities

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameters
  const type = searchParams.get("type"); // cross_venue_divergence, internal_sanity, arbitrage
  const minScore = parseFloat(searchParams.get("minScore") || "0");
  const minSpread = parseFloat(searchParams.get("minSpread") || "0");
  const venue = searchParams.get("venue"); // Filter by venue
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // Build where clause
    const where: any = {
      isActive: true,
      score: { gte: minScore },
      spread: { gte: minSpread },
    };

    if (type) {
      where.type = type;
    }

    // If venue filter is provided, we need to filter by groups that have markets in that venue
    let groupIds: string[] | undefined;
    if (venue) {
      const markets = await prisma.market.findMany({
        where: { venueId: venue },
        select: { groupId: true },
      });
      groupIds = markets
        .map((m) => m.groupId)
        .filter((id): id is string => id !== null);
      where.groupId = { in: groupIds };
    }

    // Fetch opportunities with related data
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
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.opportunity.count({ where });

    return NextResponse.json({
      opportunities,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + opportunities.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}
