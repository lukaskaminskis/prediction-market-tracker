// API endpoint for market groups

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const verified = searchParams.get("verified"); // Filter by verification status
  const search = searchParams.get("search"); // Search by title
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const where: any = {};

    if (verified !== null) {
      where.isVerified = verified === "true";
    }

    if (search) {
      where.canonicalTitle = {
        contains: search,
      };
    }

    const groups = await prisma.marketGroup.findMany({
      where,
      include: {
        markets: {
          include: {
            outcomes: true,
            venue: true,
          },
        },
        opportunities: {
          where: { isActive: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.marketGroup.count({ where });

    return NextResponse.json({
      groups,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + groups.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// Update group (for admin verification)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, isVerified, canonicalTitle } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof isVerified === "boolean") {
      updateData.isVerified = isVerified;
    }
    if (canonicalTitle) {
      updateData.canonicalTitle = canonicalTitle;
    }

    const group = await prisma.marketGroup.update({
      where: { id: groupId },
      data: updateData,
      include: {
        markets: {
          include: {
            outcomes: true,
            venue: true,
          },
        },
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}
