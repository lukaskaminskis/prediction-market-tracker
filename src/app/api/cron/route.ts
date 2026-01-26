// Cron endpoint for scheduled data refresh
// Secured with CRON_SECRET environment variable

import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 second timeout for sync

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow requests without secret if not set
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("Starting scheduled sync...");
    const result = await runSync();

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      marketsProcessed: result.marketsProcessed,
      opportunitiesFound: result.opportunitiesFound,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
