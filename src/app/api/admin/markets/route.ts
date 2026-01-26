// Admin API for managing market matches

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Get unmatched markets
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const venue = searchParams.get("venue");
  const unmatched = searchParams.get("unmatched") === "true";
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const where: any = {
      status: "active",
    };

    if (venue) {
      where.venueId = venue;
    }

    if (unmatched) {
      where.groupId = null;
    }

    if (search) {
      where.title = {
        contains: search,
      };
    }

    const markets = await prisma.market.findMany({
      where,
      include: {
        outcomes: true,
        venue: true,
        group: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.market.count({ where });

    return NextResponse.json({
      markets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + markets.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

// Manually link/unlink markets to groups
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, marketIds, groupId, newGroupTitle } = body;

    if (!action || !marketIds || !Array.isArray(marketIds)) {
      return NextResponse.json(
        { error: "action and marketIds array are required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "link": {
        // Link markets to an existing group
        if (!groupId) {
          return NextResponse.json(
            { error: "groupId is required for link action" },
            { status: 400 }
          );
        }

        await prisma.market.updateMany({
          where: { id: { in: marketIds } },
          data: { groupId },
        });

        // Mark group as verified since it was manually linked
        await prisma.marketGroup.update({
          where: { id: groupId },
          data: { isVerified: true },
        });

        return NextResponse.json({ success: true, action: "linked" });
      }

      case "unlink": {
        // Remove markets from their groups
        await prisma.market.updateMany({
          where: { id: { in: marketIds } },
          data: { groupId: null },
        });

        return NextResponse.json({ success: true, action: "unlinked" });
      }

      case "createGroup": {
        // Create a new group with the specified markets
        if (!newGroupTitle) {
          return NextResponse.json(
            { error: "newGroupTitle is required for createGroup action" },
            { status: 400 }
          );
        }

        const firstMarket = await prisma.market.findFirst({
          where: { id: { in: marketIds } },
        });

        const group = await prisma.marketGroup.create({
          data: {
            canonicalTitle: newGroupTitle,
            category: firstMarket?.category,
            isVerified: true, // Manually created groups are verified
          },
        });

        await prisma.market.updateMany({
          where: { id: { in: marketIds } },
          data: { groupId: group.id },
        });

        return NextResponse.json({
          success: true,
          action: "created",
          group,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: link, unlink, or createGroup" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing markets:", error);
    return NextResponse.json(
      { error: "Failed to manage markets" },
      { status: 500 }
    );
  }
}
